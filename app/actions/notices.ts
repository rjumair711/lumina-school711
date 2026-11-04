
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import {
  NoticeAudience,
  NoticeStatus,
  Priority,
  Role,
} from '@prisma/client'
import { revalidatePath } from 'next/cache'

type NoticeInput = {
  title: string
  description: string
  priority: Priority
  status: NoticeStatus
  audience: NoticeAudience
  classId: string | null
  isPinned: boolean
  publishAt: string | null
  expiresAt: string | null
}

type Result =
  | { success: true }
  | { success: false; error: string }

async function requireAdmin() {
  const session = await auth()
  const email = session?.user?.email

  if (!email) throw new Error('Please sign in again.')

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      role: true,
      schoolId: true,
    },
  })

  if (!user?.schoolId || user.role !== Role.ADMIN) {
    throw new Error('Administrator access required.')
  }

  return {
    id: user.id,
    name: user.name || 'School Administrator',
    schoolId: user.schoolId,
  }
}

function handleError(error: unknown): Result {
  console.error('[Notice Board]', error)

  return {
    success: false,
    error:
      error instanceof Error &&
      (
        error.message === 'Administrator access required.' ||
        error.message === 'Please sign in again.'
      )
        ? error.message
        : 'Unable to complete the operation. Please try again.',
  }
}

function refreshNotices() {
  revalidatePath('/admin/noticeboard')
}

function parseDate(value: string | null) {
  if (!value) return null

  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    throw new Error('INVALID_DATE')
  }

  return date
}

export async function getNoticeBoardData() {
  const admin = await requireAdmin()

  const [notices, classes] = await Promise.all([
    prisma.notice.findMany({
      where: { schoolId: admin.schoolId },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        audience: true,
        author: true,
        authorId: true,
        classId: true,
        isPinned: true,
        publishAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        class: {
          select: {
            name: true,
            section: true,
          },
        },
      },
    }),

    prisma.class.findMany({
      where: { schoolId: admin.schoolId },
      orderBy: [
        { name: 'asc' },
        { section: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        section: true,
      },
    }),
  ])

  return {
    notices: notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      description: notice.description,
      priority: notice.priority,
      status: notice.status,
      audience: notice.audience,
      author: notice.author,
      authorId: notice.authorId,
      classId: notice.classId,
      className: notice.class
        ? `${notice.class.name}-${notice.class.section}`
        : null,
      isPinned: notice.isPinned,
      publishAt: notice.publishAt?.toISOString() ?? null,
      expiresAt: notice.expiresAt?.toISOString() ?? null,
      createdAt: notice.createdAt.toISOString(),
      updatedAt: notice.updatedAt.toISOString(),
    })),

    classes: classes.map((c) => ({
      id: c.id,
      name: `${c.name}-${c.section}`,
    })),

    currentUser: {
      id: admin.id,
      name: admin.name,
    },
  }
}

export async function saveNotice(
  input: NoticeInput,
  id?: string
): Promise<Result> {
  try {
    const admin = await requireAdmin()

    const title = input.title?.trim()
    const description = input.description?.trim()

    if (!title || title.length > 200) {
      return {
        success: false,
        error: 'Title must contain 1–200 characters.',
      }
    }

    if (!description || description.length > 10000) {
      return {
        success: false,
        error: 'Description must contain 1–10000 characters.',
      }
    }

    if (!Object.values(Priority).includes(input.priority)) {
      return {
        success: false,
        error: 'Invalid priority.',
      }
    }

    if (!Object.values(NoticeStatus).includes(input.status)) {
      return {
        success: false,
        error: 'Invalid publication status.',
      }
    }

    if (!Object.values(NoticeAudience).includes(input.audience)) {
      return {
        success: false,
        error: 'Invalid notice audience.',
      }
    }

    const classId =
      input.audience === NoticeAudience.CLASS
        ? input.classId
        : null

    if (input.audience === NoticeAudience.CLASS) {
      if (!classId) {
        return {
          success: false,
          error: 'Select a target class and section.',
        }
      }

      const targetClass = await prisma.class.findFirst({
        where: {
          id: classId,
          schoolId: admin.schoolId,
        },
        select: { id: true },
      })

      if (!targetClass) {
        return {
          success: false,
          error: 'Target class does not belong to your school.',
        }
      }
    }

    let publishAt: Date | null
    let expiresAt: Date | null

    try {
      publishAt = parseDate(input.publishAt)
      expiresAt = parseDate(input.expiresAt)
    } catch {
      return {
        success: false,
        error: 'Invalid publication or expiration date.',
      }
    }

    if (
      publishAt &&
      expiresAt &&
      expiresAt <= publishAt
    ) {
      return {
        success: false,
        error: 'Expiration must be after publication.',
      }
    }

    if (
      expiresAt &&
      !publishAt &&
      input.status === NoticeStatus.PUBLISHED &&
      expiresAt <= new Date()
    ) {
      return {
        success: false,
        error: 'Expiration must be in the future.',
      }
    }

    const data = {
      title,
      description,
      priority: input.priority,
      status: input.status,
      audience: input.audience,
      classId,
      isPinned: Boolean(input.isPinned),
      publishAt,
      expiresAt,
    }

    if (id) {
      const existing = await prisma.notice.findFirst({
        where: {
          id,
          schoolId: admin.schoolId,
        },
        select: { id: true },
      })

      if (!existing) {
        return {
          success: false,
          error: 'Notice not found.',
        }
      }

      await prisma.notice.updateMany({
        where: {
          id,
          schoolId: admin.schoolId,
        },
        data,
      })
    } else {
      await prisma.notice.create({
        data: {
          ...data,
          schoolId: admin.schoolId,
          author: admin.name,
          authorId: admin.id,
        },
      })
    }

    refreshNotices()
    return { success: true }
  } catch (error) {
    return handleError(error)
  }
}

export async function deleteNotice(
  id: string
): Promise<Result> {
  try {
    const admin = await requireAdmin()

    const result = await prisma.notice.deleteMany({
      where: {
        id,
        schoolId: admin.schoolId,
      },
    })

    if (!result.count) {
      return {
        success: false,
        error: 'Notice not found.',
      }
    }

    refreshNotices()
    return { success: true }
  } catch (error) {
    return handleError(error)
  }
}

export async function setNoticeStatus(
  id: string,
  status: NoticeStatus
): Promise<Result> {
  try {
    const admin = await requireAdmin()

    if (!Object.values(NoticeStatus).includes(status)) {
      return {
        success: false,
        error: 'Invalid status.',
      }
    }

    const result = await prisma.notice.updateMany({
      where: {
        id,
        schoolId: admin.schoolId,
      },
      data: { status },
    })

    if (!result.count) {
      return {
        success: false,
        error: 'Notice not found.',
      }
    }

    refreshNotices()
    return { success: true }
  } catch (error) {
    return handleError(error)
  }
}

export async function toggleNoticePin(
  id: string
): Promise<Result> {
  try {
    const admin = await requireAdmin()

    const result = await prisma.$transaction(async (tx) => {
      const notice = await tx.notice.findFirst({
        where: { id, schoolId: admin.schoolId },
        select: {
          id: true,
          isPinned: true,
        },
      })

      if (!notice) return false

      await tx.notice.updateMany({
        where: {
          id,
          schoolId: admin.schoolId,
          isPinned: notice.isPinned,
        },
        data: {
          isPinned: !notice.isPinned,
        },
      })

      return true
    })

    if (!result) {
      return {
        success: false,
        error: 'Notice not found.',
      }
    }

    refreshNotices()
    return { success: true }
  } catch (error) {
    return handleError(error)
  }
}
