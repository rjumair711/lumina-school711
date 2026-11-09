import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Server-side only. Every admin read/write must be scoped by the
// schoolId returned here, never by an id sent from the browser.

export class SchoolAccessError extends Error {}

export type SchoolAdmin = {
  id: string
  name: string
  schoolId: string
}

export async function requireSchoolAdmin(): Promise<SchoolAdmin> {
  const session = await auth()
  const email = session?.user?.email

  if (!email) throw new SchoolAccessError('Please sign in again.')

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true, schoolId: true },
  })

  if (!user?.schoolId || user.role !== Role.ADMIN) {
    throw new SchoolAccessError('Administrator access required.')
  }

  return {
    id: user.id,
    name: user.name || 'School Administrator',
    schoolId: user.schoolId,
  }
}

// For server pages: send unauthenticated visitors to the login screen.
export async function requireSchoolAdminPage(): Promise<SchoolAdmin> {
  try {
    return await requireSchoolAdmin()
  } catch (error) {
    if (error instanceof SchoolAccessError) redirect('/')
    throw error
  }
}

export function accessErrorMessage(error: unknown): string | null {
  return error instanceof SchoolAccessError ? error.message : null
}

// Parse yyyy-MM-dd as a local calendar day (avoids UTC off-by-one).
export function parseLocalDay(
  value: string,
  time: 'start' | 'noon' | 'end' = 'start'
): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const [y, m, d] = value.split('-').map(Number)
  const [h, min, s, ms] =
    time === 'noon' ? [12, 0, 0, 0] : time === 'end' ? [23, 59, 59, 999] : [0, 0, 0, 0]
  const date = new Date(y, m - 1, d, h, min, s, ms)

  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null
  }

  return date
}
