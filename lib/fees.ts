import { FeeStatus } from '@prisma/client'
import prisma from '@/lib/prisma'

const EPSILON = 0.005

export function feeStatusFor(
  totalAmount: number,
  paidAmount: number,
  dueDate: Date,
  now = new Date()
): FeeStatus {
  if (paidAmount + EPSILON >= totalAmount) return FeeStatus.PAID
  if (dueDate < now) return FeeStatus.OVERDUE
  return paidAmount > 0 ? FeeStatus.PARTIAL : FeeStatus.PENDING
}

// Unpaid fees whose due date has passed become OVERDUE.
// Cheap single UPDATE; safe to call on every page load.
export async function syncOverdueFees(schoolId: string) {
  await prisma.fee.updateMany({
    where: {
      schoolId,
      dueDate: { lt: new Date() },
      status: { in: [FeeStatus.PENDING, FeeStatus.PARTIAL] },
    },
    data: { status: FeeStatus.OVERDUE },
  })
}
