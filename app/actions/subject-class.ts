'use server'

import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'

type Result<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string; unauthorized?: boolean }

type SubjectInput = { name: string; code: string; description: string }
type AssignmentInput = { subjectId: string; teacherId: string | null }

export type SubjectClassData = Awaited<ReturnType<typeof loadData>>

class InputError extends Error {}

function fail(error: unknown): { success: false; error: string; unauthorized?: boolean } {
  const access = accessErrorMessage(error)
  if (access) return { success: false, error: access, unauthorized: true }
  if (error instanceof InputError) return { success: false, error: error.message }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return { success: false, error: 'This subject is already assigned to the class.' }
  }
  console.error('[Subject & Class]', error)
  return { success: false, error: 'Operation failed. Please try again.' }
}

function refreshPages() {
  for (const p of ['/admin/subject-class', '/admin/classes', '/admin/teachers', '/admin/homework', '/admin/timetable', '/admin/tests-exams', '/admin/study-materials']) {
    revalidatePath(p)
  }
}

const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Keep the legacy implicit Teacher↔Class / Teacher↔Subject links (used by
// the teachers pages) in line: drop a link once no assignment needs it.
async function pruneTeacherLinks(tx: Prisma.TransactionClient, teacherId: string, classId: string, subjectId: string) {
  const [stillClass, stillSubject] = await Promise.all([
    tx.classSubjectAssignment.count({ where: { teacherId, classId } }),
    tx.classSubjectAssignment.count({ where: { teacherId, subjectId } }),
  ])
  await tx.teacher.update({
    where: { id: teacherId },
    data: {
      ...(stillClass ? {} : { classes: { disconnect: { id: classId } } }),
      ...(stillSubject ? {} : { subjects: { disconnect: { id: subjectId } } }),
    },
  })
}

// ------------------------------------------------------------------
// Data
// ------------------------------------------------------------------

export async function getSubjectClassData(): Promise<Result<{ data: SubjectClassData }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    return { success: true, data: await loadData(schoolId) }
  } catch (error) {
    return fail(error)
  }
}

async function loadData(schoolId: string) {
  const [subjects, classes, teachers, assignments, lessons] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        _count: {
          select: { subjectAssignments: true, homeworks: true, tests: true, studyMaterials: true, timetables: true, examPapers: true },
        },
      },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
      select: {
        id: true,
        name: true,
        section: true,
        capacity: true,
        _count: { select: { students: true } },
        classTeacher: { select: { user: { select: { name: true } } } },
      },
    }),
    prisma.teacher.findMany({
      where: { schoolId },
      orderBy: { user: { name: 'asc' } },
      select: { id: true, teacherId: true, user: { select: { name: true } } },
    }),
    prisma.classSubjectAssignment.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, classId: true, subjectId: true, teacherId: true, createdAt: true },
    }),
    prisma.timetableSlot.groupBy({
      by: ['classId', 'subjectId', 'teacherId'],
      where: { class: { schoolId }, isBreak: false },
      _count: { _all: true },
    }),
  ])

  const lessonsFor = (classId: string, subjectId: string) =>
    lessons.filter((l) => l.classId === classId && l.subjectId === subjectId).reduce((s, l) => s + l._count._all, 0)

  const teacherLessons = new Map<string, number>()
  for (const l of lessons) {
    if (l.teacherId) teacherLessons.set(l.teacherId, (teacherLessons.get(l.teacherId) ?? 0) + l._count._all)
  }

  return {
    generatedLabel: format(new Date(), 'hh:mm:ss a'),
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      description: s.description ?? '',
      classCount: s._count.subjectAssignments,
      usage: {
        homework: s._count.homeworks,
        tests: s._count.tests + s._count.examPapers,
        materials: s._count.studyMaterials,
        lessons: s._count.timetables,
      },
    })),
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      section: c.section,
      capacity: c.capacity,
      displayName: `${c.name}-${c.section}`,
      students: c._count.students,
      classTeacher: c.classTeacher?.user?.name ?? null,
    })),
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.user?.name || t.teacherId,
      teacherId: t.teacherId,
      weeklyLessons: teacherLessons.get(t.id) ?? 0,
    })),
    assignments: assignments.map((a) => ({
      id: a.id,
      classId: a.classId,
      subjectId: a.subjectId,
      teacherId: a.teacherId,
      weeklyLessons: lessonsFor(a.classId, a.subjectId),
      createdAt: a.createdAt.toISOString(),
    })),
  }
}

// ------------------------------------------------------------------
// Subjects
// ------------------------------------------------------------------

export async function saveSubject(input: SubjectInput, id?: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const name = (input.name ?? '').trim()
    const code = (input.code ?? '').trim().toUpperCase()
    const description = (input.description ?? '').trim()

    if (!name || !code) throw new InputError('Subject name and code are required.')
    if (name.length > 100 || code.length > 30) throw new InputError('Subject name or code is too long.')
    if (!/^[A-Z0-9_-]+$/.test(code)) throw new InputError('Code can only contain letters, numbers, - and _.')
    if (description.length > 1000) throw new InputError('Description is too long.')

    const duplicate = await prisma.subject.findFirst({
      where: {
        schoolId,
        OR: [{ code }, { name: { equals: name, mode: 'insensitive' } }],
        ...(id ? { id: { not: id } } : {}),
      },
      select: { code: true },
    })
    if (duplicate) {
      throw new InputError(duplicate.code === code ? 'A subject with this code already exists.' : 'A subject with this name already exists.')
    }

    if (id) {
      const result = await prisma.subject.updateMany({ where: { id, schoolId }, data: { name, code, description } })
      if (!result.count) throw new InputError('Subject not found.')
    } else {
      await prisma.subject.create({ data: { schoolId, name, code, description } })
    }

    refreshPages()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function deleteSubject(id: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
      select: {
        _count: {
          select: { subjectAssignments: true, homeworks: true, tests: true, timetables: true, studyMaterials: true, attendances: true, examPapers: true },
        },
      },
    })
    if (!subject) throw new InputError('Subject not found.')

    const c = subject._count
    const used = [
      c.subjectAssignments && `${c.subjectAssignments} class assignment${c.subjectAssignments === 1 ? '' : 's'}`,
      c.timetables && `${c.timetables} timetable lesson${c.timetables === 1 ? '' : 's'}`,
      c.homeworks && `${c.homeworks} homework`,
      c.tests + c.examPapers && `${c.tests + c.examPapers} test/exam paper${c.tests + c.examPapers === 1 ? '' : 's'}`,
      c.studyMaterials && `${c.studyMaterials} study material${c.studyMaterials === 1 ? '' : 's'}`,
      c.attendances && 'attendance records',
    ].filter(Boolean)
    if (used.length) throw new InputError(`This subject is still used by ${used.join(', ')}. Remove those first.`)

    await prisma.subject.deleteMany({ where: { id, schoolId } })
    refreshPages()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

// ------------------------------------------------------------------
// Assignments
// ------------------------------------------------------------------

async function validateClassItems(schoolId: string, classId: string, items: AssignmentInput[]) {
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } })
  if (!cls) throw new InputError('Class not found in your school.')
  if (!Array.isArray(items) || items.length === 0) throw new InputError('Select at least one subject.')
  if (items.length > 100) throw new InputError('Too many subjects at once.')

  const subjectIds = items.map((i) => i.subjectId)
  if (new Set(subjectIds).size !== subjectIds.length) throw new InputError('Duplicate subjects are not allowed.')

  const teacherIds = [...new Set(items.map((i) => i.teacherId).filter((t): t is string => Boolean(t)))]
  const [subjects, teachers] = await Promise.all([
    prisma.subject.count({ where: { schoolId, id: { in: subjectIds } } }),
    prisma.teacher.count({ where: { schoolId, id: { in: teacherIds } } }),
  ])
  if (subjects !== subjectIds.length) throw new InputError('One or more subjects are invalid.')
  if (teachers !== teacherIds.length) throw new InputError('One or more teachers are invalid.')
}

// Adds new subject assignments to a class (existing ones are left alone).
export async function saveClassAssignments(classId: string, items: AssignmentInput[]): Promise<Result<{ added: number }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    await validateClassItems(schoolId, classId, items)

    const added = await prisma.$transaction(async (tx) => {
      const existing = new Set(
        (await tx.classSubjectAssignment.findMany({ where: { classId }, select: { subjectId: true } })).map((a) => a.subjectId)
      )
      let count = 0
      for (const item of items) {
        if (existing.has(item.subjectId)) continue
        await tx.classSubjectAssignment.create({
          data: { schoolId, classId, subjectId: item.subjectId, teacherId: item.teacherId || null },
        })
        await tx.class.update({ where: { id: classId }, data: { subjects: { connect: { id: item.subjectId } } } })
        if (item.teacherId) {
          await tx.teacher.update({
            where: { id: item.teacherId },
            data: { classes: { connect: { id: classId } }, subjects: { connect: { id: item.subjectId } } },
          })
        }
        count++
      }
      return count
    })

    refreshPages()
    return { success: true, added }
  } catch (error) {
    return fail(error)
  }
}

// Changes the teacher of one class-subject. Timetable lessons for that
// class and subject move to the new teacher, unless that causes a clash.
export async function changeAssignmentTeacher(
  assignmentId: string,
  teacherId: string | null
): Promise<Result<{ movedLessons: number }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const assignment = await prisma.classSubjectAssignment.findFirst({
      where: { id: assignmentId, schoolId },
      select: { id: true, classId: true, subjectId: true, teacherId: true },
    })
    if (!assignment) throw new InputError('Assignment not found.')
    if ((assignment.teacherId ?? null) === (teacherId || null)) return { success: true, movedLessons: 0 }

    if (teacherId) {
      const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId }, select: { id: true } })
      if (!teacher) throw new InputError('Teacher not found in your school.')
    }

    const moved = await prisma.$transaction(
      async (tx) => {
        const lessons = await tx.timetableSlot.findMany({
          where: { classId: assignment.classId, subjectId: assignment.subjectId, isBreak: false },
          select: { id: true, day: true, startTime: true, endTime: true },
        })

        if (lessons.length && teacherId) {
          const others = await tx.timetableSlot.findMany({
            where: {
              teacherId,
              class: { schoolId },
              id: { notIn: lessons.map((l) => l.id) },
              day: { in: [...new Set(lessons.map((l) => l.day))] },
            },
            select: { day: true, startTime: true, endTime: true, period: true, class: { select: { name: true, section: true } } },
          })
          const clash = lessons
            .map((l) =>
              others.find(
                (o) =>
                  o.day === l.day &&
                  minutes(o.startTime) < minutes(l.endTime) &&
                  minutes(l.startTime) < minutes(o.endTime)
              )
            )
            .find(Boolean)
          if (clash) {
            throw new InputError(
              `The new teacher already teaches Class ${clash.class.name}-${clash.class.section} on ${clash.day} (${clash.period}). Adjust the timetable first.`
            )
          }
        }

        await tx.classSubjectAssignment.update({ where: { id: assignment.id }, data: { teacherId: teacherId || null } })

        let movedCount = 0
        if (lessons.length) {
          const res = await tx.timetableSlot.updateMany({
            where: { id: { in: lessons.map((l) => l.id) } },
            data: { teacherId: teacherId || null },
          })
          movedCount = res.count
        }

        if (teacherId) {
          await tx.teacher.update({
            where: { id: teacherId },
            data: { classes: { connect: { id: assignment.classId } }, subjects: { connect: { id: assignment.subjectId } } },
          })
        }
        if (assignment.teacherId) await pruneTeacherLinks(tx, assignment.teacherId, assignment.classId, assignment.subjectId)

        return movedCount
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    )

    refreshPages()
    return { success: true, movedLessons: moved }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return { success: false, error: 'The timetable changed at the same time. Please try again.' }
    }
    return fail(error)
  }
}

export async function removeClassAssignment(assignmentId: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    await prisma.$transaction(async (tx) => {
      const assignment = await tx.classSubjectAssignment.findFirst({
        where: { id: assignmentId, schoolId },
        select: { id: true, classId: true, subjectId: true, teacherId: true },
      })
      if (!assignment) throw new InputError('Assignment not found.')

      const lessons = await tx.timetableSlot.count({
        where: { classId: assignment.classId, subjectId: assignment.subjectId },
      })
      if (lessons) {
        throw new InputError(
          `This subject has ${lessons} timetable lesson${lessons === 1 ? '' : 's'} in this class. Remove them on the Timetable page first.`
        )
      }

      await tx.classSubjectAssignment.delete({ where: { id: assignment.id } })
      await tx.class.update({ where: { id: assignment.classId }, data: { subjects: { disconnect: { id: assignment.subjectId } } } })
      if (assignment.teacherId) await pruneTeacherLinks(tx, assignment.teacherId, assignment.classId, assignment.subjectId)
    })

    refreshPages()
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

// Copies the subjects (and optionally teachers) of one class to another,
// e.g. 10-A → 10-B. Subjects already in the target class are skipped.
export async function copyClassAssignments(
  fromClassId: string,
  toClassId: string,
  includeTeachers: boolean
): Promise<Result<{ added: number }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    if (fromClassId === toClassId) throw new InputError('Choose a different class to copy from.')

    const source = await prisma.classSubjectAssignment.findMany({
      where: { schoolId, classId: fromClassId },
      select: { subjectId: true, teacherId: true },
    })
    if (!source.length) throw new InputError('That class has no subjects to copy.')

    const items = source.map((s) => ({ subjectId: s.subjectId, teacherId: includeTeachers ? s.teacherId : null }))
    await validateClassItems(schoolId, toClassId, items)
    return await saveClassAssignments(toClassId, items)
  } catch (error) {
    return fail(error)
  }
}
