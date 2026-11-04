import prisma from '@/lib/prisma'
import FeesWorkspace from '@/components/dashboard/fees-workspace'

export const dynamic = 'force-dynamic'

export default async function AdminFeesPage() {
  const school = await prisma.school.findFirst()
  if (!school) return <div>School not configured</div>

  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true, section: true },
    orderBy: [{ name: 'asc' }, { section: 'asc' }]
  })

  const students = await prisma.student.findMany({
    where: { schoolId: school.id },
    include: {
      user: true,
      class: true,
      fees: {
        include: { payments: true },
        orderBy: { dueDate: 'asc' }
      }
    },
    orderBy: { rollNo: 'asc' }
  })

  // Calculate Global Metrics
  let totalCollected = 0
  let thisMonthCollected = 0
  let totalPending = 0
  let defaultersCount = 0

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  students.forEach(student => {
    let studentIsDefaulter = false

    student.fees.forEach(fee => {
      totalCollected += fee.paidAmount
      totalPending += (fee.totalAmount - fee.paidAmount)
      
      fee.payments.forEach(payment => {
        if (payment.paidAt >= startOfMonth) {
          thisMonthCollected += payment.amount
        }
      })

      if (fee.dueDate < now && fee.status !== 'PAID') {
        studentIsDefaulter = true
      }
    })

    if (studentIsDefaulter) defaultersCount++
  })

  const metrics = {
    totalCollected,
    thisMonthCollected,
    totalPending,
    defaultersCount
  }

  return <FeesWorkspace classes={classes} students={students} metrics={metrics} />
}