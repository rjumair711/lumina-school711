
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Role, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const DAYS = [
    'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday',
] as const

type ActionResult =
    | { success: true }
    | { success: false; error: string }

type PeriodInput = {
    name: string
    startTime: string
    endTime: string
    isBreak: boolean
    sortOrder: number
}

type LessonInput = {
    classId: string
    day: string
    period: string
    subjectId: string
    teacherId: string
}

async function getSchoolId(): Promise<string> {
    const session = await auth()
    const email = session?.user?.email

    if (!email) throw new Error('Please sign in.')

    const user = await prisma.user.findUnique({
        where: { email },
        select: { role: true, schoolId: true },
    })

    if (!user?.schoolId || user.role !== Role.ADMIN) {
        throw new Error('Administrator access required.')
    }

    return user.schoolId
}

function validTime(value: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function minutes(time: string) {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

function overlaps(
    aStart: string,
    aEnd: string,
    bStart: string,
    bEnd: string
) {
    return (
        minutes(aStart) < minutes(bEnd) &&
        minutes(bStart) < minutes(aEnd)
    )
}

function errorResult(error: unknown): ActionResult {
    console.error('[Timetable]', error)

    if (error instanceof Error) {
        if (
            error.message === 'Administrator access required.' ||
            error.message === 'Please sign in.'
        ) {
            return { success: false, error: error.message }
        }
    }

    if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
    ) {
        return {
            success: false,
            error: 'Schedule changed concurrently. Please retry.',
        }
    }

    return {
        success: false,
        error: 'Database operation failed. Please try again.',
    }
}

function refresh() {
    revalidatePath('/admin/timetable')
}

export async function getTimetableData() {
    const schoolId = await getSchoolId()

    const [classes, periods, assignments, slots] =
        await Promise.all([
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
                },
            }),

            prisma.schoolPeriod.findMany({
                where: { schoolId },
                orderBy: [
                    { sortOrder: 'asc' },
                    { startTime: 'asc' },
                ],
            }),

            prisma.classSubjectAssignment.findMany({
                where: {
                    schoolId,
                    class: { schoolId },
                    subject: { schoolId },
                },
                select: {
                    id: true,
                    classId: true,
                    subjectId: true,
                    teacherId: true,
                    subject: {
                        select: {
                            name: true,
                            code: true,
                        },
                    },
                    teacher: {
                        select: {
                            schoolId: true,
                            user: {
                                select: { name: true },
                            },
                            teacherId: true,
                        },
                    },
                },
            }),

            prisma.timetableSlot.findMany({
                where: {
                    class: { schoolId },
                },
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
        ])

    return {
        classes: classes.map((c) => ({
            id: c.id,
            name: c.name,
            section: c.section,
            displayName: `Class ${c.name}-${c.section}`,
        })),

        periods: periods.map((p) => ({
            id: p.id,
            name: p.name,
            startTime: p.startTime,
            endTime: p.endTime,
            sortOrder: p.sortOrder,
            isBreak: p.isBreak,
        })),

        assignments: assignments
            .filter(
                (a) =>
                    !a.teacher ||
                    a.teacher.schoolId === schoolId
            )
            .map((a) => ({
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

        slots: slots.map((s) => ({
            id: s.id,
            classId: s.classId,
            className:
                `Class ${s.class.name}-${s.class.section}`,
            day: s.day,
            period: s.period,
            startTime: s.startTime,
            endTime: s.endTime,
            isBreak: s.isBreak,
            subjectId: s.subjectId,
            teacherId: s.teacherId,
            subjectName: s.subject?.name || '',
            teacherName:
                s.teacher?.user?.name ||
                s.teacher?.teacherId ||
                '',
        })),
    }
}

// CREATE OR UPDATE SCHOOL PERIOD
export async function saveSchoolPeriod(
    input: PeriodInput,
    id?: string
): Promise<ActionResult> {
    try {
        const schoolId = await getSchoolId()
        const name = input.name?.trim()

        if (!name || name.length > 60) {
            return {
                success: false,
                error: 'Period name must be 1–60 characters.',
            }
        }

        if (
            !validTime(input.startTime) ||
            !validTime(input.endTime) ||
            minutes(input.startTime) >= minutes(input.endTime)
        ) {
            return {
                success: false,
                error: 'Enter a valid start and end time.',
            }
        }

        if (
            !Number.isInteger(input.sortOrder) ||
            input.sortOrder < 0 ||
            input.sortOrder > 100
        ) {
            return {
                success: false,
                error: 'Invalid period order.',
            }
        }

        await prisma.$transaction(
            async (tx) => {
                const existing = id
                    ? await tx.schoolPeriod.findFirst({
                        where: { id, schoolId },
                    })
                    : null

                if (id && !existing) {
                    throw new Error('PERIOD_NOT_FOUND')
                }

                const allPeriods =
                    await tx.schoolPeriod.findMany({
                        where: { schoolId },
                    })

                const duplicate = allPeriods.find(
                    (p) =>
                        p.id !== id &&
                        p.name.toLowerCase() === name.toLowerCase()
                )

                if (duplicate) {
                    throw new Error('DUPLICATE_PERIOD')
                }

                const timeConflict = allPeriods.some(
                    (p) =>
                        p.id !== id &&
                        overlaps(
                            input.startTime,
                            input.endTime,
                            p.startTime,
                            p.endTime
                        )
                )

                if (timeConflict) {
                    throw new Error('PERIOD_OVERLAP')
                }

                // Do not silently alter scheduled lessons.
                if (existing) {
                    const used = await tx.timetableSlot.count({
                        where: {
                            class: { schoolId },
                            period: existing.name,
                        },
                    })

                    if (
                        used > 0 &&
                        (
                            name !== existing.name ||
                            input.startTime !== existing.startTime ||
                            input.endTime !== existing.endTime ||
                            input.isBreak !== existing.isBreak
                        )
                    ) {
                        throw new Error('PERIOD_IN_USE')
                    }
                }

                const data = {
                    name,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    sortOrder: input.sortOrder,
                    isBreak: input.isBreak,
                }

                if (existing) {
                    await tx.schoolPeriod.update({
                        where: { id: existing.id },
                        data,
                    })
                } else {
                    await tx.schoolPeriod.create({
                        data: { ...data, schoolId },
                    })
                }
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        )

        refresh()
        return { success: true }
    } catch (error) {
        if (error instanceof Error) {
            const messages: Record<string, string> = {
                PERIOD_NOT_FOUND: 'Period not found.',
                DUPLICATE_PERIOD: 'A period with this name already exists.',
                PERIOD_OVERLAP: 'Period times cannot overlap.',
                PERIOD_IN_USE:
                    'This period has scheduled lessons. Remove those lessons before changing its name, time or type.',
            }

            if (messages[error.message]) {
                return {
                    success: false,
                    error: messages[error.message],
                }
            }
        }

        return errorResult(error)
    }
}

// DELETE SCHOOL PERIOD
export async function deleteSchoolPeriod(
    id: string
): Promise<ActionResult> {
    try {
        const schoolId = await getSchoolId()

        const period = await prisma.schoolPeriod.findFirst({
            where: { id, schoolId },
        })

        if (!period) {
            return { success: false, error: 'Period not found.' }
        }

        const used = await prisma.timetableSlot.count({
            where: {
                class: { schoolId },
                period: period.name,
            },
        })

        if (used > 0) {
            return {
                success: false,
                error: 'Remove scheduled lessons before deleting this period.',
            }
        }

        await prisma.schoolPeriod.deleteMany({
            where: { id, schoolId },
        })

        refresh()
        return { success: true }
    } catch (error) {
        return errorResult(error)
    }
}

// CREATE OR UPDATE LESSON
export async function saveTimetableLesson(
    input: LessonInput,
    existingId?: string
): Promise<ActionResult> {
    try {
        const schoolId = await getSchoolId()

        if (!DAYS.includes(input.day as typeof DAYS[number])) {
            return {
                success: false,
                error: 'Invalid timetable day.',
            }
        }

        if (
            !input.classId ||
            !input.subjectId ||
            !input.teacherId ||
            !input.period
        ) {
            return {
                success: false,
                error: 'Class, subject, teacher and period are required.',
            }
        }

        await prisma.$transaction(
            async (tx) => {
                const [classRecord, period, assignment] =
                    await Promise.all([
                        tx.class.findFirst({
                            where: {
                                id: input.classId,
                                schoolId,
                            },
                        }),

                        tx.schoolPeriod.findFirst({
                            where: {
                                schoolId,
                                name: input.period,
                            },
                        }),

                        tx.classSubjectAssignment.findFirst({
                            where: {
                                schoolId,
                                classId: input.classId,
                                subjectId: input.subjectId,
                                teacherId: input.teacherId,
                                class: { schoolId },
                                subject: { schoolId },
                                teacher: { schoolId },
                            },
                        }),
                    ])

                if (!classRecord) throw new Error('INVALID_CLASS')
                if (!period) throw new Error('INVALID_PERIOD')
                if (period.isBreak) throw new Error('BREAK_PERIOD')
                if (!assignment) throw new Error('INVALID_ASSIGNMENT')

                if (existingId) {
                    const existing =
                        await tx.timetableSlot.findFirst({
                            where: {
                                id: existingId,
                                class: { schoolId },
                            },
                        })

                    if (!existing) throw new Error('LESSON_NOT_FOUND')
                }

                const sameDaySlots =
                    await tx.timetableSlot.findMany({
                        where: {
                            day: input.day,
                            class: { schoolId },
                            ...(existingId
                                ? { id: { not: existingId } }
                                : {}),
                        },
                    })

                const classConflict = sameDaySlots.some(
                    (s) =>
                        s.classId === input.classId &&
                        overlaps(
                            s.startTime,
                            s.endTime,
                            period.startTime,
                            period.endTime
                        )
                )

                if (classConflict) {
                    throw new Error('CLASS_CONFLICT')
                }

                const teacherConflict = sameDaySlots.some(
                    (s) =>
                        s.teacherId === input.teacherId &&
                        overlaps(
                            s.startTime,
                            s.endTime,
                            period.startTime,
                            period.endTime
                        )
                )

                if (teacherConflict) {
                    throw new Error('TEACHER_CONFLICT')
                }

                const data = {
                    day: input.day,
                    period: period.name,
                    startTime: period.startTime,
                    endTime: period.endTime,
                    isBreak: false,
                    classId: input.classId,
                    subjectId: input.subjectId,
                    teacherId: input.teacherId,
                }

                if (existingId) {
                    await tx.timetableSlot.update({
                        where: { id: existingId },
                        data,
                    })
                } else {
                    await tx.timetableSlot.create({ data })
                }
            },
            {
                isolationLevel:
                    Prisma.TransactionIsolationLevel.Serializable,
            }
        )

        refresh()
        return { success: true }
    } catch (error) {
        if (error instanceof Error) {
            const messages: Record<string, string> = {
                INVALID_CLASS: 'Class not found in your school.',
                INVALID_PERIOD: 'School period not found.',
                BREAK_PERIOD: 'Cannot schedule a lesson during a break.',
                INVALID_ASSIGNMENT:
                    'Assign this subject and teacher to the class first.',
                LESSON_NOT_FOUND: 'Lesson not found.',
                CLASS_CONFLICT:
                    'This class already has a lesson at that time.',
                TEACHER_CONFLICT:
                    'Teacher is already teaching another class at that time.',
            }

            if (messages[error.message]) {
                return {
                    success: false,
                    error: messages[error.message],
                }
            }
        }

        return errorResult(error)
    }
}

// DELETE LESSON
export async function deleteTimetableLesson(
    id: string
): Promise<ActionResult> {
    try {
        const schoolId = await getSchoolId()

        const result = await prisma.timetableSlot.deleteMany({
            where: {
                id,
                class: { schoolId },
            },
        })

        if (result.count === 0) {
            return {
                success: false,
                error: 'Lesson not found.',
            }
        }

        refresh()
        return { success: true }
    } catch (error) {
        return errorResult(error)
    }
}
