import prisma from '@/lib/prisma'
import FeesWorkspace from '@/components/dashboard/fees-workspace'
import { syncOverdueFees } from '@/lib/fees'
import { monthKey } from '@/lib/fee-utils'
import { requireSchoolAdminPage } from '@/lib/school-auth'

export const dynamic = 'force-dynamic'

export default async function AdminFeesPage() {
  const { schoolId } = await requireSchoolAdminPage()
  await syncOverdueFees(schoolId)

  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true, section: true },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  })

  const students = await prisma.student.findMany({
    where: { schoolId },
    include: {
      user: true,
      class: true,
      fees: {
        include: { payments: { orderBy: { paidAt: 'asc' } } },
        orderBy: { dueDate: 'asc' }
      }
    },
    orderBy: { rollNo: 'asc' }
  })

  const now = new Date()
  const currentMonth = monthKey(now)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  // A fee belongs to the current month if it is this month's voucher, or a
  // one-off fee due this month.
  const isCurrentMonthFee = (fee: { month: string | null; dueDate: Date }) =>
    fee.month
      ? fee.month === currentMonth
      : fee.dueDate >= startOfMonth && fee.dueDate < startOfNextMonth

  let totalCollected = 0
  let thisMonthCollected = 0
  let totalPending = 0
  let defaultersCount = 0
  let monthExpected = 0
  let monthCollected = 0
  let monthVouchers = 0
  let monthPaidVouchers = 0

  // Last 12 months of collections, keyed "YYYY-MM"
  const trend = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    trend.set(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)), 0)
  }

  const byClass = new Map<string, { name: string; collected: number; pending: number }>()
  for (const c of classes) byClass.set(c.id, { name: `${c.name}-${c.section}`, collected: 0, pending: 0 })

  for (const student of students) {
    let studentIsDefaulter = false
    const classRow = byClass.get(student.classId)

    for (const fee of student.fees) {
      const balance = Math.max(0, fee.totalAmount - fee.paidAmount)
      totalCollected += fee.paidAmount
      totalPending += balance
      if (classRow) {
        classRow.collected += fee.paidAmount
        classRow.pending += balance
      }

      if (isCurrentMonthFee(fee)) {
        monthExpected += fee.totalAmount
        monthCollected += fee.paidAmount
        monthVouchers++
        if (fee.status === 'PAID') monthPaidVouchers++
      }

      for (const payment of fee.payments) {
        if (payment.paidAt >= startOfMonth) thisMonthCollected += payment.amount
        const key = monthKey(payment.paidAt)
        if (trend.has(key)) trend.set(key, (trend.get(key) ?? 0) + payment.amount)
      }

      if (fee.dueDate < now && fee.status !== 'PAID') studentIsDefaulter = true
    }

    if (studentIsDefaulter) defaultersCount++
  }

  const metrics = {
    currentMonth,
    monthExpected,
    monthCollected,
    monthPending: Math.max(0, monthExpected - monthCollected),
    monthVouchers,
    monthPaidVouchers,
    totalCollected,
    thisMonthCollected,
    totalPending,
    defaultersCount,
  }

  const charts = {
    trend: [...trend.entries()].map(([key, value]) => ({ key, value })),
    byClass: [...byClass.values()],
  }

  return <FeesWorkspace classes={classes} students={students} metrics={metrics} charts={charts} />
}
