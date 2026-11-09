import prisma from '@/lib/prisma'
import { PERMISSION_KEYS } from '@/lib/permissions'

// Server-side check for teacher-facing features. Admins always pass.
// Use this when teacher pages/actions are added, e.g.
//   if (!(await hasPermission(userId, 'attendance.mark'))) throw ...
export async function hasPermission(userId: string, key: string): Promise<boolean> {
  if (!PERMISSION_KEYS.has(key)) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, teacher: { select: { permissions: true } } },
  })

  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.role === 'TEACHER' && Boolean(user.teacher?.permissions.includes(key))
}
