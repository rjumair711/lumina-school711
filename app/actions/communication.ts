
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Prisma, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

type ActionResult =
  | { success: true; threadId?: string }
  | { success: false; error: string }

async function requireSchoolAdmin() {
  const session = await auth()
  const email = session?.user?.email

  if (!email) {
    throw new Error('Please sign in again.')
  }

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
    throw new Error(
      'Administrator access is required.'
    )
  }

  return {
    id: user.id,
    name: user.name ?? 'Administrator',
    schoolId: user.schoolId,
  }
}

function failure(error: unknown): ActionResult {
  console.error('[Communication]', error)

  if (error instanceof Error) {
    if (
      error.message ===
        'Administrator access is required.' ||
      error.message === 'Please sign in again.'
    ) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return {
      success: false,
      error: 'Conversation changed. Please try again.',
    }
  }

  return {
    success: false,
    error: 'Unable to complete the request.',
  }
}

export async function getCommunicationData() {
  const currentUser = await requireSchoolAdmin()

  const [users, threads] = await Promise.all([
    prisma.user.findMany({
      where: {
        schoolId: currentUser.schoolId,
        id: { not: currentUser.id },
        role: {
          in: [
            Role.ADMIN,
            Role.TEACHER,
            Role.STUDENT,
            Role.PARENT,
          ],
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    }),

    prisma.communicationThread.findMany({
      where: {
        schoolId: currentUser.schoolId,
        OR: [
          { participantAId: currentUser.id },
          { participantBId: currentUser.id },
        ],
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      include: {
        participantA: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        participantB: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
          },
        },
      },
    }),
  ])

  return {
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
    },

    contacts: users.map((user) => ({
      id: user.id,
      name: user.name || user.email || 'Unknown User',
      email: user.email,
      role: user.role,
    })),

    threads: threads.map((thread) => {
      const isParticipantA =
        thread.participantAId === currentUser.id

      const other = isParticipantA
        ? thread.participantB
        : thread.participantA

      const lastReadAt = isParticipantA
        ? thread.readAtA
        : thread.readAtB

      const latestMessage = thread.messages[0]

      const unread = Boolean(
        latestMessage &&
        latestMessage.senderId !== currentUser.id &&
        (
          !lastReadAt ||
          latestMessage.createdAt > lastReadAt
        )
      )

      return {
        id: thread.id,
        otherUserId: other.id,
        otherName: other.name || 'Unknown User',
        otherRole: other.role,

        unread,
        lastMessageAt:
          thread.lastMessageAt?.toISOString() ?? null,

        lastMessage:
          latestMessage?.content ?? '',

        messages: [...thread.messages]
          .reverse()
          .map((message) => ({
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            createdAt:
              message.createdAt.toISOString(),
          })),
      }
    }),
  }
}

// Send a real message to a user within the same school.
export async function sendSchoolMessage(
  recipientId: string,
  content: string
): Promise<ActionResult> {
  try {
    const sender = await requireSchoolAdmin()

    const text = content?.trim()

    if (!text || text.length > 4000) {
      return {
        success: false,
        error: 'Message must contain 1–4000 characters.',
      }
    }

    if (!recipientId || recipientId === sender.id) {
      return {
        success: false,
        error: 'Select a valid recipient.',
      }
    }

    const recipient = await prisma.user.findFirst({
      where: {
        id: recipientId,
        schoolId: sender.schoolId,
      },
      select: {
        id: true,
        role: true,
      },
    })

    if (!recipient) {
      return {
        success: false,
        error: 'Recipient not found in your school.',
      }
    }

    // Keep the pair in consistent order.
    const [participantAId, participantBId] =
      [sender.id, recipient.id].sort()

    const threadId = await prisma.$transaction(
      async (tx) => {
        const thread =
          await tx.communicationThread.upsert({
            where: {
              schoolId_participantAId_participantBId: {
                schoolId: sender.schoolId,
                participantAId,
                participantBId,
              },
            },
            create: {
              schoolId: sender.schoolId,
              participantAId,
              participantBId,
            },
            update: {},
          })

        const message =
          await tx.communicationMessage.create({
            data: {
              threadId: thread.id,
              senderId: sender.id,
              content: text,
            },
          })

        await tx.communicationThread.update({
          where: { id: thread.id },
          data: {
            lastMessageAt: message.createdAt,
            ...(sender.id === participantAId
              ? { readAtA: message.createdAt }
              : { readAtB: message.createdAt }),
          },
        })

        return thread.id
      }
    )

    revalidatePath('/admin/communication')

    return {
      success: true,
      threadId,
    }
  } catch (error) {
    return failure(error)
  }
}

// Mark messages as read when opening a conversation.
export async function markConversationRead(
  threadId: string
): Promise<ActionResult> {
  try {
    const currentUser = await requireSchoolAdmin()

    const thread =
      await prisma.communicationThread.findFirst({
        where: {
          id: threadId,
          schoolId: currentUser.schoolId,
          OR: [
            { participantAId: currentUser.id },
            { participantBId: currentUser.id },
          ],
        },
        select: {
          id: true,
          participantAId: true,
          participantBId: true,
        },
      })

    if (!thread) {
      return {
        success: false,
        error: 'Conversation not found.',
      }
    }

    const isA =
      thread.participantAId === currentUser.id

    await prisma.communicationThread.updateMany({
      where: {
        id: thread.id,
        schoolId: currentUser.schoolId,
        ...(isA
          ? { participantAId: currentUser.id }
          : { participantBId: currentUser.id }),
      },
      data: isA
        ? { readAtA: new Date() }
        : { readAtB: new Date() },
    })

    revalidatePath('/admin/communication')

    return { success: true }
  } catch (error) {
    return failure(error)
  }
}
