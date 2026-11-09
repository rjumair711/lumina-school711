import { addDays, format, startOfMonth } from 'date-fns'
import prisma from '@/lib/prisma'
import { getReportsData } from '@/app/actions/reports'
import { getAssessmentsData } from '@/app/actions/assessments'

// Compact, privacy-minded snapshot of the school for the AI assistant.
// Names are included so questions like "who is at risk?" can be answered;
// phone numbers and email addresses are deliberately left out.
export async function buildSchoolContext(schoolId: string) {
  const today = new Date()
  const from = format(startOfMonth(today), 'yyyy-MM-dd')
  const to = format(today, 'yyyy-MM-dd')

  const [school, report, assessments] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    getReportsData({ from, to, classId: null, subjectId: null }),
    getAssessmentsData(),
  ])

  if (!report.ok) throw new Error(report.error)
  const r = report.data

  const todayKey = to
  const soonKey = format(addDays(today, 14), 'yyyy-MM-dd')

  const upcoming = assessments.success
    ? [
        ...assessments.data.tests
          .filter((t) => t.date >= todayKey && t.date <= soonKey && t.status !== 'Cancelled')
          .map((t) => ({ kind: 'test', title: t.title, class: t.className, subject: t.subjectName, date: t.date })),
        ...assessments.data.exams.flatMap((e) =>
          e.status === 'Cancelled'
            ? []
            : e.papers
                .filter((p) => p.date >= todayKey && p.date <= soonKey)
                .map((p) => ({ kind: 'exam paper', title: e.title, class: e.className, subject: p.subjectName, date: p.date }))
        ),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : []

  const awaitingMarks = assessments.success
    ? assessments.data.tests
        .filter((t) => t.date <= todayKey && t.status !== 'Cancelled' && t.stats.entered < t.studentCount)
        .map((t) => `${t.title} (${t.className}, ${t.date}): ${t.stats.entered}/${t.studentCount} entered`)
    : []

  return {
    school: school?.name ?? 'School',
    today: format(today, 'EEEE, dd MMMM yyyy'),
    period: `${r.range.label} (this month so far)`,
    currency: 'INR (₹)',
    overview: r.overview,
    attentionPoints: r.insights.map((i) => `${i.title}: ${i.detail}`),
    attendance: {
      definition: 'rate = (present + late) / all marked records',
      students: r.attendance.totals,
      staff: r.attendance.staff,
      studentsBelow75Percent: r.attendance.atRisk.slice(0, 15).map((s) => ({
        name: s.name,
        class: s.className,
        rate: s.rate,
        absentDays: s.absent,
        recordedDays: s.total,
      })),
      trend: r.attendance.trend.filter((t) => t.total > 0).map((t) => ({ period: t.label, rate: t.rate })),
    },
    classes: r.classRows.map((c) => ({
      class: c.name,
      classTeacher: c.classTeacher,
      students: c.students,
      capacity: c.capacity,
      attendanceRate: c.attendance.rate,
      feesCollectedThisPeriod: c.collected,
      outstandingFees: c.outstanding,
      overdueFees: c.overdue,
    })),
    finance: {
      dueThisPeriod: r.finance.dueInPeriod,
      collectedThisPeriod: r.finance.collected,
      collectionRateThisPeriod: r.finance.collectionRate,
      outstandingToday: r.finance.outstanding,
      overdueToday: r.finance.overdue,
      studentsWithOverdueFees: r.finance.defaulterCount,
      largestOverdue: r.finance.defaulters.slice(0, 15).map((d) => ({
        name: d.name,
        class: d.className,
        overdue: d.overdue,
        daysOverdue: d.daysOverdue,
      })),
      paymentMethods: r.finance.paymentModes,
    },
    academics: {
      homeworkDueThisPeriod: r.academics.homework,
      performanceBySubject: r.academics.performance.bySubject,
      averageScore: r.academics.performance.averagePercent,
      passRate: r.academics.performance.passRate,
      testsThisPeriod: r.academics.tests.map((t) => ({
        title: t.title,
        class: t.className,
        subject: t.subject,
        date: t.date,
        averagePercent: t.averagePercent,
        passRate: t.passRate,
      })),
      upcomingNext14Days: upcoming,
      awaitingMarks,
    },
  }
}

export type SchoolContext = Awaited<ReturnType<typeof buildSchoolContext>>
