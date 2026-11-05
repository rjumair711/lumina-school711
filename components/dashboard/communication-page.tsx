
'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Role } from '@prisma/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

import {
  getCommunicationData,
  sendSchoolMessage,
  markConversationRead,
} from '@/app/actions/communication'

type Data = Awaited<ReturnType<typeof getCommunicationData>>
type Contact = Data['contacts'][number]
type Thread = Data['threads'][number]

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  PARENT: 'Parent',
}

const roleColors: Record<Role, string> = {
  ADMIN: 'bg-violet-50 text-violet-700',
  TEACHER: 'bg-blue-50 text-blue-700',
  STUDENT: 'bg-emerald-50 text-emerald-700',
  PARENT: 'bg-orange-50 text-orange-700',
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}

function messageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function conversationDate(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  const today = new Date()

  if (date.toDateString() === today.toDateString()) {
    return messageTime(value)
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

export default function CommunicationPage({
  initialData,
}: {
  initialData: Data
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [activeContactId, setActiveContactId] =
    useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [message, setMessage] = useState('')

  const [showChatOnMobile, setShowChatOnMobile] =
    useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Automatically request fresh server data every 10 seconds.
  // This is polling, not a WebSocket connection.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }, 10000)

    return () => window.clearInterval(interval)
  }, [router])

  // Combine real school users with their conversation metadata.
  const contacts = useMemo(() => {
    const list = initialData.contacts.map((contact) => {
      const thread = initialData.threads.find(
        (t) => t.otherUserId === contact.id
      )

      return {
        ...contact,
        thread: thread ?? null,
      }
    })

    return list.sort((a, b) => {
      const timeA = a.thread?.lastMessageAt
        ? new Date(a.thread.lastMessageAt).getTime()
        : 0

      const timeB = b.thread?.lastMessageAt
        ? new Date(b.thread.lastMessageAt).getTime()
        : 0

      if (timeA !== timeB) return timeB - timeA

      return a.name.localeCompare(b.name)
    })
  }, [initialData.contacts, initialData.threads])

  const filteredContacts = useMemo(() => {
    const search = query.trim().toLowerCase()

    return contacts.filter((contact) => {
      const matchesSearch =
        contact.name.toLowerCase().includes(search) ||
        (contact.email ?? '')
          .toLowerCase()
          .includes(search) ||
        (contact.thread?.lastMessage ?? '')
          .toLowerCase()
          .includes(search)

      const matchesRole =
        roleFilter === 'ALL' ||
        contact.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [contacts, query, roleFilter])

  const activeContact =
    contacts.find((c) => c.id === activeContactId) ??
    null

  const activeThread: Thread | null =
    initialData.threads.find(
      (t) => t.otherUserId === activeContactId
    ) ?? null

  const unreadCount = initialData.threads.filter(
    (thread) => thread.unread
  ).length

  // Keep the message area scrolled to the latest message.
  useEffect(() => {
    if (activeContactId) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      })
    }
  }, [
    activeContactId,
    activeThread?.messages.length,
    activeThread?.lastMessageAt,
  ])

  // Mark newly arrived messages as read while chat is open.
  useEffect(() => {
    if (
      !activeThread?.id ||
      !activeThread.unread ||
      document.visibilityState !== 'visible'
    ) {
      return
    }

    let cancelled = false

    markConversationRead(activeThread.id).then((result) => {
      if (!cancelled && result.success) {
        router.refresh()
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    activeThread?.id,
    activeThread?.unread,
    activeThread?.lastMessageAt,
    router,
  ])

  function selectContact(contact: Contact) {
    setActiveContactId(contact.id)
    setMessage('')
    setShowChatOnMobile(true)
  }

  function submitMessage(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!activeContactId || !message.trim()) return

    const content = message.trim()
    const recipientId = activeContactId

    startTransition(async () => {
      const result = await sendSchoolMessage(
        recipientId,
        content
      )

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setMessage('')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Communication
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Secure messages with members of your school.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
          <ShieldCheck className="size-4 text-emerald-600" />
          School-private messaging
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users className="size-4" />
            School Contacts
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {contacts.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MessageCircle className="size-4" />
            Conversations
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {initialData.threads.length}
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MessageCircle className="size-4" />
            Unread Conversations
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {unreadCount}
          </p>
        </div>
      </div>

      {/* CHAT WORKSPACE */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid h-[690px] min-h-0 lg:grid-cols-[330px_minmax(0,1fr)]">

          {/* CONTACTS */}
          <section
            aria-label="School contacts"
            className={cn(
              'min-h-0 flex-col border-r border-slate-200',
              showChatOnMobile
                ? 'hidden lg:flex'
                : 'flex'
            )}
          >
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  Messages
                </h2>

                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-[#d95324]">
                  {contacts.length} contacts
                </span>
              </div>

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search school contacts"
                  placeholder="Search people or messages..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#FF6B35]"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value)
                }
                aria-label="Filter contacts by role"
                className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-[#FF6B35]"
              >
                <option value="ALL">All Members</option>
                <option value={Role.TEACHER}>Teachers</option>
                <option value={Role.STUDENT}>Students</option>
                <option value={Role.PARENT}>Parents</option>
                <option value={Role.ADMIN}>Administrators</option>
              </select>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {filteredContacts.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Users className="mx-auto size-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No contacts found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try another search or role filter.
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => {
                  const isActive =
                    activeContactId === contact.id

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() =>
                        selectContact(contact)
                      }
                      className={cn(
                        'relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                        isActive
                          ? 'bg-orange-50'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      {isActive && (
                        <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#FF6B35]" />
                      )}

                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#d95324]">
                        {initials(contact.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-800">
                            {contact.name}
                          </span>

                          <span className="shrink-0 text-[10px] text-slate-400">
                            {conversationDate(
                              contact.thread?.lastMessageAt ??
                              null
                            )}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                              roleColors[contact.role]
                            )}
                          >
                            {roleLabels[contact.role]}
                          </span>

                          {contact.thread?.unread && (
                            <span className="size-2 rounded-full bg-[#FF6B35]" />
                          )}
                        </div>

                        <p className="mt-2 truncate text-xs text-slate-500">
                          {contact.thread?.lastMessage ||
                            'Start a conversation'}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          {/* CHAT PANEL */}
          <section
            aria-label="Active conversation"
            className={cn(
              'min-h-0 flex-col',
              showChatOnMobile
                ? 'flex'
                : 'hidden lg:flex'
            )}
          >
            {!activeContact ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B35]">
                  <MessageCircle className="size-8" />
                </div>

                <h2 className="mt-5 text-lg font-bold text-slate-900">
                  Your school conversations
                </h2>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Choose a school member to view your conversation
                  or send a new message.
                </p>
              </div>
            ) : (
              <>
                {/* ACTIVE CONTACT HEADER */}
                <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    aria-label="Back to contacts"
                    onClick={() =>
                      setShowChatOnMobile(false)
                    }
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
                  >
                    <ArrowLeft className="size-5" />
                  </button>

                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-[#d95324]">
                    {initials(activeContact.name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-slate-900">
                      {activeContact.name}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {roleLabels[activeContact.role]}
                      {activeContact.email
                        ? ` · ${activeContact.email}`
                        : ''}
                    </p>
                  </div>
                </div>

                {/* MESSAGE HISTORY */}
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-white px-4 py-6 sm:px-6">
                  {!activeThread ||
                    activeThread.messages.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <MessageCircle className="size-9 text-slate-300" />

                      <h3 className="mt-3 text-sm font-bold text-slate-800">
                        No messages yet
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Send your first message to start
                        this conversation.
                      </p>
                    </div>
                  ) : (
                    activeThread.messages.map((item) => {
                      const mine =
                        item.senderId ===
                        initialData.currentUser.id

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'flex flex-col',
                            mine
                              ? 'items-end'
                              : 'items-start'
                          )}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[75%]',
                              mine
                                ? 'rounded-br-md bg-[#FF6B35] text-white'
                                : 'rounded-bl-md bg-slate-100 text-slate-700'
                            )}
                          >
                            {item.content}
                          </div>

                          <span className="mt-1 px-1 text-[10px] text-slate-400">
                            {messageTime(item.createdAt)}
                          </span>
                        </div>
                      )
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* MESSAGE COMPOSER */}
                <form
                  onSubmit={submitMessage}
                  className="flex items-end gap-3 border-t border-slate-200 p-4"
                >
                  <textarea
                    value={message}
                    onChange={(e) =>
                      setMessage(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey
                      ) {
                        e.preventDefault()
                        e.currentTarget.form?.requestSubmit()
                      }
                    }}
                    maxLength={4000}
                    rows={2}
                    aria-label="Write a message"
                    placeholder="Write a message... (Enter to send)"
                    className="min-h-11 max-h-32 min-w-0 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#FF6B35]"
                  />

                  <button
                    type="submit"
                    disabled={
                      pending || !message.trim()
                    }
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white hover:bg-[#e95b29] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="hidden sm:inline">
                      {pending ? 'Sending...' : 'Send'}
                    </span>

                    {pending ? (
                      <Send className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                </form>

                <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
                  Messages are visible only to conversation
                  participants. Enter to send · Shift+Enter
                  for a new line.
                </div>
              </>
            )}
          </section>
        </div>
      </Card>
    </div>
  )
}
