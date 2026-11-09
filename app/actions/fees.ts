'use server'

import { randomBytes } from 'crypto'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { feeStatusFor } from '@/lib/fees'
import {
  accessErrorMessage,
  parseLocalDay,
  requireSchoolAdmin,
} from '@/lib/school-auth'

const PAYMENT_MODES = ['Cash', 'Online', 'Cheque', 'Card', 'Bank Transfer', 'UPI']

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
        return { error: `Amount exceeds the remaining balance of ₹${balance.toLocaleString('en-IN')}` }
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
          feeId: fee.id,
        },
      })

      return { ok: true as const }
    })

    if ('error' in outcome) return { success: false as const, error: outcome.error }

    refresh()
    return { success: true as const, receiptNo }
  } catch (error) {
    return failure(error)
  }
}
