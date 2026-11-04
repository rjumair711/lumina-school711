'use server'

import prisma from '@/lib/prisma'
import { FeeStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createClassFeeAction(formData: FormData) {
  try {
    const title = formData.get('title') as string
    const amount = parseFloat(formData.get('amount') as string)
    const dueDateStr = formData.get('dueDate') as string
    const classId = formData.get('classId') as string

    if (!title || !amount || !dueDateStr || !classId) {
      return { success: false, error: 'All fields are required' }
    }

    const school = await prisma.school.findFirst()
    if (!school) return { success: false, error: 'School not found' }

    const students = await prisma.student.findMany({ where: { classId } })

    if (students.length === 0) {
      return { success: false, error: 'No students found in this class' }
    }

    const dueDate = new Date(dueDateStr)

    const feeOperations = students.map(student =>
      prisma.fee.create({
        data: {
          title,
          totalAmount: amount,
          dueDate,
          status: 'PENDING',
          studentId: student.id,
          schoolId: school.id
        }
      })
    )

    await prisma.$transaction(feeOperations)
    revalidatePath('/admin/fees')
    revalidatePath('/admin/students')

    return { success: true }
  } catch (error) {
    console.error('Failed to create fee:', error)
    return { success: false, error: 'Database error occurred' }
  }
}

export async function recordFeePaymentAction(formData: FormData) {
  try {
    const feeId = formData.get('feeId') as string
    const amount = parseFloat(formData.get('amount') as string)
    const paymentMode = formData.get('paymentMode') as string
    const referenceNo = formData.get('referenceNo') as string

    if (!feeId || !amount || !paymentMode) {
      return { success: false, error: 'Amount and payment mode are required' }
    }

    const fee = await prisma.fee.findUnique({ where: { id: feeId } })
    if (!fee) return { success: false, error: 'Fee record not found' }

    const newPaidAmount = fee.paidAmount + amount
    let newStatus: FeeStatus = 'PARTIAL'
    if (newPaidAmount >= fee.totalAmount) newStatus = 'PAID'

    const receiptNo = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    await prisma.$transaction(async (tx) => {
      await tx.feePayment.create({
        data: {
          receiptNo,
          amount,
          paymentMode,
          referenceNo: referenceNo || null,
          feeId
        }
      })

      await tx.fee.update({
        where: { id: feeId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      })
    })

    revalidatePath('/admin/fees')
    revalidatePath('/admin/students')
    return { success: true, receiptNo }
  } catch (error) {
    console.error('Failed to record payment:', error)
    return { success: false, error: 'Database error occurred' }
  }
}