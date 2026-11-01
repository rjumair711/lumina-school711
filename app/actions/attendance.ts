'use server'

import prisma from '@/lib/prisma'
import { AttendanceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

// --- STUDENT ATTENDANCE ---
// Replace ONLY the getAttendanceList function in app/actions/attendance.ts

export async function getAttendanceList(classId: string, fromDateStr: string, toDateStr: string, subjectId?: string) {
  try {
    const fromDate = new Date(fromDateStr)
    fromDate.setHours(0, 0, 0, 0)

    const toDate = new Date(toDateStr)
    toDate.setHours(23, 59, 59, 999)

    const students = await prisma.student.findMany({
      where: { classId },
      include: { user: true },
      orderBy: { rollNo: 'asc' }
    })

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId,
        date: { gte: fromDate, lte: toDate },
        ...(subjectId && subjectId !== 'all' ? { subjectId } : { subjectId: null })
      }
    })

    const isSingleDay = fromDateStr === toDateStr;

    return {
      success: true,
      data: students.map(student => {
        const studentRecords = attendanceRecords.filter(a => a.studentId === student.id)

        return {
          studentId: student.id,
          name: student.user?.name || 'Unknown',
          rollNo: student.rollNo,
          // If viewing a single day, load the specific status for the dropdown
          status: isSingleDay ? (studentRecords[0]?.status || 'PRESENT') : 'PRESENT',
          // Calculate summary metrics for the selected date range
          summary: {
            present: studentRecords.filter(r => r.status === 'PRESENT').length,
            absent: studentRecords.filter(r => r.status === 'ABSENT').length,
            late: studentRecords.filter(r => r.status === 'LATE').length,
            excused: studentRecords.filter(r => r.status === 'EXCUSED').length,
          }
        }
      })
    }
  } catch (error) {
    console.error('Error fetching attendance:', error)
    return { success: false, error: 'Failed to fetch students' }
  }
}

export async function saveDailyAttendance(
  classId: string,
  dateStr: string,
  records: { studentId: string; status: AttendanceStatus }[],
  subjectId?: string
) {
  try {
    const targetDate = new Date(dateStr)
    targetDate.setHours(12, 0, 0, 0)

    const operations = records.map(record => {
      const uniqueWhere = subjectId
        ? { studentId_date_subjectId: { studentId: record.studentId, date: targetDate, subjectId } }
        : { studentId_date_subjectId: { studentId: record.studentId, date: targetDate, subjectId: null } }

      return prisma.attendance.upsert({
        where: uniqueWhere as any,
        update: { status: record.status },
        create: {
          date: targetDate,
          status: record.status,
          studentId: record.studentId,
          classId: classId,
          subjectId: subjectId || null
        }
      })
    })

    await prisma.$transaction(operations)
    revalidatePath('/admin/attendance')
    return { success: true }
  } catch (error) {
    console.error('Error saving attendance:', error)
    return { success: false, error: 'Failed to save attendance' }
  }
}

// --- TEACHER ATTENDANCE ---
export async function getTeacherAttendance(schoolId: string, dateStr: string) {
  try {
    const targetDate = new Date(dateStr)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { teacherId: 'asc' }
    })

    const records = await prisma.teacherAttendance.findMany({
      where: { schoolId, date: { gte: startOfDay, lte: endOfDay } }
    })

    return {
      success: true,
      data: teachers.map(teacher => {
        const record = records.find(r => r.teacherId === teacher.id)
        return {
          teacherId: teacher.id,
          displayId: teacher.teacherId,
          name: teacher.user?.name || 'Unknown',
          status: record?.status || 'PRESENT'
        }
      })
    }
  } catch (error) {
    console.error('Error fetching teacher attendance:', error)
    return { success: false, error: 'Failed to fetch teachers' }
  }
}

export async function saveTeacherAttendance(
  schoolId: string,
  dateStr: string,
  records: { teacherId: string; status: AttendanceStatus }[]
) {
  try {
    const targetDate = new Date(dateStr)
    targetDate.setHours(12, 0, 0, 0)

    const operations = records.map(record =>
      prisma.teacherAttendance.upsert({
        where: { teacherId_date: { teacherId: record.teacherId, date: targetDate } },
        update: { status: record.status },
        create: {
          date: targetDate,
          status: record.status,
          teacherId: record.teacherId,
          schoolId: schoolId,
        }
      })
    )

    await prisma.$transaction(operations)
    revalidatePath('/admin/attendance')
    return { success: true }
  } catch (error) {
    console.error('Error saving teacher attendance:', error)
    return { success: false, error: 'Failed to save teacher attendance' }
  }
}