'use server'

import { randomBytes } from 'crypto'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { feeStatusFor } from '@/lib/fees'
import { PAYMENT_METHODS, formatMoney, isMonthKey, monthLabel } from '@/lib/fee-utils'
import {
  accessErrorMessage,
  parseLocalDay,
  requireSchoolAdmin,
} from '@/lib/school-auth'

const PAYMENT_MODES: readonly string[] = PAYMENT_METHODS

function failure(error: unknown) {
  const access = accessErrorMessage(error)
  if (!access) console.error('[Fees]', error)
  return { success: false as const, error: access ?? 'Database error occurred' }
}

function refresh() {
  revalidatePath('/admin/fees')
  revalidatePath('/admin/students')
  revalidatePath('/admin/reports')
}

export async function createClassFeeAction(formData: FormData) {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const title = String(formData.get('title') ?? '').trim()
    const amount = Number(formData.get('amount'))
    const dueDateStr = String(formData.get('dueDate') ?? '')
    const classId = String(formData.get('classId') ?? '')

    if (!title || !dueDateStr || !classId) {
      return { success: false as const, error: 'All fields are required' }
    }
    if (title.length > 200) {
      return { success: false as const, error: 'Fee title is too long' }
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      return { success: false as const, error: 'Enter a valid amount' }
    }

    const dueDate = parseLocalDay(dueDateStr, 'end')
    if (!dueDate) return { success: false as const, error: 'Enter a valid due date' }

    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    })
    if (!cls) return { success: false as const, error: 'Class not found in your school' }

    const students = await prisma.student.findMany({
      where: { classId, schoolId },
      select: { id: true },
    })
    if (students.length === 0) {
      return { success: false as const, error: 'No students found in this class' }
    }

    const status = feeStatusFor(amount, 0, dueDate)

    await prisma.fee.createMany({
      data: students.map((student) => ({
        title,
        totalAmount: amount,
        dueDate,
        status,
        studentId: student.id,
        schoolId,
      })),
    })

    refresh()
    return { success: true as const, count: students.length }
  } catch (error) {
    return failure(error)
  }
}

export async function recordFeePaymentAction(formData: FormData) {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const feeId = String(formData.get('feeId') ?? '')
    const amount = Math.round(Number(formData.get('amount')) * 100) / 100
    const paymentMode = String(formData.get('paymentMode') ?? '').trim()
    const referenceNo = String(formData.get('referenceNo') ?? '').trim()
    const paidAtStr = String(formData.get('paidAt') ?? '').trim()

    // Payment date defaults to now; a chosen date may not be in the future.
    let paidAt = new Date()
    if (paidAtStr) {
      const day = parseLocalDay(paidAtStr, 'start')
      if (!day) return { success: false as const, error: 'Enter a valid payment date' }
      if (day > new Date()) {
        return { success: false as const, error: 'Payment date cannot be in the future' }
      }
      const today = new Date()
      const isToday = day.toDateString() === today.toDateString()
      paidAt = isToday ? today : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12)
    }

    if (!feeId || !paymentMode) {
      return { success: false as const, error: 'Amount and payment mode are required' }
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false as const, error: 'Enter a valid amount' }
    }
    if (!PAYMENT_MODES.includes(paymentMode)) {
      return { success: false as const, error: 'Invalid payment mode' }
    }

    const receiptNo = `RCP-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`

    // Read and update inside one transaction so two simultaneous
    // payments cannot both pass the balance check.
    const outcome = await prisma.$transaction(async (tx) => {
      const fee = await tx.fee.findFirst({
        where: { id: feeId, schoolId },
        select: { id: true, totalAmount: true, paidAmount: true, dueDate: true },
      })
      if (!fee) return { error: 'Fee record not found' }

      const balance = Math.round((fee.totalAmount - fee.paidAmount) * 100) / 100
      if (balance <= 0) return { error: 'This fee is already fully paid' }
      if (amount > balance + 0.005) {
        return { error: `Amount exceeds the remaining balance of ${formatMoney(balance)}` }
      }

      const newPaidAmount = Math.round((fee.paidAmount + amount) * 100) / 100

      const updated = await tx.fee.updateMany({
        where: { id: fee.id, paidAmount: fee.paidAmount },
        data: {
          paidAmount: newPaidAmount,
          status: feeStatusFor(fee.totalAmount, newPaidAmount, fee.dueDate),
        },
      })
      if (updated.count === 0) return { error: 'Fee changed while saving. Please try again.' }

      await tx.feePayment.create({
        data: {
          receiptNo,
          amount,
          paymentMode,
          referenceNo: referenceNo || null,
          paidAt,
          feeId: fee.id,
        },
      })

      return { ok: true as const, remaining: Math.round((fee.totalAmount - newPaidAmount) * 100) / 100 }
    })

    if ('error' in outcome) return { success: false as const, error: outcome.error }

    refresh()
    return {
      success: true as const,
      receiptNo,
      amount,
      paymentMode,
      referenceNo: referenceNo || null,
      paidAt: paidAt.toISOString(),
      remaining: outcome.remaining,
    }
  } catch (error) {
    return failure(error)
  }
}

// Creates one voucher per student for the given month, using each student's
// monthly fee. Students who already have a voucher for that month, or whose
// monthly fee is 0, are skipped, so running it twice is safe.
export async function generateMonthlyVouchersAction(formData: FormData) {
  try {
    const { schoolId } = await requireSchoolAdmin()

    const month = String(formData.get('month') ?? '').trim()
    const classId = String(formData.get('classId') ?? 'all').trim() || 'all'
    const dueDay = Number(formData.get('dueDay') ?? 10)

    if (!isMonthKey(month)) {
      return { success: false as const, error: 'Select a valid month' }
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
      return { success: false as const, error: 'Due day must be between 1 and 28' }
    }

    if (classId !== 'all') {
      const cls = await prisma.class.findFirst({
        where: { id: classId, schoolId },
        select: { id: true },
      })
      if (!cls) return { success: false as const, error: 'Class not found in your school' }
    }

    const [year, mon] = month.split('-').map(Number)
    const dueDate = new Date(year, mon - 1, dueDay, 23, 59, 59, 999)

    const students = await prisma.student.findMany({
      where: { schoolId, ...(classId !== 'all' ? { classId } : {}) },
      select: { id: true, monthlyFee: true },
    })
    if (students.length === 0) {
      return { success: false as const, error: 'No students found' }
    }

    const billable = students.filter((s) => s.monthlyFee > 0)
    const noFee = students.length - billable.length
    if (billable.length === 0) {
      return {
        success: false as const,
        error: 'None of these students has a monthly fee set. Add it from the Students page.',
      }
    }

    const title = `Monthly Fee - ${monthLabel(month)}`
    const result = await prisma.fee.createMany({
      data: billable.map((s) => ({
        title,
        month,
        totalAmount: s.monthlyFee,
        dueDate,
        status: feeStatusFor(s.monthlyFee, 0, dueDate),
        studentId: s.id,
        schoolId,
      })),
      skipDuplicates: true,
    })

    refresh()
    return {
      success: true as const,
      created: result.count,
      alreadyExisted: billable.length - result.count,
      noFee,
    }
  } catch (error) {
    return failure(error)
  }
}
