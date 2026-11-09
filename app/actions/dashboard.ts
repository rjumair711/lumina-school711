'use server'

import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  formatDistanceToNowStrict,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { AttendanceStatus } from '@prisma/client'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'
import { syncOverdueFees } from '@/lib/fees'
import { passMarkFor, round1 } from '@/lib/grades'

export type DashboardData = Awaited<ReturnType<typeof loadData>>

export async function getDashboardData(): Promise<
  { success: true; data: DashboardData } | { success: false; error: string; unauthorized?: boolean }
> {
  try {
    const admin = await requireSchoolAdmin()
    return { success: true, data: await loadData(admin.schoolId, admin.name) }
  } catch (error) {
    const access = accessErrorMessage(error)
    if (access) return { success: false, error: access, unauthorized: true }
    console.error('[Dashboard]', error)
    return { success: false, error: 'Unable to load the dashboard.' }
  }
}

const attended = (s: AttendanceStatus) => s === 'PRESENT' || s === 'LATE'
const dayKey = (d: Date) => format(d, 'yyyy-MM-dd')

async function loadData(schoolId: string, adminName: string) {
  await syncOverdueFees(schoolId)

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const trendStart = startOfDay(subDays(now, 13))
  const feeStart = startOfMonth(subMonths(now, 5))
  const calStart = startOfMonth(subMonths(now, 1))
  const calEnd = endOfMonth(addMonths(now, 2))
  const upcomingEnd = endOfDay(addDays(now, 30))
  const perfStart = subDays(now, 180)
  const weekday = format(now, 'EEEE')

  const [
    school,
    counts,
    attendanceToday,
    classesMarkedToday,
    staffToday,
    attendanceTrend,
    lessonsToday,
    payments,
    feesDue,
    overdueFees,
    feeTotals,
    testResults,
    examResults,
    recentStudents,
    recentPayments,
    recentNotices,
    recentHomework,
    recentMaterials,
    upcomingTests,
    upcomingPapers,
    calendarHomework,
    calendarFees,
    pastTests,
    unstaffed,
    studentAttendance30,
  ] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.teacher.count({ where: { schoolId } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, createdAt: { gte: startOfMonth(now) } } }),
    ]),
    prisma.attendance.groupBy({
      by: ['status'],
      where: { class: { schoolId }, subjectId: null, date: { gte: todayStart, lte: todayEnd } },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ['classId'],
      where: { class: { schoolId }, subjectId: null, date: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.teacherAttendance.groupBy({
      by: ['status'],
      where: { schoolId, date: { gte: todayStart, lte: todayEnd } },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ['date', 'status'],
      where: { class: { schoolId }, subjectId: null, date: { gte: trendStart, lte: todayEnd } },
      _count: { _all: true },
    }),
    prisma.timetableSlot.count({ where: { class: { schoolId }, day: weekday, isBreak: false } }),
    prisma.feePayment.findMany({
      where: { fee: { schoolId }, paidAt: { gte: feeStart } },
      select: { amount: true, paidAt: true },
    }),
    prisma.fee.findMany({
      where: { schoolId, dueDate: { gte: feeStart, lte: endOfMonth(now) } },
      select: { totalAmount: true, dueDate: true },
    }),
    prisma.fee.findMany({
      where: { schoolId, dueDate: { lt: now }, status: { not: 'PAID' } },
      select: {
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
        title: true,
        student: { select: { id: true, user: { select: { name: true } }, class: { select: { name: true, section: true } } } },
      },
    }),
    prisma.fee.aggregate({ where: { schoolId }, _sum: { totalAmount: true, paidAmount: true } }),
    prisma.testResult.findMany({
      where: { test: { schoolId, date: { gte: perfStart } }, isAbsent: false, marksObtained: { not: null } },
      select: { marksObtained: true, test: { select: { classId: true, totalMarks: true, passingMarks: true } } },
    }),
    prisma.examResult.findMany({
      where: { paper: { exam: { schoolId }, date: { gte: perfStart } }, isAbsent: false, marksObtained: { not: null } },
      select: { marksObtained: true, paper: { select: { totalMarks: true, passingMarks: true, exam: { select: { classId: true } } } } },
    }),
    prisma.student.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, createdAt: true, user: { select: { name: true } }, class: { select: { name: true, section: true } } },
    }),
    prisma.feePayment.findMany({
      where: { fee: { schoolId } },
      orderBy: { paidAt: 'desc' },
      take: 5,
      select: { id: true, paidAt: true, amount: true, fee: { select: { title: true, student: { select: { user: { select: { name: true } } } } } } },
    }),
    prisma.notice.findMany({
      where: { schoolId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.homework.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, createdAt: true, class: { select: { name: true, section: true } } },
    }),
    prisma.studyMaterial.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, title: true, createdAt: true, class: { select: { name: true, section: true } } },
    }),
    prisma.test.findMany({
      where: { schoolId, date: { gte: calStart, lte: calEnd }, status: { not: 'Cancelled' } },
      orderBy: { date: 'asc' },
      select: { id: true, title: true, date: true, class: { select: { name: true, section: true } }, subject: { select: { name: true } } },
    }),
    prisma.examPaper.findMany({
      where: { exam: { schoolId, status: { not: 'Cancelled' } }, date: { gte: calStart, lte: calEnd } },
      orderBy: { date: 'asc' },
      select: { id: true, date: true, subject: { select: { name: true } }, exam: { select: { title: true, class: { select: { name: true, section: true } } } } },
    }),
    prisma.homework.findMany({
      where: { schoolId, dueDate: { gte: calStart, lte: calEnd }, status: { not: 'DRAFT' } },
      select: { id: true, title: true, dueDate: true, class: { select: { name: true, section: true } } },
    }),
    prisma.fee.groupBy({
      by: ['title', 'dueDate'],
      where: { schoolId, dueDate: { gte: calStart, lte: calEnd } },
      _count: { _all: true },
    }),
    prisma.test.findMany({
      where: { schoolId, date: { lte: todayEnd, gte: subDays(now, 60) }, status: { notIn: ['Cancelled', 'Draft'] } },
      select: { classId: true, _count: { select: { results: true } } },
    }),
    prisma.classSubjectAssignment.count({ where: { schoolId, teacherId: null } }),
    prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      where: { class: { schoolId }, subjectId: null, date: { gte: subDays(now, 30) } },
      _count: { _all: true },
    }),
  ])

  const [students, teachers, classes, newStudents] = counts

  // ---------------- Today ----------------
  const todayTotal = attendanceToday.reduce((s, r) => s + r._count._all, 0)
  const todayPresent = attendanceToday.filter((r) => attended(r.status)).reduce((s, r) => s + r._count._all, 0)
  const staffTotal = staffToday.reduce((s, r) => s + r._count._all, 0)
  const staffPresent = staffToday.filter((r) => attended(r.status)).reduce((s, r) => s + r._count._all, 0)

  // ---------------- Attendance trend (14 days) ----------------
  const trendMap = new Map<string, { present: number; total: number }>()
  for (const r of attendanceTrend) {
    const k = dayKey(r.date)
    const e = trendMap.get(k) ?? { present: 0, total: 0 }
    e.total += r._count._all
    if (attended(r.status)) e.present += r._count._all
    trendMap.set(k, e)
  }
  const attendanceSeries = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(trendStart, i)
    const e = trendMap.get(dayKey(d))
    return {
      label: format(d, 'EEE d'),
      rate: e && e.total ? round1((e.present / e.total) * 100) : null,
      present: e?.present ?? 0,
      total: e?.total ?? 0,
      isToday: dayKey(d) === dayKey(now),
    }
  })

  // ---------------- Fees (6 months) ----------------
  const feeSeries = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(feeStart, i)
    const key = format(m, 'yyyy-MM')
    return {
      label: format(m, 'MMM'),
      collected: Math.round(payments.filter((p) => format(p.paidAt, 'yyyy-MM') === key).reduce((s, p) => s + p.amount, 0)),
      due: Math.round(feesDue.filter((f) => format(f.dueDate, 'yyyy-MM') === key).reduce((s, f) => s + f.totalAmount, 0)),
      isCurrent: key === format(now, 'yyyy-MM'),
    }
  })
  const collectedThisMonth = feeSeries[5].collected
  const collectedLastMonth = feeSeries[4].collected

  const overdueByStudent = new Map<string, { id: string; name: string; className: string; amount: number; oldest: Date; fees: string[] }>()
  for (const f of overdueFees) {
    const balance = Math.max(f.totalAmount - f.paidAmount, 0)
    if (balance <= 0) continue
    const s = f.student
    const e = overdueByStudent.get(s.id) ?? {
      id: s.id,
      name: s.user?.name || 'Unknown',
      className: `${s.class.name}-${s.class.section}`,
      amount: 0,
      oldest: f.dueDate,
      fees: [],
    }
    e.amount += balance
    e.fees.push(f.title)
    if (f.dueDate < e.oldest) e.oldest = f.dueDate
    overdueByStudent.set(s.id, e)
  }
  const overdueList = [...overdueByStudent.values()].sort((a, b) => b.amount - a.amount)
  const overdueTotal = overdueList.reduce((s, d) => s + d.amount, 0)
  const outstanding = Math.max((feeTotals._sum.totalAmount ?? 0) - (feeTotals._sum.paidAmount ?? 0), 0)

  // ---------------- Class performance (last 6 months) ----------------
  const perf = new Map<string, { sum: number; n: number; passed: number }>()
  const addPerf = (classId: string, marks: number, total: number, passing: number | null) => {
    const e = perf.get(classId) ?? { sum: 0, n: 0, passed: 0 }
    e.sum += (marks / total) * 100
    e.n += 1
    if (marks >= passMarkFor(total, passing)) e.passed += 1
    perf.set(classId, e)
  }
  for (const r of testResults) addPerf(r.test.classId, r.marksObtained!, r.test.totalMarks, r.test.passingMarks)
  for (const r of examResults) addPerf(r.paper.exam.classId, r.marksObtained!, r.paper.totalMarks, r.paper.passingMarks)

  const classRows = await prisma.class.findMany({
    where: { schoolId },
    orderBy: [{ name: 'asc' }, { section: 'asc' }],
    select: { id: true, name: true, section: true, _count: { select: { students: true } } },
  })
  const classPerformance = classRows
    .filter((c) => perf.has(c.id))
    .map((c) => {
      const e = perf.get(c.id)!
      return { name: `${c.name}-${c.section}`, average: round1(e.sum / e.n), passRate: round1((e.passed / e.n) * 100), scores: e.n }
    })
    .sort((a, b) => b.average - a.average)

  // ---------------- Activity feed ----------------
  type Activity = { id: string; kind: 'student' | 'payment' | 'notice' | 'homework' | 'material'; title: string; detail: string; at: Date; href: string }
  const activity: Activity[] = [
    ...recentStudents.map((s) => ({ id: `s${s.id}`, kind: 'student' as const, title: 'Student enrolled', detail: `${s.user?.name ?? 'Student'} · Class ${s.class.name}-${s.class.section}`, at: s.createdAt, href: `/admin/students/${s.id}` })),
    ...recentPayments.map((p) => ({ id: `p${p.id}`, kind: 'payment' as const, title: `₹${Math.round(p.amount).toLocaleString('en-IN')} fee received`, detail: `${p.fee.student.user?.name ?? 'Student'} · ${p.fee.title}`, at: p.paidAt, href: '/admin/fees' })),
    ...recentNotices.map((n) => ({ id: `n${n.id}`, kind: 'notice' as const, title: 'Notice published', detail: n.title, at: n.createdAt, href: '/admin/notice-board' })),
    ...recentHomework.map((h) => ({ id: `h${h.id}`, kind: 'homework' as const, title: 'Homework assigned', detail: `${h.title} · Class ${h.class.name}-${h.class.section}`, at: h.createdAt, href: '/admin/homework' })),
    ...recentMaterials.map((m) => ({ id: `m${m.id}`, kind: 'material' as const, title: 'Study material added', detail: `${m.title} · Class ${m.class.name}-${m.class.section}`, at: m.createdAt, href: '/admin/study-materials' })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8)

  // ---------------- Upcoming & calendar ----------------
  const assessments = [
    ...upcomingTests.map((t) => ({ id: `t${t.id}`, kind: 'test' as const, title: t.title, detail: `${t.subject.name} · Class ${t.class.name}-${t.class.section}`, date: t.date })),
    ...upcomingPapers.map((p) => ({ id: `e${p.id}`, kind: 'exam' as const, title: `${p.exam.title} · ${p.subject.name}`, detail: `Class ${p.exam.class.name}-${p.exam.class.section}`, date: p.date })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  const upcoming = assessments
    .filter((a) => a.date >= todayStart && a.date <= upcomingEnd)
    .slice(0, 6)
    .map((a) => ({ ...a, date: dayKey(a.date), dateLabel: format(a.date, 'EEE, dd MMM'), inDays: differenceInCalendarDays(a.date, now) }))

  const events = [
    ...assessments.map((a) => ({ date: dayKey(a.date), kind: a.kind, title: a.title, detail: a.detail })),
    ...calendarHomework.map((h) => ({ date: dayKey(h.dueDate), kind: 'homework' as const, title: `Homework due: ${h.title}`, detail: `Class ${h.class.name}-${h.class.section}` })),
    ...calendarFees.map((f) => ({ date: dayKey(f.dueDate), kind: 'fee' as const, title: `Fee due: ${f.title}`, detail: `${f._count._all} student${f._count._all === 1 ? '' : 's'}` })),
  ]

  // ---------------- Alerts ----------------
  const studentCountByClass = new Map(classRows.map((c) => [c.id, c._count.students]))
  const marksPending = pastTests.filter((t) => t._count.results < (studentCountByClass.get(t.classId) ?? 0)).length

  const perStudent = new Map<string, { a: number; t: number }>()
  for (const r of studentAttendance30) {
    const e = perStudent.get(r.studentId) ?? { a: 0, t: 0 }
    e.t += r._count._all
    if (attended(r.status)) e.a += r._count._all
    perStudent.set(r.studentId, e)
  }
  const lowAttendance = [...perStudent.values()].filter((e) => e.t >= 3 && e.a / e.t < 0.75).length

  const classesWithStudents = classRows.filter((c) => c._count.students > 0).length
  const isSchoolDay = now.getDay() !== 0
  const alerts: { tone: 'danger' | 'warning' | 'info'; text: string; href: string; action: string }[] = []
  if (isSchoolDay && classesWithStudents > 0 && classesMarkedToday.length < classesWithStudents) {
    const missing = classesWithStudents - classesMarkedToday.length
    alerts.push({ tone: 'warning', text: `${missing} class${missing === 1 ? " hasn't" : "es haven't"} marked attendance today`, href: '/admin/attendance', action: 'Mark now' })
  }
  if (overdueList.length) alerts.push({ tone: 'danger', text: `${overdueList.length} student${overdueList.length === 1 ? ' has' : 's have'} overdue fees (₹${Math.round(overdueTotal).toLocaleString('en-IN')})`, href: '/admin/fees', action: 'Review' })
  if (lowAttendance) alerts.push({ tone: 'danger', text: `${lowAttendance} student${lowAttendance === 1 ? ' is' : 's are'} below 75% attendance this month`, href: '/admin/reports?tab=attendance', action: 'See list' })
  if (marksPending) alerts.push({ tone: 'warning', text: `${marksPending} test${marksPending === 1 ? ' is' : 's are'} waiting for marks`, href: '/admin/tests-exams', action: 'Enter marks' })
  if (unstaffed) alerts.push({ tone: 'info', text: `${unstaffed} class subject${unstaffed === 1 ? ' has' : 's have'} no teacher`, href: '/admin/subject-class', action: 'Assign' })

  return {
    schoolName: school?.name ?? 'your school',
    adminName,
    greeting: now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening',
    todayLabel: format(now, 'EEEE, dd MMMM yyyy'),
    today: dayKey(now),
    generatedLabel: format(now, 'hh:mm a'),
    stats: {
      students,
      newStudents,
      teachers,
      classes,
      attendanceToday: todayTotal ? round1((todayPresent / todayTotal) * 100) : null,
      presentToday: todayPresent,
      markedToday: todayTotal,
      classesMarked: classesMarkedToday.length,
      classesWithStudents,
      staffToday: staffTotal ? round1((staffPresent / staffTotal) * 100) : null,
      lessonsToday,
      collectedThisMonth,
      collectedChange: collectedLastMonth ? round1(((collectedThisMonth - collectedLastMonth) / collectedLastMonth) * 100) : null,
      outstanding: Math.round(outstanding),
    },
    attendanceSeries,
    feeSeries,
    classPerformance,
    activity: activity.map(({ at, ...rest }) => ({ ...rest, when: formatDistanceToNowStrict(at, { addSuffix: true }) })),
    upcoming,
    overdue: {
      count: overdueList.length,
      total: Math.round(overdueTotal),
      list: overdueList.slice(0, 5).map((d) => ({
        id: d.id,
        name: d.name,
        className: d.className,
        amount: Math.round(d.amount),
        detail: d.fees.length > 1 ? `${d.fees.length} fees` : d.fees[0],
        daysOverdue: Math.max(differenceInCalendarDays(now, d.oldest), 0),
      })),
    },
    events,
    alerts,
  }
}
