'use server'

import { auth } from '@/auth'
import  prisma  from '@/lib/prisma'
import { AssignmentStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

type ActionResult = { ok: true } | { ok: false; error: string }

type CreateHomeworkInput = {
  title: string
  description?: string
  dueDate: string
  classId: string
  subjectId: string
  teacherId: string
  status: AssignmentStatus
}

async function requireSchoolAdmin(): Promise<string> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) throw new Error('Please sign in again.')
  // Do NOT trust a schoolId or role sent from a browser or a modified JWT.
  const user = await prisma.user.findUnique({ where: { email }, select: { schoolId: true, role: true } })
  if (!user?.schoolId || user.role !== Role.ADMIN) throw new Error('You are not allowed to manage homework.')
  return user.schoolId
}

export async function getHomeworkDashboardData() {
  const schoolId = await requireSchoolAdmin()
  const [homeworks, classes, subjects, teachers] = await Promise.all([
    prisma.homework.findMany({
      where: { schoolId }, orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true, title: true, description: true, dueDate: true, status: true, createdAt: true,
        classId: true, subjectId: true, teacherId: true,
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
        teacher: { select: { teacherId: true, user: { select: { name: true } } } }
      },
    }),
    prisma.class.findMany({ where: { schoolId }, orderBy: [{ name: 'asc' }, { section: 'asc' }], select: { id: true, name: true, section: true, _count: { select: { students: true } } } }),
    prisma.subject.findMany({ where: { schoolId }, orderBy: { name: 'asc' }, select: { id: true, name: true, classes: { select: { id: true } } } }),
    prisma.teacher.findMany({ where: { schoolId }, orderBy: { teacherId: 'asc' }, select: { id: true, teacherId: true, user: { select: { name: true } }, classes: { select: { id: true } }, subjects: { select: { id: true } } } }),
  ])
  return {
    homeworks: homeworks.map(h => ({ ...h, dueDate: h.dueDate.toISOString(), createdAt: h.createdAt.toISOString(), className: `Class ${h.class.name}-${h.class.section}`, subjectName: h.subject.name, teacherName: h.teacher.user?.name || h.teacher.teacherId })),
    classes: classes.map(c => ({ id: c.id, name: `Class ${c.name}-${c.section}`, studentCount: c._count.students })),
    subjects: subjects.map(s => ({ id: s.id, name: s.name, classIds: s.classes.map(c => c.id) })),
    teachers: teachers.map(t => ({ id: t.id, name: t.user?.name || t.teacherId, classIds: t.classes.map(c => c.id), subjectIds: t.subjects.map(s => s.id) })),
  }
}

export async function createHomework(input: CreateHomeworkInput): Promise<ActionResult> {
  try {
    const schoolId = await requireSchoolAdmin()
    const title = input.title?.trim()
    if (!title || title.length > 200) return { ok: false, error: 'Title must be 1–200 characters.' }
    if (input.description && input.description.length > 10000) return { ok: false, error: 'Instructions are too long.' }
    if (!Object.values(AssignmentStatus).includes(input.status)) return { ok: false, error: 'Invalid status.' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return { ok: false, error: 'Invalid due date.' }
    // UTC noon avoids timezone rollover when displaying a date-only school deadline.
    const dueDate = new Date(`${input.dueDate}T12:00:00.000Z`)
    if (Number.isNaN(dueDate.getTime()) || dueDate.toISOString().slice(0, 10) !== input.dueDate) return { ok: false, error: 'Invalid due date.' }
    const [klass, subject, teacher] = await Promise.all([
      prisma.class.findFirst({ where: { id: input.classId, schoolId }, select: { id: true, subjects: { where: { id: input.subjectId }, select: { id: true } } } }),
      prisma.subject.findFirst({ where: { id: input.subjectId, schoolId }, select: { id: true } }),
      prisma.teacher.findFirst({ where: { id: input.teacherId, schoolId }, select: { id: true, classes: { where: { id: input.classId }, select: { id: true } }, subjects: { where: { id: input.subjectId }, select: { id: true } } } }),
    ])
    if (!klass || !subject || !teacher) return { ok: false, error: 'Invalid school class, subject, or teacher.' }
    if (!klass.subjects.length) return { ok: false, error: 'This subject is not assigned to the selected class.' }
    if (!teacher.classes.length || !teacher.subjects.length) return { ok: false, error: 'Teacher must be assigned to this class and subject.' }
    await prisma.homework.create({ data: { schoolId, title, description: input.description?.trim() || null, dueDate, status: input.status, classId: klass.id, subjectId: subject.id, teacherId: teacher.id } })
    revalidatePath('/admin/homework')
    return { ok: true }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Could not create assignment.' } }
}

export async function deleteHomework(id: string): Promise<ActionResult> {
  try {
    const schoolId = await requireSchoolAdmin()
    // Atomic school-scoped deletion: an ID from another school cannot be deleted.
    const result = await prisma.homework.deleteMany({ where: { id, schoolId } })
    if (!result.count) return { ok: false, error: 'Assignment not found.' }
    revalidatePath('/admin/homework')
    return { ok: true }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Could not delete assignment.' } }
}

export async function updateHomeworkStatus(id: string, status: AssignmentStatus): Promise<ActionResult> {
  try {
    const schoolId = await requireSchoolAdmin()
    if (!Object.values(AssignmentStatus).includes(status)) return { ok: false, error: 'Invalid status.' }
    const result = await prisma.homework.updateMany({ where: { id, schoolId }, data: { status } })
    if (!result.count) return { ok: false, error: 'Assignment not found.' }
    revalidatePath('/admin/homework')
    return { ok: true }
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'Could not update assignment.' } }
}
