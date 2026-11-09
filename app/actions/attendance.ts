'use server'

import prisma from '@/lib/prisma'
import { AttendanceStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import {
  accessErrorMessage,
  parseLocalDay,
  requireSchoolAdmin,
} from '@/lib/school-auth'

const STATUSES = Object.values(AttendanceStatus)

function failure(error: unknown, fallback: string) {
  const access = accessErrorMessage(error)
  if (!access) console.error(fallback, error)
  return { success: false as const, error: access ?? fallback }
}

function normalizeSubject(subjectId?: string) {
  return subjectId && subjectId !== 'all' ? subjectId : null
}

// --- STUDENT ATTENDANCE ---

export async function getAttendanceList(
  classId: string,
  fromDateStr: string,
  toDateStr: string,
  subjectId?: string
) {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const fromDate = parseLocalDay(fromDateStr, 'start')
    const toDate = parseLocalDay(toDateStr, 'end')
    if (!fromDate || !toDate || fromDate > toDate) {
      return { success: false as const, error: 'Invalid date range.' }
    }

    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    })
    if (!cls) return { success: false as const, error: 'Class not found in your school.' }

    const subject = normalizeSubject(subjectId)

    const [students, attendanceRecords] = await Promise.all([
      prisma.student.findMany({
        where: { classId, schoolId },
        include: { user: true },
        orderBy: { rollNo: 'asc' },
      }),
      prisma.attendance.findMany({
        where: {
          classId,
          date: { gte: fromDate, lte: toDate },
          subjectId: subject,
        },
      }),
    ])

    const isSingleDay = fromDateStr === toDateStr

    return {
      success: true as const,
      data: students.map((student) => {
        const studentRecords = attendanceRecords.filter((a) => a.studentId === student.id)

        return {
          studentId: student.id,
          name: student.user?.name || 'Unknown',
          rollNo: student.rollNo,
          // For a single day, preload the saved status for the dropdown.
          status: isSingleDay ? studentRecords[0]?.status || 'PRESENT' : 'PRESENT',
          summary: {
            present: studentRecords.filter((r) => r.status === 'PRESENT').length,
            absent: studentRecords.filter((r) => r.status === 'ABSENT').length,
            late: studentRecords.filter((r) => r.status === 'LATE').length,
            excused: studentRecords.filter((r) => r.status === 'EXCUSED').length,
          },
        }
      }),
    }
  } catch (error) {
    return failure(error, 'Failed to fetch students')
  }
}

export async function saveDailyAttendance(
  classId: string,
  dateStr: string,
  records: { studentId: string; status: AttendanceStatus }[],
  subjectId?: string
) {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const day = parseLocalDay(dateStr, 'start')
    const targetDate = parseLocalDay(dateStr, 'noon')
    const dayEnd = parseLocalDay(dateStr, 'end')
    if (!day || !targetDate || !dayEnd) {
      return { success: false as const, error: 'Invalid date.' }
    }

    if (!Array.isArray(records) || records.some((r) => !STATUSES.includes(r.status))) {
      return { success: false as const, error: 'Invalid attendance status.' }
    }

    const subject = normalizeSubject(subjectId)

    const [cls, subjectRow, students] = await Promise.all([
      prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } }),
      subject
        ? prisma.subject.findFirst({ where: { id: subject, schoolId }, select: { id: true } })
        : Promise.resolve({ id: '' }),
      prisma.student.findMany({
        where: { classId, schoolId, id: { in: records.map((r) => r.studentId) } },
        select: { id: true },
      }),
    ])

    if (!cls) return { success: false as const, error: 'Class not found in your school.' }
    if (!subjectRow) return { success: false as const, error: 'Subject not found in your school.' }

    const allowed = new Set(students.map((s) => s.id))
    const valid = records.filter((r) => allowed.has(r.studentId))
    if (valid.length !== records.length) {
      return { success: false as const, error: 'Some students do not belong to this class.' }
    }

    // A NULL subjectId cannot be matched by Postgres unique upserts, so
    // we look up existing rows for that day and update or create explicitly.
    await prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findMany({
        where: {
          classId,
          subjectId: subject,
          date: { gte: day, lte: dayEnd },
          studentId: { in: valid.map((r) => r.studentId) },
        },
        select: { id: true, studentId: true, status: true },
      })
      const byStudent = new Map(existing.map((e) => [e.studentId, e]))

      for (const record of valid) {
        const row = byStudent.get(record.studentId)
        if (row) {
          if (row.status !== record.status) {
            await tx.attendance.update({
              where: { id: row.id },
              data: { status: record.status },
            })
          }
        } else {
          await tx.attendance.create({
            data: {
              date: targetDate,
              status: record.status,
              studentId: record.studentId,
              classId,
              subjectId: subject,
            },
          })
        }
      }
    })

    revalidatePath('/admin/attendance')
    revalidatePath('/admin/reports')
    return { success: true as const }
  } catch (error) {
    return failure(error, 'Failed to save attendance')
  }
}

// --- TEACHER ATTENDANCE ---

export async function getTeacherAttendance(dateStr: string) {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const startOfDay = parseLocalDay(dateStr, 'start')
    const endOfDay = parseLocalDay(dateStr, 'end')
    if (!startOfDay || !endOfDay) return { success: false as const, error: 'Invalid date.' }

    const [teachers, records] = await Promise.all([
      prisma.teacher.findMany({
        where: { schoolId },
        include: { user: true },
        orderBy: { teacherId: 'asc' },
      }),
      prisma.teacherAttendance.findMany({
        where: { schoolId, date: { gte: startOfDay, lte: endOfDay } },
      }),
    ])

    return {
      success: true as const,
      data: teachers.map((teacher) => {
        const record = records.find((r) => r.teacherId === teacher.id)
        return {
          teacherId: teacher.id,
          displayId: teacher.teacherId,
          name: teacher.user?.name || 'Unknown',
          status: record?.status || 'PRESENT',
        }
      }),
    }
  } catch (error) {
    return failure(error, 'Failed to fetch teachers')
  }
}

export async function saveTeacherAttendance(
  dateStr: string,
  records: { teacherId: string; status: AttendanceStatus }[]
) {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const targetDate = parseLocalDay(dateStr, 'noon')
    if (!targetDate) return { success: false as const, error: 'Invalid date.' }

    if (!Array.isArray(records) || records.some((r) => !STATUSES.includes(r.status))) {
      return { success: false as const, error: 'Invalid attendance status.' }
    }

    const teachers = await prisma.teacher.count({
      where: { schoolId, id: { in: records.map((r) => r.teacherId) } },
    })
    if (teachers !== new Set(records.map((r) => r.teacherId)).size) {
      return { success: false as const, error: 'Some teachers do not belong to your school.' }
    }

    await prisma.$transaction(
      records.map((record) =>
        prisma.teacherAttendance.upsert({
          where: { teacherId_date: { teacherId: record.teacherId, date: targetDate } },
          update: { status: record.status },
          create: {
            date: targetDate,
            status: record.status,
            teacherId: record.teacherId,
            schoolId,
          },
        })
      )
    )

    revalidatePath('/admin/attendance')
    revalidatePath('/admin/reports')
    return { success: true as const }
  } catch (error) {
    return failure(error, 'Failed to save teacher attendance')
  }
}
