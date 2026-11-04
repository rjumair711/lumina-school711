
'use server'

import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

type Result = {
  success: boolean
  error?: string
}

type SubjectInput = {
  name: string
  code: string
  description: string
}

type AssignmentInput = {
  subjectId: string
  teacherId: string | null
}

async function adminSchoolId(): Promise<string> {
  const session = await auth()

  const user = session?.user as
    | { role?: Role; schoolId?: string | null }
    | undefined

  if (!user?.schoolId || user.role !== Role.ADMIN) {
    throw new Error('Unauthorized school administrator.')
  }

  return user.schoolId
}

function errorMessage(error: unknown): string {
  console.error('Subject-class operation failed:', error)

  if (error instanceof Error) {
    if (error.message === 'Unauthorized school administrator.') {
      return error.message
    }
  }

  return 'Operation failed. Please try again.'
}

function refreshPages() {
  revalidatePath('/admin/subject-class')
  revalidatePath('/admin/classes')
  revalidatePath('/admin/teachers')
  revalidatePath('/admin/homework')
}

export async function getSubjectClassData() {
  const schoolId = await adminSchoolId()

  const [subjects, classes, teachers, assignments] =
    await Promise.all([
      prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          _count: {
            select: {
              subjectAssignments: true,
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
          capacity: true,
        },
      }),

      prisma.teacher.findMany({
        where: { schoolId },
        orderBy: { teacherId: 'asc' },
        select: {
          id: true,
          teacherId: true,
          user: {
            select: { name: true },
          },
        },
      }),

      prisma.classSubjectAssignment.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          classId: true,
          subjectId: true,
          teacherId: true,
          createdAt: true,
        },
      }),
    ])

  return {
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      description: s.description ?? '',
      classCount: s._count.subjectAssignments,
    })),

    classes: classes.map((c) => ({
      ...c,
      displayName: `${c.name} - ${c.section}`,
    })),

    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.user?.name || t.teacherId,
      teacherId: t.teacherId,
    })),

    assignments: assignments.map((a) => ({
      id: a.id,
      classId: a.classId,
      subjectId: a.subjectId,
      teacherId: a.teacherId,
      createdAt: a.createdAt.toISOString(),
    })),
  }
}

export async function saveSubject(
  input: SubjectInput,
  id?: string
): Promise<Result> {
  try {
    const schoolId = await adminSchoolId()

    const name = input.name.trim()
    const code = input.code.trim().toUpperCase()
    const description = input.description.trim()

    if (!name || !code) {
      return {
        success: false,
        error: 'Subject name and code are required.',
      }
    }

    if (name.length > 100 || code.length > 30) {
      return {
        success: false,
        error: 'Subject name or code is too long.',
      }
    }

    if (description.length > 1000) {
      return {
        success: false,
        error: 'Description is too long.',
      }
    }

    const duplicate = await prisma.subject.findFirst({
      where: {
        schoolId,
        code,
        ...(id ? { id: { not: id } } : {}),
      },
    })

    if (duplicate) {
      return {
        success: false,
        error: 'A subject with this code already exists.',
      }
    }

    if (id) {
      const result = await prisma.subject.updateMany({
        where: { id, schoolId },
        data: { name, code, description },
      })

      if (result.count === 0) {
        return {
          success: false,
          error: 'Subject not found.',
        }
      }
    } else {
      await prisma.subject.create({
        data: {
          schoolId,
          name,
          code,
          description,
        },
      })
    }

    refreshPages()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error),
    }
  }
}

export async function deleteSubject(
  id: string
): Promise<Result> {
  try {
    const schoolId = await adminSchoolId()

    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
      include: {
        _count: {
          select: {
            subjectAssignments: true,
            homeworks: true,
            tests: true,
            timetables: true,
            studyMaterials: true,
            attendances: true,
          },
        },
      },
    })

    if (!subject) {
      return {
        success: false,
        error: 'Subject not found.',
      }
    }

    if (
      Object.values(subject._count).some(
        (count) => count > 0
      )
    ) {
      return {
        success: false,
        error:
          'This subject is in use. Remove its assignments and related academic records before deleting it.',
      }
    }

    const result = await prisma.subject.deleteMany({
      where: { id, schoolId },
    })

    if (result.count === 0) {
      return {
        success: false,
        error: 'Subject not found.',
      }
    }

    refreshPages()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error),
    }
  }
}

export async function saveClassAssignments(
  classId: string,
  items: AssignmentInput[]
): Promise<Result> {
  try {
    const schoolId = await adminSchoolId()

    const classRecord = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    })

    if (!classRecord) {
      return {
        success: false,
        error: 'Class not found in your school.',
      }
    }

    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        error: 'Select at least one subject.',
      }
    }

    const subjectIds = items.map((i) => i.subjectId)

    if (new Set(subjectIds).size !== subjectIds.length) {
      return {
        success: false,
        error: 'Duplicate subjects are not allowed.',
      }
    }

    const teacherIds = [
      ...new Set(
        items
          .map((i) => i.teacherId)
          .filter((id): id is string => Boolean(id))
      ),
    ]

    const [subjects, teachers] = await Promise.all([
      prisma.subject.findMany({
        where: {
          schoolId,
          id: { in: subjectIds },
        },
        select: { id: true },
      }),

      prisma.teacher.findMany({
        where: {
          schoolId,
          id: { in: teacherIds },
        },
        select: { id: true },
      }),
    ])

    if (subjects.length !== subjectIds.length) {
      return {
        success: false,
        error: 'One or more subjects are invalid.',
      }
    }

    if (teachers.length !== teacherIds.length) {
      return {
        success: false,
        error: 'One or more teachers are invalid.',
      }
    }

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.classSubjectAssignment.upsert({
          where: {
            classId_subjectId: {
              classId,
              subjectId: item.subjectId,
            },
          },
          create: {
            schoolId,
            classId,
            subjectId: item.subjectId,
            teacherId: item.teacherId || null,
          },
          update: {
            teacherId: item.teacherId || null,
          },
        })

        // Maintain existing implicit relationships.
        await tx.class.update({
          where: { id: classId },
          data: {
            subjects: {
              connect: { id: item.subjectId },
            },
          },
        })

        if (item.teacherId) {
          await tx.teacher.update({
            where: { id: item.teacherId },
            data: {
              classes: {
                connect: { id: classId },
              },
              subjects: {
                connect: { id: item.subjectId },
              },
            },
          })
        }
      }
    })

    refreshPages()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error),
    }
  }
}

export async function removeClassAssignment(
  assignmentId: string
): Promise<Result> {
  try {
    const schoolId = await adminSchoolId()

    const result = await prisma.$transaction(async (tx) => {
      const assignment =
        await tx.classSubjectAssignment.findFirst({
          where: {
            id: assignmentId,
            schoolId,
          },
          select: {
            id: true,
            classId: true,
            subjectId: true,
          },
        })

      if (!assignment) return false

      await tx.classSubjectAssignment.delete({
        where: { id: assignment.id },
      })

      // The old implicit class-subject link is also
      // removed, so future checks do not see it as assigned.
      await tx.class.update({
        where: { id: assignment.classId },
        data: {
          subjects: {
            disconnect: { id: assignment.subjectId },
          },
        },
      })

      return true
    })

    if (!result) {
      return {
        success: false,
        error: 'Assignment not found.',
      }
    }

    refreshPages()
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: errorMessage(error),
    }
  }
}
