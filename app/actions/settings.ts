'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'

type Result = { success: boolean; error?: string }

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim()

function fail(error: unknown, fallback: string): Result {
  const access = accessErrorMessage(error)
  if (access) return { success: false, error: access }
  console.error(fallback, error)
  return { success: false, error: fallback }
}

export async function updateSchoolProfileAction(formData: FormData): Promise<Result> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    const name = text(formData, 'name')
    const email = text(formData, 'email').toLowerCase()
    const phone = text(formData, 'phone')
    const address = text(formData, 'address')

    if (!name) return { success: false, error: 'School name is required.' }
    if (name.length > 120) return { success: false, error: 'School name is too long.' }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Enter a valid school email.' }
    }

    await prisma.school.update({
      where: { id: schoolId },
      data: { name, email: email || null, phone: phone || null, address: address || null },
    })

    revalidatePath('/admin', 'layout')
    return { success: true }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'Another school already uses this email.' }
    }
    return fail(error, 'Could not save school details.')
  }
}

export async function updateAdminAccountAction(formData: FormData): Promise<Result> {
  try {
    const admin = await requireSchoolAdmin()
    const name = text(formData, 'name')
    const currentPassword = String(formData.get('currentPassword') ?? '')
    const newPassword = String(formData.get('newPassword') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (!name) return { success: false, error: 'Your name is required.' }

    const data: Prisma.UserUpdateInput = { name }

    if (newPassword || currentPassword) {
      if (newPassword.length < 8) {
        return { success: false, error: 'New password must be at least 8 characters.' }
      }
      if (newPassword !== confirmPassword) {
        return { success: false, error: 'New passwords do not match.' }
      }
      const user = await prisma.user.findUnique({
        where: { id: admin.id },
        select: { password: true },
      })
      if (!user?.password || !(await bcrypt.compare(currentPassword, user.password))) {
        return { success: false, error: 'Current password is incorrect.' }
      }
      data.password = await bcrypt.hash(newPassword, 10)
    }

    await prisma.user.update({ where: { id: admin.id }, data })
    revalidatePath('/admin', 'layout')
    return { success: true }
  } catch (error) {
    return fail(error, 'Could not update your account.')
  }
}
