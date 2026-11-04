
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { AssignmentStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

type ActionResult =
  | { ok: true }
  | { ok: false; error: string }

type CreateHomeworkInput = {
  title: string
  description?: string
  dueDate: string
  classId: string
  subjectId: string
  teacherId: string
  status: AssignmentStatus
}

// Authenticate against the database rather than
// trusting a school ID submitted by the client.
async function requireSchoolAdmin(): Promise<string> {
  const session = await auth()
  const email = session?.user?.email

  if (!email) {
    throw new Error('Please sign in again.')
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      schoolId: true,
    },
  })

  if (!user?.schoolId || user.role !== Role.ADMIN) {
    throw new Error(
      'You are not allowed to manage homework.'
    )
  }

  return user.schoolId
}

// DATABASE DATA FOR HOMEWORK DASHBOARD
export async function getHomeworkDashboardData() {
  const schoolId = await requireSchoolAdmin()

  const [homeworks, classes, assignments] =
    await Promise.all([
      prisma.homework.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        include: {
          class: {
            select: {
              name: true,
              section: true,
            },
          },
          subject: {
            select: { name: true },
          },
          teacher: {
            select: {
              teacherId: true,
              user: {
                select: { name: true },
              },
            },
          },
        },
      }),

      prisma.class.findMany({
        where: { schoolId },
        orderBy: [
          { name: 'asc' },
          { section: 'asc' },
        ],
        select: {
          id: true,
          name: true,
          section: true,
          _count: {
            select: { students: true },
          },
        },
      }),

      prisma.classSubjectAssignment.findMany({
        where: {
          schoolId,
          class: { schoolId },
          subject: { schoolId },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          teacher: {
            select: {
              id: true,
              teacherId: true,
              schoolId: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ])

  const validAssignments = assignments.filter(
    (assignment) =>
      !assignment.teacher ||
      assignment.teacher.schoolId === schoolId
  )

  if (process.env.NODE_ENV === 'development') {
    console.log('[Lumina Homework]', {
      classes: classes.map((c) => ({
        id: c.id,
        name: `${c.name}-${c.section}`,
      })),
      assignments: validAssignments.map((a) => ({
        classId: a.classId,
        subject: a.subject.name,
        teacherId: a.teacherId,
        teacherName: a.teacher?.user?.name ?? null,
      })),
    })
  }

  return {
    homeworks: homeworks.map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      dueDate: h.dueDate.toISOString(),
      status: h.status,
      createdAt: h.createdAt.toISOString(),

      classId: h.classId,
      subjectId: h.subjectId,
      teacherId: h.teacherId,

      className:
        `Class ${h.class.name}-${h.class.section}`,

      subjectName: h.subject.name,

      teacherName:
        h.teacher.user?.name ||
        h.teacher.teacherId,
    })),

    classes: classes.map((c) => ({
      id: c.id,
      name: `Class ${c.name}-${c.section}`,
      studentCount: c._count.students,
    })),

    assignments: validAssignments.map((a) => ({
      id: a.id,
      classId: a.classId,
      subjectId: a.subjectId,
      subjectName: a.subject.name,
      subjectCode: a.subject.code,

      teacherId: a.teacherId,
      teacherName:
        a.teacher?.user?.name ||
        a.teacher?.teacherId ||
        'Not assigned',
    })),
  }
}

// CREATE HOMEWORK
export async function createHomework(
  input: CreateHomeworkInput
): Promise<ActionResult> {
  try {
    const schoolId = await requireSchoolAdmin()

    const title = input.title?.trim()
    const description = input.description?.trim() || ''

    if (!title || title.length > 200) {
      return {
        ok: false,
        error: 'Title must be between 1 and 200 characters.',
      }
    }

    if (description.length > 10000) {
      return {
        ok: false,
        error: 'Instructions are too long.',
      }
    }

    if (
      !input.classId ||
      !input.subjectId ||
      !input.teacherId
    ) {
      return {
        ok: false,
        error: 'Please select a class, subject and teacher.',
      }
    }

    if (
      !Object.values(AssignmentStatus).includes(
        input.status
      )
    ) {
      return {
        ok: false,
        error: 'Invalid homework status.',
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
      return {
        ok: false,
        error: 'Please enter a valid due date.',
      }
    }

    const dueDate = new Date(
      `${input.dueDate}T12:00:00.000Z`
    )

    if (
      Number.isNaN(dueDate.getTime()) ||
      dueDate.toISOString().slice(0, 10) !== input.dueDate
    ) {
      return {
        ok: false,
        error: 'Invalid due date.',
      }
    }

    const assignment =
      await prisma.classSubjectAssignment.findFirst({
        where: {
          schoolId,
          classId: input.classId,
          subjectId: input.subjectId,
          teacherId: input.teacherId,

          class: { schoolId },
          subject: { schoolId },
          teacher: { schoolId },
        },

        select: {
          classId: true,
          subjectId: true,
          teacherId: true,
        },
      })

    if (!assignment || !assignment.teacherId) {
      return {
        ok: false,
        error:
          'This class, subject and teacher combination is not assigned. Check Subject & Class Assignment first.',
      }
    }

    await prisma.homework.create({
      data: {
        schoolId,
        classId: assignment.classId,
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        title,
        description: description || null,
        dueDate,
        status: input.status,
      },
    })

    revalidatePath('/admin/homework')

    return { ok: true }
  } catch (error) {
    console.error('Create homework failed:', error)

    return {
      ok: false,
      error: 'Unable to create homework assignment.',
    }
  }
}

// DELETE HOMEWORK
export async function deleteHomework(
  id: string
): Promise<ActionResult> {
  try {
    const schoolId = await requireSchoolAdmin()

    const result = await prisma.homework.deleteMany({
      where: {
        id,
        schoolId,
      },
    })

    if (result.count === 0) {
      return {
        ok: false,
        error: 'Assignment not found.',
      }
    }

    revalidatePath('/admin/homework')

    return { ok: true }
  } catch (error) {
    console.error('Delete homework failed:', error)

    return {
      ok: false,
      error: 'Unable to delete homework.',
    }
  }
}

// UPDATE HOMEWORK STATUS
export async function updateHomeworkStatus(
  id: string,
  status: AssignmentStatus
): Promise<ActionResult> {
  try {
    const schoolId = await requireSchoolAdmin()

    if (
      !Object.values(AssignmentStatus).includes(status)
    ) {
      return {
        ok: false,
        error: 'Invalid homework status.',
      }
    }

    const result = await prisma.homework.updateMany({
      where: {
        id,
        schoolId,
      },
      data: { status },
    })

    if (result.count === 0) {
      return {
        ok: false,
        error: 'Assignment not found.',
      }
    }

    revalidatePath('/admin/homework')

    return { ok: true }
  } catch (error) {
    console.error('Update homework failed:', error)

    return {
      ok: false,
      error: 'Unable to update homework status.',
    }
  }
}
