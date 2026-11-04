
import StudentsPage from '@/components/dashboard/student-page'
import prisma from '@/lib/prisma'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type FeeStatus =
  | 'Paid'
  | 'Partial'
  | 'Pending'
  | 'Not Assigned'

function calculateFeeStatus(
  fees: {
    totalAmount: number
    paidAmount: number
  }[]
): FeeStatus {
  if (fees.length === 0) {
    return 'Not Assigned'
  }

  // Convert to the smallest currency unit to
  // avoid floating-point balance comparison issues.
  const total = fees.reduce(
    (sum, fee) => sum + Math.round(fee.totalAmount * 100),
    0
  )

  const paid = fees.reduce(
    (sum, fee) => sum + Math.round(fee.paidAmount * 100),
    0
  )

  const balance = total - paid

  if (balance <= 0) {
    return 'Paid'
  }

  if (paid > 0) {
    return 'Partial'
  }

  return 'Pending'
}

export default async function Page() {
  const session = await auth()

  const user = session?.user as
    | {
        role?: string
        schoolId?: string | null
      }
    | undefined

  if (!user?.schoolId || user.role !== 'ADMIN') {
    redirect('/')
  }

  const schoolId = user.schoolId

  const [dbClasses, rawStudents] = await Promise.all([
    prisma.class.findMany({
      where: {
        schoolId,
      },
      orderBy: [
        { name: 'asc' },
        { section: 'asc' },
      ],
    }),

    prisma.student.findMany({
      where: {
        schoolId,
      },
      include: {
        user: true,
        class: true,
        fees: {
          where: {
            schoolId,
          },
          select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
  ])

  const students = rawStudents.map((student) => {
    const feeStatus = calculateFeeStatus(student.fees)

    return {
      id: student.id,
      name: student.user?.name || 'Unknown',
      email: student.user?.email || 'N/A',
      initials: (student.user?.name || 'U')
        .substring(0, 2)
        .toUpperCase(),

      cls: `${student.class.name}-${student.class.section}`,
      classId: student.classId,
      roll: student.rollNo || '',

      dob: student.dob
        ? student.dob.toISOString().split('T')[0]
        : '',

      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      parentEmail: student.parentEmail || '',
      address: student.address || '',

      // Preserve existing attendance behavior.
      attendanceValue: 100,

      // Calculated from actual database fees.
      feeStatus,
    }
  })

  return (
    <StudentsPage
      students={students}
      dbClasses={dbClasses}
    />
  )
}
