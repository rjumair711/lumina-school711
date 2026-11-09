'use server'

import { revalidatePath } from 'next/cache'
import { format, startOfMonth } from 'date-fns'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'

type Result<T = object> = ({ success: true } & T) | { success: false; error: string; unauthorized?: boolean }

export type MaterialsData = Awaited<ReturnType<typeof loadData>>

function fail(error: unknown): { success: false; error: string; unauthorized?: boolean } {
  const access = accessErrorMessage(error)
  if (access) return { success: false, error: access, unauthorized: true }
  console.error('[Study materials]', error)
  return { success: false, error: 'Unable to complete the request.' }
}

export async function getMaterialsData(): Promise<Result<{ data: MaterialsData }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    return { success: true, data: await loadData(schoolId) }
  } catch (error) {
    return fail(error)
  }
}

async function loadData(schoolId: string) {
  const [materials, classes, assignments, teachers] = await Promise.all([
    prisma.studyMaterial.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        description: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        downloads: true,
        isPublished: true,
        uploadedByName: true,
        createdAt: true,
        updatedAt: true,
        classId: true,
        subjectId: true,
        teacherId: true,
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
        teacher: { select: { user: { select: { name: true } }, teacherId: true } },
      },
    }),
    prisma.class.findMany({
      where: { schoolId },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
      select: { id: true, name: true, section: true },
    }),
    prisma.classSubjectAssignment.findMany({
      where: { schoolId, subject: { schoolId } },
      orderBy: { subject: { name: 'asc' } },
      select: { classId: true, subjectId: true, teacherId: true, subject: { select: { name: true } } },
    }),
    prisma.teacher.findMany({
      where: { schoolId },
      orderBy: { user: { name: 'asc' } },
      select: { id: true, teacherId: true, user: { select: { name: true } } },
    }),
  ])

  const monthStart = startOfMonth(new Date())
  const subjectsByClass: Record<string, { id: string; name: string; teacherId: string | null }[]> = {}
  for (const a of assignments) {
    ;(subjectsByClass[a.classId] ??= []).push({ id: a.subjectId, name: a.subject.name, teacherId: a.teacherId })
  }

  const subjects = [...new Map(assignments.map((a) => [a.subjectId, { id: a.subjectId, name: a.subject.name }])).values()].sort(
    (a, b) => a.name.localeCompare(b.name)
  )

  return {
    generatedLabel: format(new Date(), 'hh:mm:ss a'),
    stats: {
      total: materials.length,
      published: materials.filter((m) => m.isPublished).length,
      downloads: materials.reduce((s, m) => s + m.downloads, 0),
      storageBytes: materials.reduce((s, m) => s + (m.fileSize ?? 0), 0),
      thisMonth: materials.filter((m) => m.createdAt >= monthStart).length,
    },
    classes: classes.map((c) => ({ id: c.id, name: `${c.name}-${c.section}` })),
    subjects,
    subjectsByClass,
    teachers: teachers.map((t) => ({ id: t.id, name: t.user?.name || t.teacherId })),
    materials: materials.map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      description: m.description ?? '',
      link: m.fileUrl,
      fileName: m.fileName,
      fileSize: m.fileSize,
      mimeType: m.mimeType,
      downloads: m.downloads,
      isPublished: m.isPublished,
      classId: m.classId,
      className: `${m.class.name}-${m.class.section}`,
      subjectId: m.subjectId,
      subjectName: m.subject.name,
      teacherId: m.teacherId,
      teacherName: m.teacher?.user?.name || m.teacher?.teacherId || null,
      uploadedBy: m.uploadedByName,
      createdAt: m.createdAt.toISOString(),
      dateLabel: format(m.createdAt, 'dd MMM yyyy'),
      updatedLabel: format(m.updatedAt, 'dd MMM yyyy, hh:mm a'),
    })),
  }
}

export async function deleteMaterial(id: string): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    const result = await prisma.studyMaterial.deleteMany({ where: { id, schoolId } })
    if (!result.count) return { success: false, error: 'Material not found.' }
    revalidatePath('/admin/study-materials')
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}

export async function setMaterialPublished(id: string, published: boolean): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    const result = await prisma.studyMaterial.updateMany({
      where: { id, schoolId },
      data: { isPublished: Boolean(published) },
    })
    if (!result.count) return { success: false, error: 'Material not found.' }
    revalidatePath('/admin/study-materials')
    return { success: true }
  } catch (error) {
    return fail(error)
  }
}
