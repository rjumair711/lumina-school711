'use server'

import { revalidatePath } from 'next/cache'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'

/**
 * 1. Add Student Action
 */
export async function addStudentAction(formData: FormData) {
  try {
    const fullName = formData.get('fullName') as string
    const classId = formData.get('classId') as string
    const rollNumber = formData.get('rollNumber') as string
    const parentName = formData.get('parentName') as string
    const parentPhone = formData.get('parentPhone') as string
    const parentEmail = formData.get('parentEmail') as string
    const address = formData.get('address') as string

    const school = await prisma.school.findFirst()
    if (!school) throw new Error('No school configured in the database.')

    const year = new Date().getFullYear()
    const studentCount = await prisma.student.count()
    const studentId = `STU-${year}-${String(studentCount + 1).padStart(4, '0')}`

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: fullName,
          email: `student.${studentId}@alfiah.edu.in`.toLowerCase(),
          role: Role.STUDENT,
          schoolId: school.id,
        },
      })

      await tx.student.create({
        data: {
          studentId,
          rollNo: rollNumber,
          address: address,
          parentName: parentName,
          parentPhone: parentPhone,
          parentEmail: parentEmail,
          schoolId: school.id,
          classId: classId,
          userId: user.id,
        },
      })
    })

    revalidatePath('/admin/students')
    return { success: true }
  } catch (error) {
    console.error('Failed to add student:', error)
    return { success: false, error: 'Failed to add student to database.' }
  }
}

/**
 * 2. Update Student Action
 */
export async function updateStudentAction(id: string, formData: FormData) {
  try {
    const fullName = formData.get('fullName') as string
    const classId = formData.get('classId') as string
    const rollNumber = formData.get('rollNumber') as string
    const parentName = formData.get('parentName') as string
    const parentPhone = formData.get('parentPhone') as string
    const parentEmail = formData.get('parentEmail') as string
    const address = formData.get('address') as string

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!student) {
      return { success: false, error: 'Student not found.' }
    }

    await prisma.$transaction(async (tx) => {
      if (student.userId) {
        await tx.user.update({
          where: { id: student.userId },
          data: { name: fullName }
        })
      }

      await tx.student.update({
        where: { id },
        data: {
          rollNo: rollNumber,
          address,
          parentName,
          parentPhone,
          parentEmail,
          classId,
        }
      })
    })

    revalidatePath('/admin/students')
    revalidatePath(`/admin/students/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to update student:', error)
    return { success: false, error: 'Failed to update student in database.' }
  }
}

/**
 * 3. Delete Student Action
 */
export async function deleteStudentAction(studentId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return { success: false, error: 'Student not found.' }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete the Student FIRST
      await tx.student.delete({
        where: { id: studentId }
      })

      // 2. Then delete the linked User account
      if (student.userId) {
        await tx.user.delete({
          where: { id: student.userId }
        })
      }
    })

    revalidatePath('/admin/students')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete student:', error)
    return { success: false, error: 'Failed to delete student.' }
  }
}

// --- TEACHERS ---

export async function addTeacherAction(formData: FormData) {
  try {
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const qualification = formData.get('qualification') as string
    const experience = formData.get('experience') as string
    
    // NEW FIELDS
    const subjectId = formData.get('subjectId') as string
    const classIds = formData.getAll('classIds') as string[]

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { success: false, error: `Email ${email} is already in use by another account.` }

    const school = await prisma.school.findFirst()
    if (!school) throw new Error('No school configured in the database.')

    const year = new Date().getFullYear()
    const teacherCount = await prisma.teacher.count()
    const teacherId = `TCH-${year}-${String(teacherCount + 1).padStart(4, '0')}`

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: fullName, email, role: Role.TEACHER, schoolId: school.id },
      })
      await tx.teacher.create({
        data: { 
          teacherId, 
          phone, 
          qualification, 
          experience, 
          schoolId: school.id, 
          userId: user.id,
          subjects: subjectId ? { connect: [{ id: subjectId }] } : undefined,
          classes: classIds.length > 0 ? { connect: classIds.map(id => ({ id })) } : undefined
        },
      })
    })

    revalidatePath('/admin/teachers')
    return { success: true }
  } catch (error: any) {
    console.error('Failed to add teacher:', error)
    if (error.code === 'P2002') return { success: false, error: 'This email is already in use.' }
    return { success: false, error: 'Failed to add teacher to database.' }
  }
}

export async function updateTeacherAction(id: string, formData: FormData) {
  try {
    const fullName = formData.get('fullName') as string
    const phone = formData.get('phone') as string
    const qualification = formData.get('qualification') as string
    const experience = formData.get('experience') as string
    
    // NEW FIELDS
    const subjectId = formData.get('subjectId') as string
    const classIds = formData.getAll('classIds') as string[]

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!teacher) return { success: false, error: 'Teacher not found.' }

    await prisma.$transaction(async (tx) => {
      if (teacher.userId) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: { name: fullName }
        })
      }
      await tx.teacher.update({
        where: { id },
        data: { 
          phone, 
          qualification, 
          experience,
          subjects: subjectId ? { set: [{ id: subjectId }] } : { set: [] },
          classes: { set: classIds.map(id => ({ id })) }
        }
      })
    })

    revalidatePath('/admin/teachers')
    revalidatePath(`/admin/teachers/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Failed to update teacher:', error)
    return { success: false, error: 'Failed to update teacher in database.' }
  }
}

export async function deleteTeacherAction(teacherId: string) {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
    if (!teacher) return { success: false, error: 'Teacher not found.' }

    await prisma.$transaction(async (tx) => {
      await tx.teacher.delete({ where: { id: teacherId } })
      if (teacher.userId) {
        await tx.user.delete({ where: { id: teacher.userId } })
      }
    })

    revalidatePath('/admin/teachers')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete teacher:', error)
    return { success: false, error: 'Failed to delete teacher.' }
  }
}
