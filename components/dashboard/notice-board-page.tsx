
'use client'

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  NoticeAudience,
  NoticeStatus,
  Priority,
} from '@prisma/client'
import {
  AlertTriangle,
  CalendarDays,
  Megaphone,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
  Archive,
  Clock3,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getNoticeBoardData,
  saveNotice,
  deleteNotice,
  setNoticeStatus,
  toggleNoticePin,
} from '@/app/actions/notices'

type Data = Awaited<ReturnType<typeof getNoticeBoardData>>
type Notice = Data['notices'][number]
type Tab = 'All' | 'Published' | 'Scheduled' | 'Drafts' | 'Archived'

type NoticeForm = {
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

const emptyForm: NoticeForm = {
  title: '',
  description: '',
  priority: Priority.MEDIUM,
  status: NoticeStatus.PUBLISHED,
  audience: NoticeAudience.EVERYONE,
  classId: null,
  isPinned: false,
  publishAt: null,
  expiresAt: null,
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#FF6B35]'

const primaryClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e95b29] disabled:cursor-not-allowed disabled:opacity-50'

const audienceLabels: Record<NoticeAudience, string> = {
  EVERYONE: 'Everyone',
  TEACHERS: 'Teachers',
  STUDENTS: 'Students',
  PARENTS: 'Parents',
  CLASS: 'Specific Class',
}

function getDisplayStatus(
  notice: Notice,
  now: number
): 'Draft' | 'Published' | 'Scheduled' | 'Expired' | 'Archived' {
  if (notice.status === NoticeStatus.DRAFT) return 'Draft'
  if (notice.status === NoticeStatus.ARCHIVED) return 'Archived'

  if (notice.publishAt && new Date(notice.publishAt).getTime() > now) {
    return 'Scheduled'
  }

  if (notice.expiresAt && new Date(notice.expiresAt).getTime() <= now) {
    return 'Expired'
  }

  return 'Published'
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function localDateInput(value: string | null) {
  if (!value) return ''

  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16)
}

function toISO(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString()
}

export default function NoticeBoardPage({
  initialData,
}: {
  initialData: Data
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [tab, setTab] = useState<Tab>('All')
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [audienceFilter, setAudienceFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState<NoticeForm>(emptyForm)
  const [publishDate, setPublishDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  // Keeps time-based labels current, even without page navigation.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const interval = window.setInterval(() => {
      setNow(Date.now())

      if (
        document.visibilityState === 'visible' &&
        !dialogOpen &&
        !pending
      ) {
        router.refresh()
      }
    }, 30000)

    return () => window.clearInterval(interval)
  }, [router, dialogOpen, pending])

  const currentTime = now ?? 0

  const statistics = useMemo(() => {
    const notices = initialData.notices
    return {
      total: notices.length,
      published: notices.filter(
        n => getDisplayStatus(n, currentTime) === 'Published'
      ).length,
      scheduled: notices.filter(
        n => getDisplayStatus(n, currentTime) === 'Scheduled'
      ).length,
      drafts: notices.filter(
        n => n.status === NoticeStatus.DRAFT
      ).length,
      urgent: notices.filter(
        n =>
          n.priority === Priority.HIGH &&
          getDisplayStatus(n, currentTime) === 'Published'
      ).length,
    }
  }, [initialData.notices, currentTime])

  const visibleNotices = useMemo(() => {
    const search = query.trim().toLowerCase()

    return initialData.notices.filter((notice) => {
      const status = getDisplayStatus(notice, currentTime)

      const matchesTab =
        tab === 'All' ||
        (tab === 'Drafts' && status === 'Draft') ||
        (tab === 'Archived' && status === 'Archived') ||
        (tab === 'Published' && status === 'Published') ||
        (tab === 'Scheduled' && status === 'Scheduled')

      const matchesPriority =
        !priorityFilter || notice.priority === priorityFilter

      const matchesAudience =
        !audienceFilter || notice.audience === audienceFilter

      const matchesSearch =
        !search ||
        [notice.title, notice.description, notice.author]
          .some(v => v.toLowerCase().includes(search))

      return (
        matchesTab &&
        matchesPriority &&
        matchesAudience &&
        matchesSearch
      )
    }).sort((a, b) =>
      Number(b.isPinned) - Number(a.isPinned) ||
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    )
  }, [
    initialData.notices,
    tab,
    query,
    priorityFilter,
    audienceFilter,
    currentTime,
  ])

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setPublishDate('')
    setExpiryDate('')
    setDialogOpen(true)
  }

  function openEdit(notice: Notice) {
    setEditingId(notice.id)
    setForm({
      title: notice.title,
      description: notice.description,
      priority: notice.priority,
      status: notice.status,
      audience: notice.audience,
      classId: notice.classId,
      isPinned: notice.isPinned,
      publishAt: notice.publishAt,
      expiresAt: notice.expiresAt,
    })
    setPublishDate(localDateInput(notice.publishAt))
    setExpiryDate(localDateInput(notice.expiresAt))
    setDialogOpen(true)
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      form.audience === NoticeAudience.CLASS &&
      !form.classId
    ) {
      toast.error('Select a target class.')
      return
    }

    const payload = {
      ...form,
      publishAt: toISO(publishDate),
      expiresAt: toISO(expiryDate),
    }

    startTransition(async () => {
      const result = await saveNotice(
        payload,
        editingId ?? undefined
      )

      if (!result.success) {
        toast.error(result.error || 'Unable to save notice.')
        return
      }

      toast.success(
        editingId ? 'Notice updated' : 'Notice created'
      )

      setDialogOpen(false)
      setEditingId(null)
      router.refresh()
    })
  }

  function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}" permanently?`)) return

    startTransition(async () => {
      const result = await deleteNotice(id)

      if (!result.success) {
        toast.error(result.error || 'Unable to delete notice.')
        return
      }

      toast.success('Notice deleted')
      router.refresh()
    })
  }

  function changeStatus(id: string, status: NoticeStatus) {
    startTransition(async () => {
      const result = await setNoticeStatus(id, status)

      if (!result.success) {
        toast.error(result.error || 'Unable to update status.')
        return
      }

      toast.success('Notice status updated')
      router.refresh()
    })
  }

  function togglePin(id: string) {
    startTransition(async () => {
      const result = await toggleNoticePin(id)

      if (!result.success) {
        toast.error(result.error || 'Unable to pin notice.')
        return
      }

      toast.success('Pin setting updated')
      router.refresh()
    })
  }

  const tabs: Tab[] = [
    'All', 'Published', 'Scheduled', 'Drafts', 'Archived',
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Notice Board
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage announcements and important school updates.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className={primaryClass}
        >
          <Plus className="size-4" />
          New Notice
        </button>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Notices', value: statistics.total, icon: Megaphone },
          { label: 'Published', value: statistics.published, icon: CalendarDays },
          { label: 'Scheduled', value: statistics.scheduled, icon: Clock3 },
          { label: 'Urgent Active', value: statistics.urgent, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-orange-50 p-2.5 text-[#FF6B35]">
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="text-[11px] text-slate-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {tabs.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                tab === item
                  ? 'bg-orange-50 text-[#FF6B35]'
                  : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search announcements..."
              aria-label="Search notices"
              className={cn(fieldClass, 'pl-10')}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className={fieldClass}
            aria-label="Filter priority"
          >
            <option value="">All Priorities</option>
            {Object.values(Priority).map(p => (
              <option value={p} key={p}>{p}</option>
            ))}
          </select>

          <select
            value={audienceFilter}
            onChange={e => setAudienceFilter(e.target.value)}
            className={fieldClass}
            aria-label="Filter audience"
          >
            <option value="">All Audiences</option>
            {Object.values(NoticeAudience).map(a => (
              <option value={a} key={a}>
                {audienceLabels[a]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* NOTICE LIST */}
      {visibleNotices.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="py-14 text-center">
            <Megaphone className="mx-auto size-8 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-700">
              No notices found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create an announcement or adjust your filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleNotices.map(notice => {
            const status = getDisplayStatus(notice, currentTime)

            return (
              <Card
                key={notice.id}
                className={cn(
                  'border-slate-200 shadow-sm',
                  notice.isPinned && 'border-orange-200'
                )}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B35]">
                      {notice.priority === Priority.HIGH
                        ? <AlertTriangle className="size-5" />
                        : <Megaphone className="size-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">
                          {notice.title}
                        </h2>

                        <Badge className={cn(
                          'text-[10px]',
                          notice.priority === Priority.HIGH
                            ? 'bg-rose-50 text-rose-700'
                            : notice.priority === Priority.MEDIUM
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-slate-100 text-slate-600'
                        )}>
                          {notice.priority}
                        </Badge>

                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            status === 'Published'
                              ? 'bg-emerald-50 text-emerald-700'
                              : status === 'Scheduled'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {status}
                        </Badge>

                        {notice.isPinned && (
                          <Pin className="size-3.5 text-[#FF6B35]" />
                        )}
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {notice.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {formatDate(notice.createdAt)}
                        </span>
                        <span>By {notice.author}</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3.5" />
                          {notice.audience === NoticeAudience.CLASS
                            ? `Class ${notice.className || 'Unassigned'}`
                            : audienceLabels[notice.audience]}
                        </span>
                        {notice.publishAt && (
                          <span>Publish: {formatDate(notice.publishAt)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => togglePin(notice.id)}
                        title={notice.isPinned ? 'Unpin' : 'Pin notice'}
                        aria-label={notice.isPinned ? 'Unpin notice' : 'Pin notice'}
                        className="rounded-lg p-2 text-slate-400 hover:bg-orange-50 hover:text-[#FF6B35]"
                      >
                        <Pin className="size-4" />
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => openEdit(notice)}
                        title="Edit notice"
                        aria-label={`Edit ${notice.title}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          changeStatus(
                            notice.id,
                            notice.status === NoticeStatus.ARCHIVED
                              ? NoticeStatus.DRAFT
                              : NoticeStatus.ARCHIVED
                          )
                        }
                        title={notice.status === NoticeStatus.ARCHIVED
                          ? 'Restore to draft'
                          : 'Archive notice'}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Archive className="size-4" />
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => remove(notice.id, notice.title)}
                        title="Delete notice"
                        aria-label={`Delete ${notice.title}`}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="notice-dialog-title"
            className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 id="notice-dialog-title" className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Notice' : 'Create New Notice'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Share an update with your school community.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                disabled={pending}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={save} className="space-y-4">
              <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <label htmlFor="notice-title" className="text-xs font-semibold">
                    Title *
                  </label>
                  <input
                    id="notice-title"
                    required
                    maxLength={200}
                    value={form.title}
                    onChange={e =>
                      setForm(f => ({ ...f, title: e.target.value }))
                    }
                    className={fieldClass}
                    placeholder="e.g. Parent–Teacher Meeting"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="notice-desc" className="text-xs font-semibold">
                    Description *
                  </label>
                  <textarea
                    id="notice-desc"
                    required
                    maxLength={10000}
                    rows={5}
                    value={form.description}
                    onChange={e =>
                      setForm(f => ({ ...f, description: e.target.value }))
                    }
                    className={cn(fieldClass, 'resize-y')}
                    placeholder="Write your announcement..."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Priority</label>
                    <select
                      value={form.priority}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          priority: e.target.value as Priority,
                        }))
                      }
                      className={fieldClass}
                    >
                      {Object.values(Priority).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Publication Status</label>
                    <select
                      value={form.status}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          status: e.target.value as NoticeStatus,
                        }))
                      }
                      className={fieldClass}
                    >
                      <option value={NoticeStatus.PUBLISHED}>Published</option>
                      <option value={NoticeStatus.DRAFT}>Draft</option>
                      <option value={NoticeStatus.ARCHIVED}>Archived</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Audience</label>
                    <select
                      value={form.audience}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          audience: e.target.value as NoticeAudience,
                          classId: null,
                        }))
                      }
                      className={fieldClass}
                    >
                      {Object.values(NoticeAudience).map(a => (
                        <option key={a} value={a}>
                          {audienceLabels[a]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.audience === NoticeAudience.CLASS && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Target Class</label>
                      <select
                        required
                        value={form.classId ?? ''}
                        onChange={e =>
                          setForm(f => ({
                            ...f,
                            classId: e.target.value || null,
                          }))
                        }
                        className={fieldClass}
                      >
                        <option value="">Select Class</option>
                        {initialData.classes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">
                      Publish At (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={publishDate}
                      onChange={e => setPublishDate(e.target.value)}
                      className={fieldClass}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">
                      Expires At (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        isPinned: e.target.checked,
                      }))
                    }
                    className="size-4 accent-[#FF6B35]"
                  />
                  Pin this notice to the top
                </label>

                <p className="text-xs text-slate-500">
                  Author: {editingId
                    ? initialData.notices.find(n => n.id === editingId)?.author
                    : initialData.currentUser.name}
                </p>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className={primaryClass}
                >
                  {pending
                    ? 'Saving...'
                    : editingId
                    ? 'Save Changes'
                    : 'Create Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
