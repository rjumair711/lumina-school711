'use server'

import { revalidatePath } from 'next/cache'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { Role } from '@prisma/client'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'
import {
  PERMISSION_KEYS,
  ROLE_PRESETS,
  withRequirements,
  withoutOrphans,
} from '@/lib/permissions'

type Result<T = object> =
  | ({ success: true } & T)
  | { success: false; error: string; unauthorized?: boolean; conflict?: boolean }

export type PermissionsData = Awaited<ReturnType<typeof loadData>>

class InputError extends Error {}
class ConflictError extends Error {}

function fail(error: unknown): { success: false; error: string; unauthorized?: boolean; conflict?: boolean } {
  const access = accessErrorMessage(error)
  if (access) return { success: false, error: access, unauthorized: true }
  if (error instanceof ConflictError) return { success: false, error: error.message, conflict: true }
  if (error instanceof InputError) return { success: false, error: error.message }
  console.error('[Permissions]', error)
  return { success: false, error: 'Unable to save permissions. Please try again.' }
}

// Version token used for optimistic concurrency between admins.
const versionOf = (d: Date | null) => (d ? d.toISOString() : null)

function cleanKeys(keys: unknown): string[] {
  if (!Array.isArray(keys)) throw new InputError('Invalid permissions.')
  const unknown = keys.filter((k) => typeof k !== 'string' || !PERMISSION_KEYS.has(k))
  if (unknown.length) throw new InputError('Unknown permission in request.')
  return withoutOrphans(withRequirements(keys as string[]))
}

// ------------------------------------------------------------------

export async function getPermissionsData(): Promise<Result<{ data: PermissionsData }>> {
  try {
    const admin = await requireSchoolAdmin()
    return { success: true, data: await loadData(admin.schoolId) }
  } catch (error) {
    return fail(error)
  }
}

async function loadData(schoolId: string) {
  const [teachers, assignments, admins, logs] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId },
      orderBy: [{ user: { name: 'asc' } }, { teacherId: 'asc' }],
      select: {
        id: true,
        teacherId: true,
        phone: true,
        permissions: true,
        permissionsUpdatedAt: true,
        user: { select: { name: true, email: true, password: true } },
        headOfClasses: { select: { name: true, section: true } },
      },
    }),
    prisma.classSubjectAssignment.findMany({
      where: { schoolId, teacherId: { not: null } },
      select: {
        teacherId: true,
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { schoolId, role: Role.ADMIN },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    }),
    prisma.permissionLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        teacherId: true,
        changedByName: true,
        added: true,
        removed: true,
        note: true,
        createdAt: true,
        teacher: { select: { user: { select: { name: true } }, teacherId: true } },
      },
    }),
  ])

  const teaching = new Map<string, string[]>()
  for (const a of assignments) {
    if (!a.teacherId) continue
    const list = teaching.get(a.teacherId) ?? []
    list.push(`${a.subject.name} · ${a.class.name}-${a.class.section}`)
    teaching.set(a.teacherId, list)
  }

  const now = new Date()

  return {
    generatedLabel: format(now, 'hh:mm:ss a'),
    teachers: teachers.map((t) => ({
      id: t.id,
      code: t.teacherId,
      name: t.user?.name || t.teacherId,
      email: t.user?.email || '',
      phone: t.phone || '',
      // Teachers sign in once a password is set for their account.
      canSignIn: Boolean(t.user?.password),
      permissions: t.permissions.filter((k) => PERMISSION_KEYS.has(k)),
      version: versionOf(t.permissionsUpdatedAt),
      updatedLabel: t.permissionsUpdatedAt
        ? `${formatDistanceToNowStrict(t.permissionsUpdatedAt, { addSuffix: true })}`
        : null,
      classTeacherOf: t.headOfClasses.map((c) => `${c.name}-${c.section}`),
      teaches: (teaching.get(t.id) ?? []).sort(),
    })),
    admins: admins.map((a) => ({ id: a.id, name: a.name || 'Administrator', email: a.email || '' })),
    logs: logs.map((l) => ({
      id: l.id,
      teacherId: l.teacherId,
      teacherName: l.teacher.user?.name || l.teacher.teacherId,
      changedBy: l.changedByName,
      added: l.added,
      removed: l.removed,
      note: l.note,
      when: formatDistanceToNowStrict(l.createdAt, { addSuffix: true }),
      at: format(l.createdAt, 'dd MMM yyyy, hh:mm a'),
    })),
  }
}

// ------------------------------------------------------------------

export async function saveTeacherPermissions(
  teacherId: string,
  keys: string[],
  expectedVersion: string | null
): Promise<Result<{ version: string | null; changed: number }>> {
  try {
    const admin = await requireSchoolAdmin()
    const next = cleanKeys(keys)

    const result = await prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.findFirst({
        where: { id: teacherId, schoolId: admin.schoolId },
        select: { id: true, permissions: true, permissionsUpdatedAt: true },
      })
      if (!teacher) throw new InputError('Teacher not found.')

      if (versionOf(teacher.permissionsUpdatedAt) !== expectedVersion) {
        throw new ConflictError(
          'Another administrator changed these permissions a moment ago. Load the latest version and try again.'
        )
      }

      const before = new Set(teacher.permissions)
      const after = new Set(next)
      const added = next.filter((k) => !before.has(k))
      const removed = teacher.permissions.filter((k) => !after.has(k))

      if (!added.length && !removed.length) {
        return { version: versionOf(teacher.permissionsUpdatedAt), changed: 0 }
      }

      const stamp = new Date()
      // Conditional update: fails if someone saved between our read and write.
      const updated = await tx.teacher.updateMany({
        where: { id: teacher.id, permissionsUpdatedAt: teacher.permissionsUpdatedAt },
        data: { permissions: next, permissionsUpdatedAt: stamp },
      })
      if (updated.count === 0) {
        throw new ConflictError('Permissions changed while saving. Load the latest version and try again.')
      }

      await tx.permissionLog.create({
        data: {
          schoolId: admin.schoolId,
          teacherId: teacher.id,
          changedById: admin.id,
          changedByName: admin.name,
          added,
          removed,
        },
      })

      return { version: versionOf(stamp), changed: added.length + removed.length }
    })

    revalidatePath('/admin/roles-permission')
    return { success: true, ...result }
  } catch (error) {
    return fail(error)
  }
}

export async function applyPresetToTeachers(
  teacherIds: string[],
  presetId: string,
  mode: 'replace' | 'add'
): Promise<Result<{ updated: number }>> {
  try {
    const admin = await requireSchoolAdmin()

    const preset = ROLE_PRESETS.find((p) => p.id === presetId)
    if (!preset) throw new InputError('Unknown role preset.')
    if (mode !== 'replace' && mode !== 'add') throw new InputError('Invalid mode.')

    const ids = [...new Set(Array.isArray(teacherIds) ? teacherIds : [])]
    if (!ids.length) throw new InputError('Select at least one teacher.')
    if (ids.length > 500) throw new InputError('Too many teachers selected.')

    const updated = await prisma.$transaction(async (tx) => {
      const teachers = await tx.teacher.findMany({
        where: { id: { in: ids }, schoolId: admin.schoolId },
        select: { id: true, permissions: true },
      })
      if (teachers.length !== ids.length) throw new InputError('Some teachers were not found in your school.')

      const stamp = new Date()
      let count = 0

      for (const t of teachers) {
        const next = withRequirements(
          mode === 'replace' ? preset.permissions : [...t.permissions, ...preset.permissions]
        )
        const before = new Set(t.permissions)
        const after = new Set(next)
        const added = next.filter((k) => !before.has(k))
        const removed = t.permissions.filter((k) => !after.has(k))
        if (!added.length && !removed.length) continue

        await tx.teacher.update({
          where: { id: t.id },
          data: { permissions: next, permissionsUpdatedAt: stamp },
        })
        await tx.permissionLog.create({
          data: {
            schoolId: admin.schoolId,
            teacherId: t.id,
            changedById: admin.id,
            changedByName: admin.name,
            added,
            removed,
            note: `${mode === 'replace' ? 'Applied' : 'Added'} "${preset.name}" role`,
          },
        })
        count++
      }
      return count
    })

    revalidatePath('/admin/roles-permission')
    return { success: true, updated }
  } catch (error) {
    return fail(error)
  }
}
