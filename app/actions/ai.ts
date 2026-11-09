'use server'

import { format, startOfMonth } from 'date-fns'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'
import { getReportsData } from '@/app/actions/reports'
import { getAiConfig } from '@/lib/ai/config'

export type AiAssistantData = Awaited<ReturnType<typeof loadData>>

export async function getAiAssistantData(): Promise<
  { success: true; data: AiAssistantData } | { success: false; error: string; unauthorized?: boolean }
> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    return { success: true, data: await loadData(schoolId) }
  } catch (error) {
    const access = accessErrorMessage(error)
    if (access) return { success: false, error: access, unauthorized: true }
    console.error('[AI Assistant]', error)
    return { success: false, error: 'Unable to load assistant data.' }
  }
}

async function loadData(schoolId: string) {
  const today = new Date()
  const [report, students, school, ai] = await Promise.all([
    getReportsData({
      from: format(startOfMonth(today), 'yyyy-MM-dd'),
      to: format(today, 'yyyy-MM-dd'),
      classId: null,
      subjectId: null,
    }),
    prisma.student.findMany({
      where: { schoolId },
      select: { id: true, rollNo: true, classId: true, user: { select: { name: true } } },
    }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    getAiConfig(schoolId).then(
      (c) => ({ configured: true as const, provider: c.provider.name, model: c.model, source: c.source, problem: null }),
      (e: unknown) => ({ configured: false as const, provider: null, model: null, source: null, problem: e instanceof Error ? e.message : 'Not configured' })
    ),
  ])

  if (!report.ok) throw new Error(report.error)
  const r = report.data

  students.sort((a, b) =>
    (a.rollNo ?? '').localeCompare(b.rollNo ?? '', undefined, { numeric: true })
  )

  return {
    schoolName: school?.name ?? 'your school',
    ai,
    updatedLabel: r.generatedLabel,
    stats: {
      students: r.overview.students,
      teachers: r.overview.teachers,
      classes: r.overview.classes,
      attendanceRate: r.overview.attendanceRate,
      collected: r.overview.collected,
      outstanding: r.overview.outstanding,
    },
    insights: r.insights,
    classes: r.options.classes,
    students: students.map((s) => ({
      id: s.id,
      name: s.user?.name || 'Unknown',
      rollNo: s.rollNo || '',
      classId: s.classId,
    })),
    defaulters: r.finance.defaulters.map((d) => ({
      id: d.id,
      name: d.name,
      className: d.className,
      overdue: d.overdue,
      daysOverdue: d.daysOverdue,
    })),
  }
}
