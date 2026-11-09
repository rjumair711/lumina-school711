'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  History,
  KeyRound,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Undo2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  applyPresetToTeachers,
  getPermissionsData,
  saveTeacherPermissions,
  type PermissionsData,
} from '@/app/actions/permissions'
import {
  ALL_PERMISSIONS,
  PERMISSION_BY_KEY,
  PERMISSION_GROUPS,
  ROLE_PRESETS,
  matchPreset,
  withRequirements,
  withoutOrphans,
} from '@/lib/permissions'
import { Modal, inputClass, primaryButton, secondaryButton } from './tests-exams/forms'

const REFRESH_MS = 30_000
const TOTAL = ALL_PERMISSIONS.length

type Teacher = PermissionsData['teachers'][number]

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join()

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200',
        checked ? 'bg-[#FF6B35]' : 'bg-slate-200'
      )}
    >
      <span className={cn('absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}

function roleLabel(keys: string[]) {
  if (keys.length === 0) return { text: 'No access', tone: 'bg-slate-100 text-slate-500' }
  const preset = matchPreset(keys)
  if (preset) return { text: preset.name, tone: 'bg-orange-50 text-[#d95324]' }
  return { text: 'Custom', tone: 'bg-sky-50 text-sky-700' }
}

// ------------------------------------------------------------------
// Bulk assign dialog
// ------------------------------------------------------------------

function BulkAssign({
  teachers,
  onClose,
  onDone,
}: {
  teachers: Teacher[]
  onClose: () => void
  onDone: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [presetId, setPresetId] = useState(ROLE_PRESETS[1].id)
  const [mode, setMode] = useState<'replace' | 'add'>('replace')
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()

  const visible = teachers.filter((t) =>
    `${t.name} ${t.code}`.toLowerCase().includes(query.trim().toLowerCase())
  )
  const preset = ROLE_PRESETS.find((p) => p.id === presetId)!

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const submit = () =>
    startTransition(async () => {
      const res = await applyPresetToTeachers([...selected], presetId, mode)
      if (res.success) {
        toast.success(
          res.updated
            ? `Updated ${res.updated} teacher${res.updated === 1 ? '' : 's'}`
            : 'Selected teachers already had these permissions'
        )
        onDone()
        onClose()
      } else toast.error(res.error)
    })

  return (
    <Modal
      size="lg"
      title="Assign a role to several teachers"
      description="Every change is recorded in the activity log."
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-xs text-slate-500">{selected.size} selected</span>
          <button className={secondaryButton} onClick={onClose}>Cancel</button>
          <button className={primaryButton} onClick={submit} disabled={pending || selected.size === 0}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {mode === 'replace' ? 'Apply role' : 'Add permissions'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {ROLE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPresetId(p.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition',
                presetId === p.id ? 'border-[#FF6B35] bg-orange-50/60 ring-2 ring-orange-100' : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                {p.name}
                <span className="text-[11px] font-semibold text-slate-400">{p.permissions.length}/{TOTAL}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{p.description}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-1">
          {([
            ['replace', 'Replace current permissions'],
            ['add', 'Add to current permissions'],
          ] as const).map(([value, text]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={cn('flex-1 rounded-lg px-3 py-2 text-xs font-semibold', mode === value ? 'bg-white text-[#FF6B35] shadow-sm' : 'text-slate-500')}
            >
              {text}
            </button>
          ))}
        </div>
        {mode === 'replace' && (
          <p className="-mt-2 text-[11px] text-amber-700">
            Teachers will have exactly the {preset.permissions.length} permissions of “{preset.name}”. Anything else they have is removed.
          </p>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teachers" className={cn(inputClass, 'pl-9')} />
          </div>
          <button
            className={cn(secondaryButton, 'h-10 text-xs')}
            onClick={() =>
              setSelected((s) =>
                visible.every((t) => s.has(t.id))
                  ? new Set([...s].filter((id) => !visible.some((t) => t.id === id)))
                  : new Set([...s, ...visible.map((t) => t.id)])
              )
            }
          >
            {visible.length > 0 && visible.every((t) => selected.has(t.id)) ? 'Unselect all' : 'Select all'}
          </button>
        </div>

        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
          {visible.map((t) => {
            const role = roleLabel(t.permissions)
            return (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                  <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggle(t.id)} className="size-4 accent-[#FF6B35]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{t.name}</span>
                    <span className="text-[11px] text-slate-400">{t.code}</span>
                  </span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', role.tone)}>{role.text}</span>
                </label>
              </li>
            )
          })}
          {visible.length === 0 && <li className="px-3 py-6 text-center text-xs text-slate-400">No teachers found</li>}
        </ul>
      </div>
    </Modal>
  )
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function RolesPermissionsPage({ initialData }: { initialData: PermissionsData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [selectedId, setSelectedId] = useState(initialData.teachers[0]?.id ?? '')
  const [draft, setDraft] = useState<string[]>(initialData.teachers[0]?.permissions ?? [])
  const [baseVersion, setBaseVersion] = useState<string | null>(initialData.teachers[0]?.version ?? null)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [view, setView] = useState<'permissions' | 'activity'>('permissions')
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, startSaving] = useTransition()

  const teacher = data.teachers.find((t) => t.id === selectedId) ?? null

  // The permissions the current draft started from. Kept separately from the
  // live server copy so a background refresh never wipes unsaved edits.
  const baseRef = useRef<string[]>(initialData.teachers[0]?.permissions ?? [])
  const dirty = teacher !== null && !sameSet(draft, baseRef.current)

  const remoteChanged = teacher !== null && teacher.version !== baseVersion

  const select = (t: Teacher) => {
    setSelectedId(t.id)
    setDraft(t.permissions)
    setBaseVersion(t.version)
    baseRef.current = t.permissions
    setConflict(false)
    setPendingSwitch(null)
  }

  const requestSelect = (t: Teacher) => {
    if (t.id === selectedId) return
    if (dirty) setPendingSwitch(t.id)
    else select(t)
  }

  // ---------------- Live refresh ----------------
  const reqId = useRef(0)
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const reload = useCallback(
    async (silent = false) => {
      const id = ++reqId.current
      if (!silent) setRefreshing(true)
      try {
        const res = await getPermissionsData()
        if (id !== reqId.current) return
        if (res.success) setData(res.data)
        else if (res.unauthorized) router.replace('/')
        else if (!silent) toast.error(res.error)
      } finally {
        if (id === reqId.current) setRefreshing(false)
      }
    },
    [router]
  )

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && !bulkOpen && reload(true)
    const interval = window.setInterval(tick, REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload, bulkOpen])

  // When fresh data arrives: follow remote changes unless the admin is editing.
  useEffect(() => {
    if (!teacher) {
      if (data.teachers[0]) select(data.teachers[0])
      return
    }
    if (teacher.version !== baseVersion && !dirtyRef.current) {
      setDraft(teacher.permissions)
      setBaseVersion(teacher.version)
      baseRef.current = teacher.permissions
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // ---------------- Editing ----------------
  const draftSet = new Set(draft)
  const baseSet = new Set(baseRef.current)

  const toggle = (key: string) => {
    const on = draftSet.has(key)
    setDraft(on ? withoutOrphans(draft.filter((k) => k !== key)) : withRequirements([...draft, key]))
  }

  const toggleGroup = (keys: string[]) => {
    const allOn = keys.every((k) => draftSet.has(k))
    setDraft(allOn ? withoutOrphans(draft.filter((k) => !keys.includes(k))) : withRequirements([...draft, ...keys]))
  }

  const added = draft.filter((k) => !baseSet.has(k))
  const removed = [...baseSet].filter((k) => !draftSet.has(k))
  const changes = { added, removed, count: added.length + removed.length }

  const save = () => {
    if (!teacher || !changes.count || saving) return
    startSaving(async () => {
      const res = await saveTeacherPermissions(teacher.id, draft, baseVersion)
      if (res.success) {
        toast.success(`Saved ${res.changed} change${res.changed === 1 ? '' : 's'} for ${teacher.name}`)
        setBaseVersion(res.version)
        baseRef.current = draft
        setConflict(false)
        reload(true)
      } else if (res.conflict) {
        setConflict(true)
        reload(true)
      } else {
        toast.error(res.error)
      }
    })
  }

  const discard = () => {
    if (!teacher) return
    setDraft(teacher.permissions)
    setBaseVersion(teacher.version)
    baseRef.current = teacher.permissions
    setConflict(false)
  }

  // Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !bulkOpen) {
        e.preventDefault()
        save()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // ---------------- Teacher list ----------------
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.teachers.filter((t) => {
      if (q && !`${t.name} ${t.code} ${t.email}`.toLowerCase().includes(q)) return false
      if (roleFilter) {
        const label = roleLabel(t.permissions).text
        if (label !== roleFilter) return false
      }
      return true
    })
  }, [data.teachers, query, roleFilter])

  const teacherLogs = data.logs.filter((l) => l.teacherId === selectedId)
  const role = roleLabel(draft)

  // ------------------------------------------------------------------

  if (data.teachers.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader data={data} refreshing={refreshing} onRefresh={() => reload()} onBulk={() => {}} canBulk={false} />
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Users className="size-8 text-slate-300" />
          <div className="text-sm font-semibold text-slate-700">No teachers yet</div>
          <p className="max-w-sm text-xs text-slate-400">Add teachers on the Teachers page, then come back here to decide what each of them can do.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader data={data} refreshing={refreshing} onRefresh={() => reload()} onBulk={() => setBulkOpen(true)} canBulk />

      <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
        <KeyRound className="mt-0.5 size-4 shrink-0" />
        <p>
          Permissions apply to the classes and subjects each teacher is assigned to. They take effect when the teacher signs in.
          Administrators ({data.admins.map((a) => a.name).join(', ')}) always have full access.
        </p>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr]">
        {/* Teacher list */}
        <section className="flex min-h-0 flex-col border-b border-slate-200 lg:max-h-[calc(100vh-220px)] lg:border-b-0 lg:border-r" aria-label="Teachers">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teachers" className={cn(inputClass, 'pl-9')} />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={inputClass} aria-label="Filter by role">
              <option value="">All roles ({data.teachers.length})</option>
              {['No access', 'Custom', ...ROLE_PRESETS.map((p) => p.name)].map((r) => (
                <option key={r} value={r}>
                  {r} ({data.teachers.filter((t) => roleLabel(t.permissions).text === r).length})
                </option>
              ))}
            </select>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {list.map((t) => {
              const active = t.id === selectedId
              const r = roleLabel(active ? draft : t.permissions)
              const count = active ? draft.length : t.permissions.length
              return (
                <button
                  key={t.id}
                  onClick={() => requestSelect(t)}
                  className={cn('relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', active ? 'bg-orange-50' : 'hover:bg-slate-50')}
                >
                  <span className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#FF6B35]', active ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#d95324]">
                    {initials(t.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-slate-800">{t.name}</span>
                      {active && dirty && <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved changes" />}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className={cn('rounded-full px-1.5 py-px font-semibold', r.tone)}>{r.text}</span>
                      {count}/{TOTAL}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-slate-300" />
                </button>
              )
            })}
            {list.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-400">No teachers match.</p>}
          </div>
        </section>

        {/* Editor */}
        {teacher && (
          <section className="flex min-h-0 min-w-0 flex-col lg:max-h-[calc(100vh-220px)]" aria-label="Permission settings">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-start gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-[#d95324]">
                  {initials(teacher.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{teacher.name}</h2>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', role.tone)}>{role.text}</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        teacher.canSignIn ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      )}
                      title={teacher.canSignIn ? 'This teacher can sign in' : 'No password set for this account yet'}
                    >
                      <Lock className="size-3" /> {teacher.canSignIn ? 'Can sign in' : 'Sign-in not set up'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {teacher.code}{teacher.email && ` · ${teacher.email}`}
                    {teacher.updatedLabel && ` · permissions changed ${teacher.updatedLabel}`}
                  </p>
                  {(teacher.classTeacherOf.length > 0 || teacher.teaches.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {teacher.classTeacherOf.map((c) => (
                        <span key={c} className="rounded-md bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-[#d95324]">Class teacher · {c}</span>
                      ))}
                      {teacher.teaches.slice(0, 6).map((t) => (
                        <span key={t} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{t}</span>
                      ))}
                      {teacher.teaches.length > 6 && <span className="text-[11px] text-slate-400">+{teacher.teaches.length - 6} more</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg bg-slate-100 p-0.5">
                  {([
                    ['permissions', 'Permissions', ShieldCheck],
                    ['activity', `Activity (${teacherLogs.length})`, History],
                  ] as const).map(([v, text, Icon]) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold', view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
                    >
                      <Icon className="size-3.5" /> {text}
                    </button>
                  ))}
                </div>
                {view === 'permissions' && (
                  <>
                    <select
                      value=""
                      onChange={(e) => {
                        const p = ROLE_PRESETS.find((x) => x.id === e.target.value)
                        if (p) setDraft(withRequirements(p.permissions))
                      }}
                      className={cn(inputClass, 'h-9 w-auto text-xs')}
                      aria-label="Apply a role"
                    >
                      <option value="">Apply a role…</option>
                      {ROLE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.permissions.length})</option>)}
                    </select>
                    <select
                      value=""
                      onChange={(e) => {
                        const from = data.teachers.find((t) => t.id === e.target.value)
                        if (from) setDraft(from.permissions)
                      }}
                      className={cn(inputClass, 'h-9 w-auto text-xs')}
                      aria-label="Copy permissions from another teacher"
                    >
                      <option value="">Copy from…</option>
                      {data.teachers.filter((t) => t.id !== teacher.id).map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.permissions.length})</option>
                      ))}
                    </select>
                    <button className="ml-auto text-xs font-semibold text-slate-500 hover:text-rose-600" onClick={() => setDraft([])} disabled={draft.length === 0}>
                      Remove all
                    </button>
                  </>
                )}
              </div>
            </div>

            {(conflict || (remoteChanged && dirty)) && (
              <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="flex-1">Another administrator changed {teacher.name}&apos;s permissions while you were editing.</span>
                <button className="font-semibold underline" onClick={discard}>Load latest</button>
              </div>
            )}

            {pendingSwitch && (
              <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="flex-1">You have {changes.count} unsaved change{changes.count === 1 ? '' : 's'} for {teacher.name}.</span>
                <button className="font-semibold underline" onClick={() => setPendingSwitch(null)}>Keep editing</button>
                <button
                  className="font-semibold text-rose-700 underline"
                  onClick={() => {
                    const t = data.teachers.find((x) => x.id === pendingSwitch)
                    if (t) select(t)
                  }}
                >
                  Discard and switch
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {view === 'permissions' ? (
                <div className="grid gap-6 xl:grid-cols-2">
                  {PERMISSION_GROUPS.map((group) => {
                    const keys = group.items.map((i) => i.key)
                    const on = keys.filter((k) => draftSet.has(k)).length
                    return (
                      <div key={group.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            {group.title} <span className="ml-1 tracking-normal text-slate-300">{on}/{keys.length}</span>
                          </h3>
                          <button onClick={() => toggleGroup(keys)} className="text-[11px] font-semibold text-[#FF6B35] hover:underline">
                            {on === keys.length ? 'Turn all off' : 'Turn all on'}
                          </button>
                        </div>
                        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                          {group.items.map((item) => {
                            const checked = draftSet.has(item.key)
                            const changed = checked !== baseSet.has(item.key)
                            return (
                              <div
                                key={item.key}
                                className={cn(
                                  'flex items-start justify-between gap-4 px-4 py-3 transition-colors',
                                  changed && (checked ? 'bg-emerald-50/60' : 'bg-rose-50/60')
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-800">
                                    {item.label}
                                    {item.sensitive && (
                                      <span className="rounded bg-amber-50 px-1.5 py-px text-[10px] font-semibold text-amber-700">Sensitive</span>
                                    )}
                                    {changed && (
                                      <span className={cn('text-[10px] font-bold', checked ? 'text-emerald-600' : 'text-rose-600')}>
                                        {checked ? '+ granted' : '− removed'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                                  {item.requires && (
                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                      Needs: {item.requires.map((r) => PERMISSION_BY_KEY.get(r)?.label).join(', ')}
                                    </p>
                                  )}
                                </div>
                                <Switch checked={checked} onChange={() => toggle(item.key)} label={item.label} />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : teacherLogs.length ? (
                <ol className="relative flex flex-col gap-4 border-l border-slate-200 pl-5">
                  {teacherLogs.map((log) => (
                    <li key={log.id} className="relative">
                      <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-white bg-[#FF6B35] ring-1 ring-orange-200" />
                      <div className="text-xs text-slate-500">
                        <b className="text-slate-800">{log.changedBy}</b> · <span title={log.at}>{log.when}</span>
                        {log.note && <span className="ml-1 text-slate-400">· {log.note}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {log.added.map((k) => (
                          <span key={`a${k}`} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">+ {PERMISSION_BY_KEY.get(k)?.label ?? k}</span>
                        ))}
                        {log.removed.map((k) => (
                          <span key={`r${k}`} className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">− {PERMISSION_BY_KEY.get(k)?.label ?? k}</span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
                  <History className="size-6 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">No changes recorded yet</p>
                  <p className="text-xs text-slate-400">Every saved change will show here with who made it.</p>
                </div>
              )}
            </div>

            {/* Save bar */}
            <div
              className={cn(
                'flex flex-wrap items-center gap-3 border-t px-5 py-3 transition-colors',
                changes.count ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-white'
              )}
            >
              <span className="text-xs text-slate-600">
                {changes.count ? (
                  <>
                    <b className="text-slate-900">{changes.count} unsaved change{changes.count === 1 ? '' : 's'}</b>
                    {changes.added.length > 0 && <span className="ml-2 text-emerald-700">+{changes.added.length}</span>}
                    {changes.removed.length > 0 && <span className="ml-1 text-rose-700">−{changes.removed.length}</span>}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-400"><Check className="size-3.5" /> All changes saved · {draft.length}/{TOTAL} enabled</span>
                )}
              </span>
              <div className="ml-auto flex gap-2">
                <button className={cn(secondaryButton, 'h-9')} onClick={discard} disabled={!changes.count || saving}>
                  <Undo2 className="size-4" /> Discard
                </button>
                <button className={cn(primaryButton, 'h-9')} onClick={save} disabled={!changes.count || saving} title="Ctrl + S">
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* School-wide activity */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><History className="size-4 text-slate-400" /> Recent permission changes</h3>
        {data.logs.length ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {data.logs.slice(0, 8).map((log) => (
              <li key={log.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-xs">
                <button
                  className="font-semibold text-slate-800 hover:text-[#FF6B35]"
                  onClick={() => {
                    const t = data.teachers.find((x) => x.id === log.teacherId)
                    if (t) requestSelect(t)
                  }}
                >
                  {log.teacherName}
                </button>
                <span className="text-emerald-700">{log.added.length ? `+${log.added.length}` : ''}</span>
                <span className="text-rose-700">{log.removed.length ? `−${log.removed.length}` : ''}</span>
                {log.note && <span className="text-slate-500">{log.note}</span>}
                <span className="ml-auto text-slate-400" title={log.at}>by {log.changedBy} · {log.when}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-400">No permission changes have been made yet.</p>
        )}
      </section>

      {bulkOpen && <BulkAssign teachers={data.teachers} onClose={() => setBulkOpen(false)} onDone={() => reload(true)} />}
    </div>
  )
}

function PageHeader({
  data,
  refreshing,
  onRefresh,
  onBulk,
  canBulk,
}: {
  data: PermissionsData
  refreshing: boolean
  onRefresh: () => void
  onBulk: () => void
  canBulk: boolean
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-[#FF6B35]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Roles &amp; Permissions</h1>
        </div>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Live · Updated {data.generatedLabel}
        </p>
      </div>
      <div className="flex gap-2">
        <button className={secondaryButton} onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} /> Refresh
        </button>
        {canBulk && (
          <button className={primaryButton} onClick={onBulk}>
            <Copy className="size-4" /> Assign role to many
          </button>
        )}
      </div>
    </div>
  )
}
