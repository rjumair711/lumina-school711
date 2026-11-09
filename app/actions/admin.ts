'use server'

import { revalidatePath } from 'next/cache'
import { Prisma, Role } from '@prisma/client'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'

type Result = { success: boolean; error?: string }

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? '').trim()

const optional = (value: string) => (value ? value : null)

function fail(error: unknown, fallback: string): Result {
  const access = accessErrorMessage(error)
  if (access) return { success: false, error: access }
  console.error(fallback, error)
  return { success: false, error: fallback }
}

// Next free code for the year, e.g. STU-2026-0008. Based on the highest
// existing code (not a row count) so deleting records never causes clashes.
async function nextCode(
  tx: Prisma.TransactionClient,
  kind: 'STU' | 'TCH'
): Promise<string> {
  const prefix = `${kind}-${new Date().getFullYear()}-`

  const last =
    kind === 'STU'
      ? (
          await tx.student.findFirst({
            where: { studentId: { startsWith: prefix } },
            orderBy: { studentId: 'desc' },
            select: { studentId: true },
          })
        )?.studentId
      : (
          await tx.teacher.findFirst({
            where: { teacherId: { startsWith: prefix } },
            orderBy: { teacherId: 'desc' },
            select: { teacherId: true },
          })
        )?.teacherId

  const n = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1
  return `${prefix}${String(Number.isFinite(n) ? n : 1).padStart(4, '0')}`
}

// Retry a create when two admins generate the same code at once.
async function withCodeRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const isCodeClash =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        JSON.stringify(error.meta ?? {}).match(/studentId|teacherId/)
      if (!isCodeClash || attempt >= 3) throw error
    }
  }
}

async function classInSchool(classId: string, schoolId: string) {
  if (!classId) return false
  const found = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true },
  })
  return Boolean(found)
}

// ------------------------------------------------------------------
// STUDENTS
// ------------------------------------------------------------------

export async function addStudentAction(formData: FormData): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const fullName = text(formData, 'fullName')
    const classId = text(formData, 'classId')

    if (!fullName) return { success: false, error: 'Student name is required.' }
    if (!(await classInSchool(classId, schoolId))) {
      return { success: false, error: 'Select a class from your school.' }
    }

    await withCodeRetry(() =>
      prisma.$transaction(async (tx) => {
        const studentId = await nextCode(tx, 'STU')

        const user = await tx.user.create({
          data: {
            name: fullName,
            // Placeholder login id; students do not sign in yet.
            email: `${studentId.toLowerCase()}@students.lumina.local`,
            role: Role.STUDENT,
            schoolId,
          },
        })

        await tx.student.create({
          data: {
            studentId,
            rollNo: optional(text(formData, 'rollNumber')),
            address: optional(text(formData, 'address')),
            parentName: optional(text(formData, 'parentName')),
            parentPhone: optional(text(formData, 'parentPhone')),
            parentEmail: optional(text(formData, 'parentEmail')),
            schoolId,
            classId,
            userId: user.id,
          },
        })
      })
    )

    revalidatePath('/admin/students')
    return { success: true }
  } catch (error) {
    return fail(error, 'Failed to add student to database.')
  }
}

export async function updateStudentAction(id: string, formData: FormData): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const fullName = text(formData, 'fullName')
    const classId = text(formData, 'classId')

    if (!fullName) return { success: false, error: 'Student name is required.' }

    const student = await prisma.student.findFirst({
      where: { id, schoolId },
      select: { id: true, userId: true },
    })
    if (!student) return { success: false, error: 'Student not found.' }

    if (!(await classInSchool(classId, schoolId))) {
      return { success: false, error: 'Select a class from your school.' }
    }

    await prisma.$transaction(async (tx) => {
      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: { name: fullName },
        })
      }

      await tx.student.update({
        where: { id: student.id },
        data: {
          rollNo: optional(text(formData, 'rollNumber')),
          address: optional(text(formData, 'address')),
          parentName: optional(text(formData, 'parentName')),
          parentPhone: optional(text(formData, 'parentPhone')),
          parentEmail: optional(text(formData, 'parentEmail')),
          classId,
        },
      })
    })

    revalidatePath('/admin/students')
    revalidatePath(`/admin/students/${id}`)
    return { success: true }
  } catch (error) {
    return fail(error, 'Failed to update student in database.')
  }
}

export async function deleteStudentAction(studentId: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, userId: true },
    })
    if (!student) return { success: false, error: 'Student not found.' }

    await prisma.$transaction(async (tx) => {
      await tx.student.delete({ where: { id: student.id } })
      if (student.userId) {
        await tx.user.delete({ where: { id: student.userId } })
      }
    })

    revalidatePath('/admin/students')
    return { success: true }
  } catch (error) {
    return fail(error, 'Failed to delete student.')
  }
}

// ------------------------------------------------------------------
// TEACHERS
// ------------------------------------------------------------------

async function validTeacherLinks(
  schoolId: string,
  subjectId: string,
  classIds: string[]
) {
  const [subject, classCount] = await Promise.all([
    subjectId
      ? prisma.subject.findFirst({ where: { id: subjectId, schoolId }, select: { id: true } })
      : Promise.resolve({ id: '' }),
    classIds.length
      ? prisma.class.count({ where: { id: { in: classIds }, schoolId } })
      : Promise.resolve(0),
  ])

  return Boolean(subject) && classCount === classIds.length
}

export async function addTeacherAction(formData: FormData): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const fullName = text(formData, 'fullName')
    const email = text(formData, 'email').toLowerCase()
    const subjectId = text(formData, 'subjectId')
    const classIds = [...new Set(formData.getAll('classIds').map(String).filter(Boolean))]

    if (!fullName || !email) {
      return { success: false, error: 'Name and email are required.' }
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return { success: false, error: `Email ${email} is already in use by another account.` }
    }

    if (!(await validTeacherLinks(schoolId, subjectId, classIds))) {
      return { success: false, error: 'Selected subject or classes do not belong to your school.' }
    }

    await withCodeRetry(() =>
      prisma.$transaction(async (tx) => {
        const teacherId = await nextCode(tx, 'TCH')

        const user = await tx.user.create({
          data: { name: fullName, email, role: Role.TEACHER, schoolId },
        })

        await tx.teacher.create({
          data: {
            teacherId,
            phone: optional(text(formData, 'phone')),
            qualification: optional(text(formData, 'qualification')),
            experience: optional(text(formData, 'experience')),
            schoolId,
            userId: user.id,
            subjects: subjectId ? { connect: [{ id: subjectId }] } : undefined,
            classes: classIds.length ? { connect: classIds.map((id) => ({ id })) } : undefined,
          },
        })
      })
    )

    revalidatePath('/admin/teachers')
    return { success: true }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { success: false, error: 'This email is already in use.' }
    }
    return fail(error, 'Failed to add teacher to database.')
  }
}

export async function updateTeacherAction(id: string, formData: FormData): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const fullName = text(formData, 'fullName')
    const subjectId = text(formData, 'subjectId')
    const classIds = [...new Set(formData.getAll('classIds').map(String).filter(Boolean))]

    if (!fullName) return { success: false, error: 'Teacher name is required.' }

    const teacher = await prisma.teacher.findFirst({
      where: { id, schoolId },
      select: { id: true, userId: true },
    })
    if (!teacher) return { success: false, error: 'Teacher not found.' }

    if (!(await validTeacherLinks(schoolId, subjectId, classIds))) {
      return { success: false, error: 'Selected subject or classes do not belong to your school.' }
    }

    await prisma.$transaction(async (tx) => {
      if (teacher.userId) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: { name: fullName },
        })
      }

      await tx.teacher.update({
        where: { id: teacher.id },
        data: {
          phone: optional(text(formData, 'phone')),
          qualification: optional(text(formData, 'qualification')),
          experience: optional(text(formData, 'experience')),
          subjects: subjectId ? { set: [{ id: subjectId }] } : { set: [] },
          classes: { set: classIds.map((classId) => ({ id: classId })) },
        },
      })
    })

    revalidatePath('/admin/teachers')
    revalidatePath(`/admin/teachers/${id}`)
    return { success: true }
  } catch (error) {
    return fail(error, 'Failed to update teacher in database.')
  }
}

export async function deleteTeacherAction(teacherId: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      select: { id: true, userId: true },
    })
    if (!teacher) return { success: false, error: 'Teacher not found.' }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.delete({ where: { id: teacher.id } })
      if (teacher.userId) {
        await tx.user.delete({ where: { id: teacher.userId } })
      }
    })

    revalidatePath('/admin/teachers')
    return { success: true }
  } catch (error) {
    return fail(error, 'Failed to delete teacher. They may still have homework or messages linked to them.')
  }
}

// ------------------------------------------------------------------
// CLASSES
// ------------------------------------------------------------------

async function readClassForm(formData: FormData, schoolId: string) {
  const name = text(formData, 'name')
  const section = text(formData, 'section').toUpperCase()
  const capacity = parseInt(text(formData, 'capacity'), 10)
  const classTeacherId = text(formData, 'classTeacherId') || null

  if (!name || !section) return { error: 'Class name and section are required.' } as const
  if (name.length > 30 || section.length > 10) return { error: 'Class name or section is too long.' } as const

  if (classTeacherId) {
    const teacher = await prisma.teacher.findFirst({
      where: { id: classTeacherId, schoolId },
      select: { id: true },
    })
    if (!teacher) return { error: 'Class teacher not found in your school.' } as const
  }

  return {
    data: {
      name,
      section,
      capacity: Number.isFinite(capacity) && capacity > 0 && capacity <= 500 ? capacity : 30,
      classTeacherId,
    },
  } as const
}

export async function addClassAction(formData: FormData): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const parsed = await readClassForm(formData, schoolId)
    if ('error' in parsed) return { success: false, error: parsed.error }

    const { name, section } = parsed.data
    const existing = await prisma.class.findFirst({
      where: { name, section, schoolId },
      select: { id: true },
    })
    if (existing) return { success: false, error: `Class ${name}-${section} already exists.` }

    await prisma.class.create({ data: { ...parsed.data, schoolId } })

    revalidatePath('/admin/classes')
    return { success: true }
  } catch (error) {
    return fail(error, 'Failed to add class to database.')
  }
}

export async function updateClassAction(id: string, formData: FormData): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const parsed = await readClassForm(formData, schoolId)
    if ('error' in parsed) return { success: false, error: parsed.error }

    const { name, section } = parsed.data
    const duplicate = await prisma.class.findFirst({
      where: { name, section, schoolId, id: { not: id } },
      select: { id: true },
    })
    if (duplicate) return { success: false, error: `Class ${name}-${section} already exists.` }

    const result = await prisma.class.updateMany({
      where: { id, schoolId },
      data: parsed.data,
    })
    if (result.count === 0) return { success: false, error: 'Class not found.' }

    revalidatePath('/admin/classes')
    revalidatePath(`/admin/classes/${id}`)
    return { success: true }
  } catch (error) {
    return fail(error, 'Failed to update class.')
  }
}

export async function deleteClassAction(id: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const classData = await prisma.class.findFirst({
      where: { id, schoolId },
      include: { _count: { select: { students: true } } },
    })

    if (!classData) return { success: false, error: 'Class not found.' }

    // Guardrail: do not delete if students are still enrolled.
    if (classData._count.students > 0) {
      return {
        success: false,
        error: `Cannot delete class. Reassign or remove the ${classData._count.students} enrolled students first.`,
      }
    }

    await prisma.class.delete({ where: { id: classData.id } })

    revalidatePath('/admin/classes')
    return { success: true }
  } catch (error) {
    return fail(error, 'Failed to delete class.')
  }
}
