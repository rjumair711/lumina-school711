'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import {
  AssignmentStatus,
  AttendanceStatus,
  Prisma,
  Role,
} from '@prisma/client'
import { format } from 'date-fns'
import { syncOverdueFees } from '@/lib/fees'
import { round1 as r1, summarize } from '@/lib/grades'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type ReportFilters = {
  from: string // yyyy-MM-dd
  to: string // yyyy-MM-dd
  classId?: string | null
  // null = daily (whole-day) attendance, otherwise subject-wise attendance
  subjectId?: string | null
}

export type AttendanceCounts = {
  present: number
  absent: number
  late: number
  excused: number
  total: number
  rate: number | null
}

export type Insight = {
  tone: 'good' | 'warning' | 'danger' | 'info'
  title: string
  detail: string
}

export type ReportResult =
  | { ok: true; data: ReportData }
  | { ok: false; error: string; unauthorized?: boolean }

export type ReportData = Awaited<ReturnType<typeof buildReport>>

// ------------------------------------------------------------------
// Constants & helpers
// ------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000
const MAX_RANGE_DAYS = 731
const DAILY_BUCKET_LIMIT = 62
// Students below this attendance rate (with enough records) are flagged.
const AT_RISK_THRESHOLD = 75
const AT_RISK_MIN_RECORDS = 3
const PAYMENT_EXPORT_LIMIT = 500

class ReportAccessError extends Error {}
class ReportInputError extends Error {}

async function requireSchoolAdmin(): Promise<string> {
  const session = await auth()
  const email = session?.user?.email

  if (!email) throw new ReportAccessError('Please sign in again.')

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, schoolId: true },
  })

  if (!user?.schoolId || user.role !== Role.ADMIN) {
    throw new ReportAccessError('Administrator access required.')
  }

  return user.schoolId
}

// Parse yyyy-MM-dd as a server-local calendar day, matching how
// attendance records are stored by app/actions/attendance.ts.
function parseLocalDate(value: string, endOfDay: boolean): Date | null {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null

  const [y, m, d] = value.split('-').map(Number)
  const date = endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0)

  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null
  }

  return date
}

const round1 = (n: number) => Math.round(n * 10) / 10
const money = (n: number) => Math.round(n * 100) / 100

function emptyCounts(): AttendanceCounts {
  return { present: 0, absent: 0, late: 0, excused: 0, total: 0, rate: null }
}

function addStatus(c: AttendanceCounts, status: AttendanceStatus, n: number) {
  if (status === AttendanceStatus.PRESENT) c.present += n
  else if (status === AttendanceStatus.ABSENT) c.absent += n
  else if (status === AttendanceStatus.LATE) c.late += n
  else if (status === AttendanceStatus.EXCUSED) c.excused += n
  c.total += n
}

// Attendance rate = (present + late) / all marked records.
function finalize(c: AttendanceCounts): AttendanceCounts {
  c.rate = c.total ? round1(((c.present + c.late) / c.total) * 100) : null
  return c
}

type Granularity = 'day' | 'month'

function bucketKey(date: Date, g: Granularity) {
  return format(date, g === 'day' ? 'yyyy-MM-dd' : 'yyyy-MM')
}

function buildBuckets(from: Date, to: Date, g: Granularity) {
  const buckets: { key: string; label: string }[] = []

  if (g === 'day') {
    const d = new Date(from)
    while (d <= to) {
      buckets.push({ key: bucketKey(d, g), label: format(d, 'dd MMM') })
      d.setDate(d.getDate() + 1)
    }
  } else {
    let d = new Date(from.getFullYear(), from.getMonth(), 1)
    while (d <= to) {
      buckets.push({ key: bucketKey(d, g), label: format(d, "MMM ''yy") })
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    }
  }

  return buckets
}

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

// ------------------------------------------------------------------
// Public action
// ------------------------------------------------------------------

export async function getReportsData(
  filters: ReportFilters
): Promise<ReportResult> {
  try {
    const schoolId = await requireSchoolAdmin()

    const fromDate = parseLocalDate(filters?.from, false)
    const toDate = parseLocalDate(filters?.to, true)

    if (!fromDate || !toDate || fromDate > toDate) {
      return { ok: false, error: 'Choose a valid date range.' }
    }

    if ((toDate.getTime() - fromDate.getTime()) / DAY_MS > MAX_RANGE_DAYS) {
      return { ok: false, error: 'Date range can be at most 2 years.' }
    }

    await syncOverdueFees(schoolId)

    const data = await buildReport(schoolId, {
      from: filters.from,
      to: filters.to,
      fromDate,
      toDate,
      classId: filters.classId || null,
      subjectId: filters.subjectId || null,
    })

    return { ok: true, data }
  } catch (error) {
    if (error instanceof ReportAccessError) {
      return { ok: false, error: error.message, unauthorized: true }
    }

    if (error instanceof ReportInputError) {
      return { ok: false, error: error.message }
    }

    console.error('[Reports]', error)
    return { ok: false, error: 'Unable to load reports. Please try again.' }
  }
}

// ------------------------------------------------------------------
// Report builder
// ------------------------------------------------------------------

async function buildReport(
  schoolId: string,
  f: {
    from: string
    to: string
    fromDate: Date
    toDate: Date
    classId: string | null
    subjectId: string | null
  }
) {
  const [classOptions, subjectOptions] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
      select: { id: true, name: true, section: true },
    }),
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    }),
  ])

  // Never trust ids from the client: they must belong to this school.
  if (f.classId && !classOptions.some((c) => c.id === f.classId)) {
    throw new ReportInputError('Class not found in your school.')
  }
  if (f.subjectId && !subjectOptions.some((s) => s.id === f.subjectId)) {
    throw new ReportInputError('Subject not found in your school.')
  }

  const { fromDate, toDate, classId, subjectId } = f
  const now = new Date()
  const range = { gte: fromDate, lte: toDate }
  const classScope = classId ? { classId } : {}

  const attendanceWhere: Prisma.AttendanceWhereInput = {
    class: { schoolId },
    date: range,
    subjectId: subjectId ?? null,
    ...classScope,
  }

  const studentScope: Prisma.StudentWhereInput = { schoolId, ...classScope }

  const [
    classes,
    studentCount,
    teacherCount,
    attendanceByClass,
    attendanceByDate,
    attendanceByStudent,
    staffAttendance,
    fees,
    payments,
    homeworks,
    tests,
    exams,
  ] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId, ...(classId ? { id: classId } : {}) },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
      select: {
        id: true,
        name: true,
        section: true,
        capacity: true,
        classTeacher: { select: { user: { select: { name: true } } } },
        _count: { select: { students: true } },
      },
    }),

    prisma.student.count({ where: studentScope }),

    prisma.teacher.count({
      where: {
        schoolId,
        ...(classId
          ? { subjectAssignments: { some: { classId } } }
          : {}),
      },
    }),

    prisma.attendance.groupBy({
      by: ['classId', 'status'],
      where: attendanceWhere,
      _count: { _all: true },
    }),

    prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: attendanceWhere,
      _count: { _all: true },
    }),

    prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      where: attendanceWhere,
      _count: { _all: true },
    }),

    prisma.teacherAttendance.groupBy({
      by: ['status'],
      where: { schoolId, date: range },
      _count: { _all: true },
    }),

    // All fees (not just the period): needed for "outstanding as of today".
    prisma.fee.findMany({
      where: { schoolId, student: studentScope },
      select: {
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
        student: {
          select: {
            id: true,
            studentId: true,
            classId: true,
            parentName: true,
            parentPhone: true,
            user: { select: { name: true } },
          },
        },
      },
    }),

    prisma.feePayment.findMany({
      where: {
        paidAt: range,
        fee: { schoolId, student: studentScope },
      },
      orderBy: { paidAt: 'desc' },
      select: {
        id: true,
        receiptNo: true,
        amount: true,
        paymentMode: true,
        paidAt: true,
        fee: {
          select: {
            title: true,
            student: {
              select: {
                studentId: true,
                classId: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    }),

    prisma.homework.findMany({
      where: {
        schoolId,
        ...classScope,
        ...(subjectId ? { subjectId } : {}),
        dueDate: range,
      },
      select: {
        status: true,
        dueDate: true,
        subject: { select: { name: true } },
      },
    }),

    prisma.test.findMany({
      where: {
        schoolId,
        ...classScope,
        ...(subjectId ? { subjectId } : {}),
        date: range,
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        title: true,
        totalMarks: true,
        passingMarks: true,
        duration: true,
        date: true,
        status: true,
        subject: { select: { name: true } },
        class: { select: { name: true, section: true } },
        results: { select: { marksObtained: true, isAbsent: true } },
      },
    }),

    prisma.exam.findMany({
      where: {
        schoolId,
        ...classScope,
        startDate: { lte: toDate },
        endDate: { gte: fromDate },
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        title: true,
        examType: true,
        startDate: true,
        endDate: true,
        status: true,
        class: { select: { name: true, section: true } },
        papers: {
          where: subjectId ? { subjectId } : {},
          select: {
            totalMarks: true,
            passingMarks: true,
            subject: { select: { name: true } },
            results: { select: { marksObtained: true, isAbsent: true } },
          },
        },
      },
    }),
  ])

  const classLabel = new Map(
    classOptions.map((c) => [c.id, `${c.name}-${c.section}`])
  )

  // ---------------- Attendance ----------------

  const granularity: Granularity =
    (toDate.getTime() - fromDate.getTime()) / DAY_MS <= DAILY_BUCKET_LIMIT
      ? 'day'
      : 'month'

  const buckets = buildBuckets(fromDate, toDate, granularity)

  const totals = emptyCounts()
  const perClass = new Map<string, AttendanceCounts>()
  for (const row of attendanceByClass) {
    const c = perClass.get(row.classId) ?? emptyCounts()
    addStatus(c, row.status, row._count._all)
    addStatus(totals, row.status, row._count._all)
    perClass.set(row.classId, c)
  }
  finalize(totals)

  const perBucket = new Map<string, AttendanceCounts>()
  for (const row of attendanceByDate) {
    const key = bucketKey(row.date, granularity)
    const c = perBucket.get(key) ?? emptyCounts()
    addStatus(c, row.status, row._count._all)
    perBucket.set(key, c)
  }

  const attendanceTrend = buckets.map((b) => {
    const c = perBucket.get(b.key)
    const done = c ? finalize(c) : null
    return {
      label: b.label,
      rate: done?.rate ?? null,
      present: done ? done.present + done.late : 0,
      absent: done?.absent ?? 0,
      total: done?.total ?? 0,
    }
  })

  const perStudent = new Map<string, AttendanceCounts>()
  for (const row of attendanceByStudent) {
    const c = perStudent.get(row.studentId) ?? emptyCounts()
    addStatus(c, row.status, row._count._all)
    perStudent.set(row.studentId, c)
  }

  const atRiskCandidates = [...perStudent.entries()]
    .map(([id, c]) => ({ id, counts: finalize(c) }))
    .filter(
      (s) =>
        s.counts.total >= AT_RISK_MIN_RECORDS &&
        (s.counts.rate ?? 100) < AT_RISK_THRESHOLD
    )
    .sort((a, b) => (a.counts.rate ?? 0) - (b.counts.rate ?? 0))

  const atRiskStudents = atRiskCandidates.length
    ? await prisma.student.findMany({
        where: {
          schoolId,
          id: { in: atRiskCandidates.slice(0, 25).map((s) => s.id) },
        },
        select: {
          id: true,
          studentId: true,
          rollNo: true,
          classId: true,
          parentPhone: true,
          user: { select: { name: true } },
        },
      })
    : []

  const studentInfo = new Map(atRiskStudents.map((s) => [s.id, s]))

  const atRisk = atRiskCandidates
    .slice(0, 25)
    .filter((s) => studentInfo.has(s.id))
    .map((s) => {
      const info = studentInfo.get(s.id)!
      return {
        id: s.id,
        name: info.user?.name || 'Unknown',
        studentCode: info.studentId,
        rollNo: info.rollNo || '-',
        className: classLabel.get(info.classId) ?? '-',
        parentPhone: info.parentPhone || '',
        rate: s.counts.rate ?? 0,
        absent: s.counts.absent,
        total: s.counts.total,
      }
    })

  const staff = emptyCounts()
  for (const row of staffAttendance) {
    addStatus(staff, row.status, row._count._all)
  }
  finalize(staff)

  // ---------------- Finance ----------------

  type ClassMoney = {
    due: number
    collected: number
    outstanding: number
    overdue: number
  }
  const classMoney = new Map<string, ClassMoney>()
  const getMoney = (id: string) => {
    let m = classMoney.get(id)
    if (!m) {
      m = { due: 0, collected: 0, outstanding: 0, overdue: 0 }
      classMoney.set(id, m)
    }
    return m
  }

  let dueInPeriod = 0
  let paidOnDueInPeriod = 0
  let outstanding = 0
  let overdue = 0
  let billedAllTime = 0
  let paidAllTime = 0

  const defaulterMap = new Map<
    string,
    {
      id: string
      name: string
      studentCode: string
      className: string
      parentName: string
      parentPhone: string
      overdue: number
      fees: number
      oldestDue: Date
    }
  >()

  const dueByBucket = new Map<string, number>()

  for (const fee of fees) {
    const total = fee.totalAmount
    const paid = Math.min(fee.paidAmount, total)
    const balance = Math.max(total - fee.paidAmount, 0)
    const m = getMoney(fee.student.classId)

    billedAllTime += total
    paidAllTime += paid
    outstanding += balance
    m.outstanding += balance

    if (fee.dueDate >= fromDate && fee.dueDate <= toDate) {
      dueInPeriod += total
      paidOnDueInPeriod += paid
      m.due += total
      const key = bucketKey(fee.dueDate, granularity)
      dueByBucket.set(key, (dueByBucket.get(key) ?? 0) + total)
    }

    if (fee.dueDate < now && balance > 0) {
      overdue += balance
      m.overdue += balance

      const s = fee.student
      const d = defaulterMap.get(s.id) ?? {
        id: s.id,
        name: s.user?.name || 'Unknown',
        studentCode: s.studentId,
        className: classLabel.get(s.classId) ?? '-',
        parentName: s.parentName || '',
        parentPhone: s.parentPhone || '',
        overdue: 0,
        fees: 0,
        oldestDue: fee.dueDate,
      }
      d.overdue += balance
      d.fees += 1
      if (fee.dueDate < d.oldestDue) d.oldestDue = fee.dueDate
      defaulterMap.set(s.id, d)
    }
  }

  let collected = 0
  const collectedByBucket = new Map<string, number>()
  const modeMap = new Map<string, { amount: number; count: number }>()

  for (const p of payments) {
    collected += p.amount
    getMoney(p.fee.student.classId).collected += p.amount

    const key = bucketKey(p.paidAt, granularity)
    collectedByBucket.set(key, (collectedByBucket.get(key) ?? 0) + p.amount)

    const mode = p.paymentMode?.trim() || 'Other'
    const entry = modeMap.get(mode) ?? { amount: 0, count: 0 }
    entry.amount += p.amount
    entry.count += 1
    modeMap.set(mode, entry)
  }

  const financeTrend = buckets.map((b) => ({
    label: b.label,
    collected: money(collectedByBucket.get(b.key) ?? 0),
    due: money(dueByBucket.get(b.key) ?? 0),
  }))

  const defaulters = [...defaulterMap.values()]
    .sort((a, b) => b.overdue - a.overdue)
    .map((d) => ({
      ...d,
      overdue: money(d.overdue),
      oldestDue: format(d.oldestDue, 'dd MMM yyyy'),
      daysOverdue: Math.max(
        Math.floor((now.getTime() - d.oldestDue.getTime()) / DAY_MS),
        0
      ),
    }))

  const collectionRate = dueInPeriod
    ? round1((paidOnDueInPeriod / dueInPeriod) * 100)
    : null

  // ---------------- Classes ----------------

  const classRows = classes.map((c) => {
    const att = perClass.get(c.id)
    const counts = att ? att : emptyCounts()
    const m = classMoney.get(c.id) ?? {
      due: 0,
      collected: 0,
      outstanding: 0,
      overdue: 0,
    }

    return {
      id: c.id,
      name: `${c.name}-${c.section}`,
      classTeacher: c.classTeacher?.user?.name || 'Not assigned',
      capacity: c.capacity,
      students: c._count.students,
      occupancy: c.capacity
        ? round1((c._count.students / c.capacity) * 100)
        : null,
      attendance: counts,
      due: money(m.due),
      collected: money(m.collected),
      outstanding: money(m.outstanding),
      overdue: money(m.overdue),
    }
  })

  // ---------------- Academics ----------------

  const homeworkByStatus: Record<AssignmentStatus, number> = {
    ACTIVE: 0,
    OVERDUE: 0,
    DRAFT: 0,
    COMPLETED: 0,
  }
  let homeworkPastDue = 0
  const homeworkBySubject = new Map<string, number>()

  for (const h of homeworks) {
    homeworkByStatus[h.status] += 1
    if (
      h.status === AssignmentStatus.OVERDUE ||
      (h.status === AssignmentStatus.ACTIVE && h.dueDate < now)
    ) {
      homeworkPastDue += 1
    }
    homeworkBySubject.set(
      h.subject.name,
      (homeworkBySubject.get(h.subject.name) ?? 0) + 1
    )
  }

  // ---------------- Performance (marks) ----------------

  type Perf = { scoredPct: number; appeared: number; passed: number }
  const subjectPerf = new Map<string, Perf>()
  const overallPerf: Perf = { scoredPct: 0, appeared: 0, passed: 0 }

  const addPerf = (
    subject: string,
    rows: { marksObtained: number | null; isAbsent: boolean }[],
    total: number,
    passing: number | null
  ) => {
    const sum = summarize(rows, total, passing)
    if (!sum.appeared || sum.averagePercent === null) return sum
    for (const target of [overallPerf, subjectPerf.get(subject) ?? { scoredPct: 0, appeared: 0, passed: 0 }]) {
      target.scoredPct += sum.averagePercent * sum.appeared
      target.appeared += sum.appeared
      target.passed += sum.passed
      if (target !== overallPerf) subjectPerf.set(subject, target)
    }
    return sum
  }

  const testSummaries = tests.map((t) => addPerf(t.subject.name, t.results, t.totalMarks, t.passingMarks))
  const examSummaries = exams.map((e) => {
    let pct = 0
    let appeared = 0
    let entered = 0
    for (const p of e.papers) {
      const sum = addPerf(p.subject.name, p.results, p.totalMarks, p.passingMarks)
      entered += sum.entered
      if (sum.averagePercent !== null) {
        pct += sum.averagePercent * sum.appeared
        appeared += sum.appeared
      }
    }
    return { averagePercent: appeared ? r1(pct / appeared) : null, entered, papers: e.papers.length }
  })

  const performance = {
    marksEntered: overallPerf.appeared,
    averagePercent: overallPerf.appeared ? r1(overallPerf.scoredPct / overallPerf.appeared) : null,
    passRate: overallPerf.appeared ? r1((overallPerf.passed / overallPerf.appeared) * 100) : null,
    bySubject: [...subjectPerf.entries()]
      .map(([subject, p]) => ({
        subject,
        averagePercent: r1(p.scoredPct / p.appeared),
        passRate: r1((p.passed / p.appeared) * 100),
        appeared: p.appeared,
      }))
      .sort((a, b) => a.averagePercent - b.averagePercent),
  }

  // ---------------- Insights ----------------

  const insights: Insight[] = []

  if (totals.total === 0) {
    insights.push({
      tone: 'info',
      title: 'No attendance marked in this period',
      detail: subjectId
        ? 'No subject-wise attendance was recorded for the selected subject.'
        : 'Mark daily attendance from the Attendance page to see trends here.',
    })
  } else {
    const ranked = classRows
      .filter((c) => c.attendance.rate !== null)
      .sort((a, b) => (a.attendance.rate ?? 0) - (b.attendance.rate ?? 0))

    if (ranked.length > 1) {
      const low = ranked[0]
      insights.push({
        tone: (low.attendance.rate ?? 0) < AT_RISK_THRESHOLD ? 'danger' : 'warning',
        title: `Class ${low.name} has the lowest attendance`,
        detail: `${low.attendance.rate}% vs. school average of ${totals.rate}%.`,
      })
    } else if ((totals.rate ?? 0) >= 90) {
      insights.push({
        tone: 'good',
        title: 'Attendance is healthy',
        detail: `Average attendance is ${totals.rate}% for this period.`,
      })
    }
  }

  if (atRiskCandidates.length) {
    insights.push({
      tone: 'danger',
      title: `${atRiskCandidates.length} student${atRiskCandidates.length === 1 ? '' : 's'} below ${AT_RISK_THRESHOLD}% attendance`,
      detail: 'Consider contacting their parents. See the Attendance tab.',
    })
  }

  if (defaulters.length) {
    insights.push({
      tone: 'warning',
      title: `${formatINR(overdue)} in overdue fees`,
      detail: `${defaulters.length} student${defaulters.length === 1 ? ' has' : 's have'} unpaid fees past their due date.`,
    })
  } else if (fees.length) {
    insights.push({
      tone: 'good',
      title: 'No overdue fees',
      detail: 'Every fee that is past its due date has been paid.',
    })
  }

  if (homeworkPastDue) {
    insights.push({
      tone: 'warning',
      title: `${homeworkPastDue} homework assignment${homeworkPastDue === 1 ? ' is' : 's are'} past due`,
      detail: 'Still marked Active/Overdue. Review them on the Homework page.',
    })
  }

  const weakest = performance.bySubject[0]
  if (weakest && performance.bySubject.length > 1 && weakest.averagePercent < 50) {
    insights.push({
      tone: 'warning',
      title: `${weakest.subject} has the lowest scores`,
      detail: `Average ${weakest.averagePercent}% with a ${weakest.passRate}% pass rate in this period.`,
    })
  }

  const fullClasses = classRows.filter((c) => c.students > c.capacity)
  if (fullClasses.length) {
    insights.push({
      tone: 'warning',
      title: `${fullClasses.length} class${fullClasses.length === 1 ? ' is' : 'es are'} over capacity`,
      detail: fullClasses.map((c) => c.name).join(', '),
    })
  }

  // ---------------- Result ----------------

  return {
    generatedAt: now.toISOString(),
    generatedLabel: format(now, 'hh:mm:ss a'),

    range: {
      from: f.from,
      to: f.to,
      label: `${format(fromDate, 'dd MMM yyyy')} – ${format(toDate, 'dd MMM yyyy')}`,
      granularity,
    },

    filters: { classId, subjectId },

    options: {
      classes: classOptions.map((c) => ({
        id: c.id,
        name: `${c.name}-${c.section}`,
      })),
      subjects: subjectOptions,
    },

    overview: {
      students: studentCount,
      teachers: teacherCount,
      classes: classes.length,
      attendanceRate: totals.rate,
      collected: money(collected),
      outstanding: money(outstanding),
      overdue: money(overdue),
      collectionRate,
      lifetimeCollectionRate: billedAllTime
        ? round1((paidAllTime / billedAllTime) * 100)
        : null,
    },

    insights,

    classRows,

    attendance: {
      totals,
      staff,
      trend: attendanceTrend,
      atRisk,
      atRiskCount: atRiskCandidates.length,
      threshold: AT_RISK_THRESHOLD,
    },

    finance: {
      dueInPeriod: money(dueInPeriod),
      collected: money(collected),
      outstanding: money(outstanding),
      overdue: money(overdue),
      collectionRate,
      trend: financeTrend,
      paymentModes: [...modeMap.entries()]
        .map(([mode, v]) => ({ mode, amount: money(v.amount), count: v.count }))
        .sort((a, b) => b.amount - a.amount),
      defaulters: defaulters.slice(0, 50),
      defaulterCount: defaulters.length,
      paymentCount: payments.length,
      payments: payments.slice(0, PAYMENT_EXPORT_LIMIT).map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        amount: money(p.amount),
        mode: p.paymentMode,
        paidAt: format(p.paidAt, 'dd MMM yyyy, hh:mm a'),
        feeTitle: p.fee.title,
        studentName: p.fee.student.user?.name || 'Unknown',
        studentCode: p.fee.student.studentId,
        className: classLabel.get(p.fee.student.classId) ?? '-',
      })),
    },

    academics: {
      homework: {
        total: homeworks.length,
        byStatus: homeworkByStatus,
        pastDue: homeworkPastDue,
        bySubject: [...homeworkBySubject.entries()]
          .map(([subject, count]) => ({ subject, count }))
          .sort((a, b) => b.count - a.count),
      },
      performance,
      tests: tests.map((t, i) => ({
        id: t.id,
        title: t.title,
        subject: t.subject.name,
        className: `${t.class.name}-${t.class.section}`,
        date: format(t.date, 'dd MMM yyyy'),
        totalMarks: t.totalMarks,
        duration: t.duration,
        status: t.status,
        entered: testSummaries[i].entered,
        averagePercent: testSummaries[i].averagePercent,
        passRate: testSummaries[i].passRate,
      })),
      exams: exams.map((e, i) => ({
        papers: examSummaries[i].papers,
        entered: examSummaries[i].entered,
        averagePercent: examSummaries[i].averagePercent,
        id: e.id,
        title: e.title,
        examType: e.examType,
        className: `${e.class.name}-${e.class.section}`,
        startDate: format(e.startDate, 'dd MMM yyyy'),
        endDate: format(e.endDate, 'dd MMM yyyy'),
        status: e.status,
      })),
    },
  }
}
