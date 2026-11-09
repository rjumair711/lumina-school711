'use server'

import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import {
  accessErrorMessage,
  parseLocalDay,
  requireSchoolAdmin,
} from '@/lib/school-auth'
import {
  ASSESSMENT_STATUSES,
  EXAM_TYPES,
  GRADES,
  gradeFor,
  passMarkFor,
  round1,
  summarize,
  type AssessmentStatus,
} from '@/lib/grades'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type Result<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string; unauthorized?: boolean }

export type TestInput = {
  title: string
  classId: string
  subjectId: string
  date: string
  totalMarks: number
  passingMarks: number | null
  duration: number
  status: string
}

export type ExamInput = {
  title: string
  examType: string
  classId: string
  startDate: string
  endDate: string
  status: string
}

export type PaperInput = {
  subjectId: string
  date: string
  totalMarks: number
  passingMarks: number | null
}

export type MarkInput = {
  studentId: string
  marks: number | null
  absent: boolean
  remarks?: string
}

export type SheetKind = 'test' | 'paper'

export type AssessmentsData = Awaited<ReturnType<typeof loadData>>
export type Marksheet = Awaited<ReturnType<typeof loadMarksheet>>
export type ResultSheet = Awaited<ReturnType<typeof loadResultSheet>>

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

class InputError extends Error {}

function fail(error: unknown): { success: false; error: string; unauthorized?: boolean } {
  const access = accessErrorMessage(error)
  if (access) return { success: false, error: access, unauthorized: true }
  if (error instanceof InputError) return { success: false, error: error.message }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return { success: false, error: 'This record already exists.' }
  }
  console.error('[Tests & Exams]', error)
  return { success: false, error: 'Unable to complete the operation. Please try again.' }
}

function refresh() {
  revalidatePath('/admin/tests-exams')
  revalidatePath('/admin/reports')
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')
const label = (d: Date) => format(d, 'dd MMM yyyy')

function requireText(value: unknown, field: string, max: number) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) throw new InputError(`${field} is required.`)
  if (text.length > max) throw new InputError(`${field} must be at most ${max} characters.`)
  return text
}

function requireInt(value: unknown, field: string, min: number, max: number) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new InputError(`${field} must be a whole number between ${min} and ${max}.`)
  }
  return n
}

function requireDay(value: string, field: string) {
  const date = parseLocalDay(value, 'noon')
  if (!date) throw new InputError(`Enter a valid ${field}.`)
  return date
}

function requireStatus(value: string): AssessmentStatus {
  if (!ASSESSMENT_STATUSES.includes(value as AssessmentStatus)) {
    throw new InputError('Invalid status.')
  }
  return value as AssessmentStatus
}

function passingFor(value: number | null, total: number, field = 'Passing marks') {
  if (value === null || value === undefined || (value as unknown) === '') return null
  return requireInt(value, field, 0, total)
}

async function classInSchool(schoolId: string, classId: string) {
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true, section: true },
  })
  if (!cls) throw new InputError('Class not found in your school.')
  return cls
}

// Subjects must be assigned to the class (Subject & Class page), the
// same rule homework and the timetable follow.
async function requireAssignment(schoolId: string, classId: string, subjectId: string) {
  const assignment = await prisma.classSubjectAssignment.findFirst({
    where: { schoolId, classId, subjectId, subject: { schoolId } },
    select: { id: true },
  })
  if (!assignment) {
    throw new InputError(
      'This subject is not assigned to the class. Assign it on the Subject & Class page first.'
    )
  }
}

// ------------------------------------------------------------------
// Dashboard data
// ------------------------------------------------------------------

export async function getAssessmentsData(): Promise<Result<{ data: AssessmentsData }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    return { success: true, data: await loadData(schoolId) }
  } catch (error) {
    return fail(error)
  }
}

async function loadData(schoolId: string) {
  const [classes, subjects, assignments, tests, exams, testResults, examResults] =
    await Promise.all([
      prisma.class.findMany({
        where: { schoolId },
        orderBy: [{ name: 'asc' }, { section: 'asc' }],
        select: { id: true, name: true, section: true, _count: { select: { students: true } } },
      }),
      prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      }),
      prisma.classSubjectAssignment.findMany({
        where: { schoolId, subject: { schoolId } },
        select: {
          classId: true,
          subject: { select: { id: true, name: true, code: true } },
          teacher: { select: { user: { select: { name: true } } } },
        },
        orderBy: { subject: { name: 'asc' } },
      }),
      prisma.test.findMany({
        where: { schoolId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          classId: true,
          subjectId: true,
          date: true,
          totalMarks: true,
          passingMarks: true,
          duration: true,
          status: true,
          updatedAt: true,
          class: { select: { name: true, section: true } },
          subject: { select: { name: true, code: true } },
        },
      }),
      prisma.exam.findMany({
        where: { schoolId },
        orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          examType: true,
          classId: true,
          startDate: true,
          endDate: true,
          status: true,
          class: { select: { name: true, section: true } },
          papers: {
            orderBy: [{ date: 'asc' }, { subject: { name: 'asc' } }],
            select: {
              id: true,
              subjectId: true,
              date: true,
              totalMarks: true,
              passingMarks: true,
              subject: { select: { name: true, code: true } },
            },
          },
        },
      }),
      prisma.testResult.findMany({
        where: { test: { schoolId } },
        select: { testId: true, marksObtained: true, isAbsent: true },
      }),
      prisma.examResult.findMany({
        where: { paper: { exam: { schoolId } } },
        select: { paperId: true, marksObtained: true, isAbsent: true },
      }),
    ])

  const studentCount = new Map(classes.map((c) => [c.id, c._count.students]))

  const groupBy = <T extends { marksObtained: number | null; isAbsent: boolean }>(
    rows: T[],
    key: (r: T) => string
  ) => {
    const map = new Map<string, T[]>()
    for (const r of rows) {
      const k = key(r)
      const list = map.get(k)
      if (list) list.push(r)
      else map.set(k, [r])
    }
    return map
  }

  const testMarks = groupBy(testResults, (r) => r.testId)
  const paperMarks = groupBy(examResults, (r) => r.paperId)

  const subjectsByClass: Record<string, { id: string; name: string; code: string; teacher: string | null }[]> = {}
  for (const a of assignments) {
    ;(subjectsByClass[a.classId] ??= []).push({
      ...a.subject,
      teacher: a.teacher?.user?.name ?? null,
    })
  }

  const now = new Date()

  return {
    generatedLabel: format(now, 'hh:mm:ss a'),
    today: ymd(now),

    classes: classes.map((c) => ({
      id: c.id,
      name: `${c.name}-${c.section}`,
      studentCount: c._count.students,
    })),
    subjects,
    subjectsByClass,
    examTypes: [...EXAM_TYPES],
    statuses: [...ASSESSMENT_STATUSES],

    tests: tests.map((t) => ({
      id: t.id,
      title: t.title,
      classId: t.classId,
      className: `${t.class.name}-${t.class.section}`,
      subjectId: t.subjectId,
      subjectName: t.subject.name,
      subjectCode: t.subject.code,
      date: ymd(t.date),
      dateLabel: label(t.date),
      totalMarks: t.totalMarks,
      passingMarks: t.passingMarks,
      duration: t.duration,
      status: t.status,
      studentCount: studentCount.get(t.classId) ?? 0,
      stats: summarize(testMarks.get(t.id) ?? [], t.totalMarks, t.passingMarks),
    })),

    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      examType: e.examType,
      classId: e.classId,
      className: `${e.class.name}-${e.class.section}`,
      startDate: ymd(e.startDate),
      endDate: ymd(e.endDate),
      dateLabel:
        ymd(e.startDate) === ymd(e.endDate)
          ? label(e.startDate)
          : `${format(e.startDate, 'dd MMM')} – ${label(e.endDate)}`,
      status: e.status,
      studentCount: studentCount.get(e.classId) ?? 0,
      papers: e.papers.map((p) => ({
        id: p.id,
        subjectId: p.subjectId,
        subjectName: p.subject.name,
        subjectCode: p.subject.code,
        date: ymd(p.date),
        dateLabel: format(p.date, 'EEE, dd MMM'),
        totalMarks: p.totalMarks,
        passingMarks: p.passingMarks,
        stats: summarize(paperMarks.get(p.id) ?? [], p.totalMarks, p.passingMarks),
      })),
    })),
  }
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

export async function saveTest(input: TestInput, id?: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const title = requireText(input.title, 'Title', 200)
    const date = requireDay(input.date, 'test date')
    const totalMarks = requireInt(input.totalMarks, 'Total marks', 1, 1000)
    const passingMarks = passingFor(input.passingMarks, totalMarks)
    const duration = requireInt(input.duration, 'Duration', 1, 600)
    const status = requireStatus(input.status)

    await classInSchool(schoolId, input.classId)
    await requireAssignment(schoolId, input.classId, input.subjectId)

    const data = {
      title,
      date,
      totalMarks,
      passingMarks,
      duration,
      status,
      classId: input.classId,
      subjectId: input.subjectId,
    }

    if (id) {
      const existing = await prisma.test.findFirst({
        where: { id, schoolId },
        select: {
          classId: true,
          subjectId: true,
          results: { select: { marksObtained: true }, take: 1, orderBy: { marksObtained: { sort: 'desc', nulls: 'last' } } },
          _count: { select: { results: true } },
        },
      })
      if (!existing) throw new InputError('Test not found.')

      if (
        existing._count.results > 0 &&
        (existing.classId !== input.classId || existing.subjectId !== input.subjectId)
      ) {
        throw new InputError('Marks are already entered. Class and subject can no longer be changed.')
      }

      const highest = existing.results[0]?.marksObtained ?? 0
      if (highest > totalMarks) {
        throw new InputError(`A student already scored ${highest}. Total marks cannot be lower.`)
      }

      await prisma.test.updateMany({ where: { id, schoolId }, data })
    } else {
      await prisma.test.create({ data: { ...data, schoolId } })
    }

    refresh()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteTest(id: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    const result = await prisma.test.deleteMany({ where: { id, schoolId } })
    if (!result.count) throw new InputError('Test not found.')
    refresh()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function setAssessmentStatus(
  kind: 'test' | 'exam',
  id: string,
  status: string
): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    const value = requireStatus(status)

    const result =
      kind === 'test'
        ? await prisma.test.updateMany({ where: { id, schoolId }, data: { status: value } })
        : await prisma.exam.updateMany({ where: { id, schoolId }, data: { status: value } })

    if (!result.count) throw new InputError(`${kind === 'test' ? 'Test' : 'Exam'} not found.`)
    refresh()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

// ------------------------------------------------------------------
// Exams & papers
// ------------------------------------------------------------------

export async function saveExam(input: ExamInput, id?: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const title = requireText(input.title, 'Exam title', 200)
    const examType = requireText(input.examType, 'Exam type', 60)
    const startDate = requireDay(input.startDate, 'start date')
    const endDate = requireDay(input.endDate, 'end date')
    const status = requireStatus(input.status)

    if (endDate < startDate) throw new InputError('End date must be on or after the start date.')
    await classInSchool(schoolId, input.classId)

    const data = { title, examType, startDate, endDate, status, classId: input.classId }

    if (id) {
      const existing = await prisma.exam.findFirst({
        where: { id, schoolId },
        select: { classId: true, papers: { select: { date: true } } },
      })
      if (!existing) throw new InputError('Exam not found.')

      if (existing.classId !== input.classId && existing.papers.length > 0) {
        throw new InputError('Remove the exam papers before moving this exam to another class.')
      }

      const outside = existing.papers.some((p) => p.date < startDate || p.date > endDate)
      if (outside) {
        throw new InputError('Some papers fall outside the new dates. Move those papers first.')
      }

      await prisma.exam.updateMany({ where: { id, schoolId }, data })
    } else {
      await prisma.exam.create({ data: { ...data, schoolId } })
    }

    refresh()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteExam(id: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    const result = await prisma.exam.deleteMany({ where: { id, schoolId } })
    if (!result.count) throw new InputError('Exam not found.')
    refresh()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function savePaper(
  examId: string,
  input: PaperInput,
  paperId?: string
): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: { id: true, classId: true, startDate: true, endDate: true },
    })
    if (!exam) throw new InputError('Exam not found.')

    const date = requireDay(input.date, 'paper date')
    const totalMarks = requireInt(input.totalMarks, 'Total marks', 1, 1000)
    const passingMarks = passingFor(input.passingMarks, totalMarks)

    if (ymd(date) < ymd(exam.startDate) || ymd(date) > ymd(exam.endDate)) {
      throw new InputError(
        `Paper date must be between ${label(exam.startDate)} and ${label(exam.endDate)}.`
      )
    }

    await requireAssignment(schoolId, exam.classId, input.subjectId)

    const duplicate = await prisma.examPaper.findFirst({
      where: {
        examId,
        subjectId: input.subjectId,
        ...(paperId ? { id: { not: paperId } } : {}),
      },
      select: { id: true },
    })
    if (duplicate) throw new InputError('This subject already has a paper in this exam.')

    const data = { date, totalMarks, passingMarks, subjectId: input.subjectId }

    if (paperId) {
      const existing = await prisma.examPaper.findFirst({
        where: { id: paperId, examId },
        select: {
          subjectId: true,
          results: { select: { marksObtained: true }, take: 1, orderBy: { marksObtained: { sort: 'desc', nulls: 'last' } } },
          _count: { select: { results: true } },
        },
      })
      if (!existing) throw new InputError('Paper not found.')

      if (existing._count.results > 0 && existing.subjectId !== input.subjectId) {
        throw new InputError('Marks are already entered. The subject can no longer be changed.')
      }
      const highest = existing.results[0]?.marksObtained ?? 0
      if (highest > totalMarks) {
        throw new InputError(`A student already scored ${highest}. Total marks cannot be lower.`)
      }

      await prisma.examPaper.update({ where: { id: paperId }, data })
    } else {
      await prisma.examPaper.create({ data: { ...data, examId } })
    }

    refresh()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function deletePaper(paperId: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    const result = await prisma.examPaper.deleteMany({
      where: { id: paperId, exam: { schoolId } },
    })
    if (!result.count) throw new InputError('Paper not found.')
    refresh()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

// ------------------------------------------------------------------
// Marks entry
// ------------------------------------------------------------------

async function resolveSheet(schoolId: string, kind: SheetKind, id: string) {
  if (kind === 'test') {
    const test = await prisma.test.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        title: true,
        classId: true,
        date: true,
        totalMarks: true,
        passingMarks: true,
        status: true,
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
      },
    })
    if (!test) throw new InputError('Test not found.')
    return {
      kind,
      id: test.id,
      title: test.title,
      subtitle: `${test.subject.name} · Class ${test.class.name}-${test.class.section} · ${label(test.date)}`,
      classId: test.classId,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      status: test.status,
    }
  }

  const paper = await prisma.examPaper.findFirst({
    where: { id, exam: { schoolId } },
    select: {
      id: true,
      date: true,
      totalMarks: true,
      passingMarks: true,
      subject: { select: { name: true } },
      exam: {
        select: {
          title: true,
          classId: true,
          status: true,
          class: { select: { name: true, section: true } },
        },
      },
    },
  })
  if (!paper) throw new InputError('Exam paper not found.')
  return {
    kind,
    id: paper.id,
    title: `${paper.exam.title} · ${paper.subject.name}`,
    subtitle: `Class ${paper.exam.class.name}-${paper.exam.class.section} · ${label(paper.date)}`,
    classId: paper.exam.classId,
    totalMarks: paper.totalMarks,
    passingMarks: paper.passingMarks,
    status: paper.exam.status,
  }
}

export async function getMarksheet(
  kind: SheetKind,
  id: string
): Promise<Result<{ sheet: Marksheet }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    return { success: true, sheet: await loadMarksheet(schoolId, kind, id) }
  } catch (error) {
    return fail(error)
  }
}

async function loadMarksheet(schoolId: string, kind: SheetKind, id: string) {
  const sheet = await resolveSheet(schoolId, kind, id)

  const [students, results] = await Promise.all([
    prisma.student.findMany({
      where: { schoolId, classId: sheet.classId },
      orderBy: [{ rollNo: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, studentId: true, rollNo: true, user: { select: { name: true } } },
    }),
    kind === 'test'
      ? prisma.testResult.findMany({
          where: { testId: id },
          select: { studentId: true, marksObtained: true, isAbsent: true, remarks: true, updatedAt: true },
        })
      : prisma.examResult.findMany({
          where: { paperId: id },
          select: { studentId: true, marksObtained: true, isAbsent: true, remarks: true, updatedAt: true },
        }),
  ])

  const byStudent = new Map(results.map((r) => [r.studentId, r]))
  const lastSaved = results.reduce<Date | null>(
    (latest, r) => (!latest || r.updatedAt > latest ? r.updatedAt : latest),
    null
  )

  // Natural sort of roll numbers ("2" before "10").
  students.sort((a, b) =>
    (a.rollNo ?? '').localeCompare(b.rollNo ?? '', undefined, { numeric: true })
  )

  return {
    ...sheet,
    passMark: passMarkFor(sheet.totalMarks, sheet.passingMarks),
    lastSavedLabel: lastSaved ? format(lastSaved, 'dd MMM, hh:mm a') : null,
    students: students.map((s) => {
      const r = byStudent.get(s.id)
      return {
        id: s.id,
        name: s.user?.name || 'Unknown',
        studentCode: s.studentId,
        rollNo: s.rollNo || '',
        marks: r?.marksObtained ?? null,
        absent: r?.isAbsent ?? false,
        remarks: r?.remarks ?? '',
      }
    }),
  }
}

export async function saveMarks(
  kind: SheetKind,
  id: string,
  rows: MarkInput[],
  options: { markCompleted?: boolean } = {}
): Promise<Result<{ saved: number }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    const sheet = await resolveSheet(schoolId, kind, id)

    if (!Array.isArray(rows) || rows.length === 0) throw new InputError('Nothing to save.')
    if (rows.length > 500) throw new InputError('Too many rows.')

    const students = await prisma.student.findMany({
      where: { schoolId, classId: sheet.classId, id: { in: rows.map((r) => r.studentId) } },
      select: { id: true },
    })
    const allowed = new Set(students.map((s) => s.id))

    const clean = rows.map((r) => {
      if (!allowed.has(r.studentId)) {
        throw new InputError('Some students are not in this class. Reload and try again.')
      }
      const absent = Boolean(r.absent)
      const marks =
        absent || r.marks === null || r.marks === undefined || (r.marks as unknown) === ''
          ? null
          : Number(r.marks)

      if (marks !== null && (!Number.isFinite(marks) || marks < 0 || marks > sheet.totalMarks)) {
        throw new InputError(`Marks must be between 0 and ${sheet.totalMarks}.`)
      }
      if (marks !== null && Math.round(marks * 2) !== marks * 2) {
        throw new InputError('Marks can use at most half-marks (e.g. 17.5).')
      }

      const remarks = (r.remarks ?? '').trim().slice(0, 300) || null
      return { studentId: r.studentId, marks, absent, remarks }
    })

    const toUpsert = clean.filter((r) => r.absent || r.marks !== null)
    const toClear = clean.filter((r) => !r.absent && r.marks === null).map((r) => r.studentId)

    await prisma.$transaction(async (tx) => {
      for (const r of toUpsert) {
        const data = { marksObtained: r.marks, isAbsent: r.absent, remarks: r.remarks }
        if (kind === 'test') {
          await tx.testResult.upsert({
            where: { testId_studentId: { testId: id, studentId: r.studentId } },
            create: { ...data, testId: id, studentId: r.studentId },
            update: data,
          })
        } else {
          await tx.examResult.upsert({
            where: { paperId_studentId: { paperId: id, studentId: r.studentId } },
            create: { ...data, paperId: id, studentId: r.studentId },
            update: data,
          })
        }
      }

      if (toClear.length) {
        if (kind === 'test') {
          await tx.testResult.deleteMany({ where: { testId: id, studentId: { in: toClear } } })
        } else {
          await tx.examResult.deleteMany({ where: { paperId: id, studentId: { in: toClear } } })
        }
      }

      if (options.markCompleted && kind === 'test') {
        await tx.test.updateMany({ where: { id, schoolId }, data: { status: 'Completed' } })
      }
    })

    refresh()
    return { success: true, saved: toUpsert.length }
  } catch (error) {
    return fail(error)
  }
}

// ------------------------------------------------------------------
// Results (ranked)
// ------------------------------------------------------------------

export async function getResultSheet(
  kind: 'test' | 'exam',
  id: string
): Promise<Result<{ sheet: ResultSheet }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    return { success: true, sheet: await loadResultSheet(schoolId, kind, id) }
  } catch (error) {
    return fail(error)
  }
}

async function loadResultSheet(schoolId: string, kind: 'test' | 'exam', id: string) {
  type Column = { id: string; label: string; totalMarks: number; passMark: number }
  type Mark = { marksObtained: number | null; isAbsent: boolean }

  let title = ''
  let subtitle = ''
  let classId = ''
  let columns: Column[] = []
  const marks = new Map<string, Map<string, Mark>>() // studentId -> columnId -> mark

  const put = (studentId: string, columnId: string, m: Mark) => {
    let row = marks.get(studentId)
    if (!row) marks.set(studentId, (row = new Map()))
    row.set(columnId, m)
  }

  if (kind === 'test') {
    const test = await prisma.test.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        title: true,
        classId: true,
        date: true,
        totalMarks: true,
        passingMarks: true,
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
        results: { select: { studentId: true, marksObtained: true, isAbsent: true } },
      },
    })
    if (!test) throw new InputError('Test not found.')

    title = test.title
    subtitle = `${test.subject.name} · Class ${test.class.name}-${test.class.section} · ${label(test.date)}`
    classId = test.classId
    columns = [
      {
        id: test.id,
        label: test.subject.name,
        totalMarks: test.totalMarks,
        passMark: passMarkFor(test.totalMarks, test.passingMarks),
      },
    ]
    test.results.forEach((r) => put(r.studentId, test.id, r))
  } else {
    const exam = await prisma.exam.findFirst({
      where: { id, schoolId },
      select: {
        title: true,
        examType: true,
        classId: true,
        startDate: true,
        endDate: true,
        class: { select: { name: true, section: true } },
        papers: {
          orderBy: [{ date: 'asc' }, { subject: { name: 'asc' } }],
          select: {
            id: true,
            totalMarks: true,
            passingMarks: true,
            subject: { select: { name: true, code: true } },
            results: { select: { studentId: true, marksObtained: true, isAbsent: true } },
          },
        },
      },
    })
    if (!exam) throw new InputError('Exam not found.')

    title = exam.title
    subtitle = `${exam.examType} · Class ${exam.class.name}-${exam.class.section} · ${label(exam.startDate)} – ${label(exam.endDate)}`
    classId = exam.classId
    columns = exam.papers.map((p) => ({
      id: p.id,
      label: p.subject.code || p.subject.name,
      totalMarks: p.totalMarks,
      passMark: passMarkFor(p.totalMarks, p.passingMarks),
    }))
    exam.papers.forEach((p) => p.results.forEach((r) => put(r.studentId, p.id, r)))
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      OR: [{ classId }, { id: { in: [...marks.keys()] } }],
    },
    select: { id: true, studentId: true, rollNo: true, classId: true, user: { select: { name: true } } },
  })

  const maxTotal = columns.reduce((s, c) => s + c.totalMarks, 0)

  const rows = students.map((s) => {
    const row = marks.get(s.id)
    let obtained = 0
    let entered = 0
    let failedAny = false

    const cells: Record<string, { marks: number | null; absent: boolean; passed: boolean } | null> = {}
    for (const c of columns) {
      const m = row?.get(c.id)
      if (!m) {
        cells[c.id] = null
        continue
      }
      entered += 1
      const value = m.isAbsent ? null : m.marksObtained
      const passed = value !== null && value >= c.passMark
      if (!passed) failedAny = true
      obtained += value ?? 0
      cells[c.id] = { marks: value, absent: m.isAbsent, passed }
    }

    const complete = columns.length > 0 && entered === columns.length
    const percent = complete && maxTotal ? round1((obtained / maxTotal) * 100) : null

    return {
      studentId: s.id,
      name: s.user?.name || 'Unknown',
      studentCode: s.studentId,
      rollNo: s.rollNo || '',
      leftClass: s.classId !== classId,
      cells,
      obtained: round1(obtained),
      maxTotal,
      percent,
      grade: complete ? gradeFor(percent) : '—',
      result: !complete ? ('Pending' as const) : failedAny ? ('Fail' as const) : ('Pass' as const),
      rank: null as number | null,
    }
  })

  // Rank complete rows by percentage; ties share a rank (1, 2, 2, 4).
  const ranked = rows
    .filter((r) => r.percent !== null)
    .sort((a, b) => (b.percent as number) - (a.percent as number))
  ranked.forEach((r, i) => {
    r.rank = i > 0 && ranked[i - 1].percent === r.percent ? ranked[i - 1].rank : i + 1
  })

  rows.sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank
    if (a.rank !== null) return -1
    if (b.rank !== null) return 1
    return a.rollNo.localeCompare(b.rollNo, undefined, { numeric: true })
  })

  const percents = ranked.map((r) => r.percent as number)
  const gradeDistribution = GRADES.map((g) => ({
    grade: g,
    count: ranked.filter((r) => r.grade === g).length,
  }))

  const columnStats = columns.map((c) => {
    const list = rows
      .map((r) => r.cells[c.id])
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => ({ marksObtained: m.marks, isAbsent: m.absent }))
    return { id: c.id, ...summarize(list, c.totalMarks, c.passMark) }
  })

  return {
    kind,
    id,
    title,
    subtitle,
    columns,
    columnStats,
    rows,
    stats: {
      students: rows.length,
      complete: ranked.length,
      pending: rows.length - ranked.length,
      average: percents.length ? round1(percents.reduce((a, b) => a + b, 0) / percents.length) : null,
      highest: percents.length ? Math.max(...percents) : null,
      lowest: percents.length ? Math.min(...percents) : null,
      passed: ranked.filter((r) => r.result === 'Pass').length,
      passRate: ranked.length
        ? round1((ranked.filter((r) => r.result === 'Pass').length / ranked.length) * 100)
        : null,
      gradeDistribution,
    },
  }
}
