'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  BookOpen,
  Check,
  Copy,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserX,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  changeAssignmentTeacher,
  copyClassAssignments,
  deleteSubject,
  getSubjectClassData,
  removeClassAssignment,
  saveClassAssignments,
  saveSubject,
  type SubjectClassData,
} from '@/app/actions/subject-class'
import { ConfirmDialog, Modal, inputClass, labelClass, primaryButton, secondaryButton } from './tests-exams/forms'

const REFRESH_MS = 30_000

type Tab = 'assign' | 'subjects' | 'teachers' | 'coverage'
type Subject = SubjectClassData['subjects'][number]

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

function Coverage({ done, total }: { done: number; total: number }) {
  const p = pct(done, total)
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cn('h-full rounded-full', total === 0 ? 'bg-slate-200' : p === 100 ? 'bg-emerald-500' : p >= 50 ? 'bg-[#FF6B35]' : 'bg-rose-500')} style={{ width: `${total ? Math.max(p, 4) : 0}%` }} />
    </div>
  )
}

// ------------------------------------------------------------------
// Subject dialog
// ------------------------------------------------------------------

function SubjectDialog({ subject, onClose, onSaved }: { subject: Subject | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: subject?.name ?? '', code: subject?.code ?? '', description: subject?.description ?? '' })
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    start(async () => {
      const res = await saveSubject(form, subject?.id)
      if (res.success) {
        toast.success(subject ? 'Subject updated' : 'Subject created')
        onSaved()
        onClose()
      } else setError(res.error)
    })
  }

  return (
    <Modal
      title={subject ? 'Edit subject' : 'New subject'}
      description="Subjects are shared by every class in your school."
      onClose={onClose}
      footer={
        <>
          <button className={secondaryButton} onClick={onClose} type="button">Cancel</button>
          <button className={primaryButton} form="subject-form" type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {subject ? 'Save changes' : 'Create subject'}
          </button>
        </>
      }
    >
      <form id="subject-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <label className={labelClass}>
          Subject name *
          <input
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => {
              const name = e.target.value
              setForm((f) => ({
                ...f,
                name,
                // Suggest a code while creating, until the admin edits it.
                code: subject || f.code !== suggestCode(f.name) ? f.code : suggestCode(name),
              }))
            }}
            placeholder="e.g. Mathematics"
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Code *
          <input required maxLength={30} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') }))} placeholder="MATH" className={cn(inputClass, 'font-mono')} />
        </label>
        <label className={cn(labelClass, 'sm:col-span-2')}>
          Description
          <textarea rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" className={cn(inputClass, 'h-auto py-2')} />
        </label>
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 sm:col-span-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {error}
          </div>
        )}
      </form>
    </Modal>
  )
}

function suggestCode(name: string) {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  return (words.length === 1 ? words[0].slice(0, 4) : words.map((w) => w[0]).join('')).slice(0, 8)
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function SubjectClassPage({ initialData }: { initialData: SubjectClassData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [tab, setTab] = useState<Tab>('assign')
  const [classId, setClassId] = useState(initialData.classes[0]?.id ?? '')
  const [classQuery, setClassQuery] = useState('')
  const [subjectQuery, setSubjectQuery] = useState('')
  const [picked, setPicked] = useState<Record<string, string>>({}) // subjectId -> teacherId ('' = later)
  const [copyFrom, setCopyFrom] = useState('')
  const [copyTeachers, setCopyTeachers] = useState(true)
  const [busyRow, setBusyRow] = useState<string | null>(null)
  const [subjectDialog, setSubjectDialog] = useState<{ subject: Subject | null } | null>(null)
  const [confirm, setConfirm] = useState<{ title: string; message: string; run: () => Promise<boolean> } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pending, start] = useTransition()

  const reqId = useRef(0)
  const pausePolling = useRef(false)
  pausePolling.current = Boolean(subjectDialog || confirm || Object.keys(picked).length)

  const reload = useCallback(
    async (silent = false) => {
      const id = ++reqId.current
      if (!silent) setRefreshing(true)
      try {
        const res = await getSubjectClassData()
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
    const tick = () => document.visibilityState === 'visible' && !pausePolling.current && reload(true)
    const interval = window.setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [reload])

  useEffect(() => {
    setPicked({})
    setCopyFrom('')
  }, [classId])

  // ---------------- Derived ----------------
  const subjectById = useMemo(() => new Map(data.subjects.map((s) => [s.id, s])), [data.subjects])
  const teacherById = useMemo(() => new Map(data.teachers.map((t) => [t.id, t])), [data.teachers])

  const byClass = useMemo(() => {
    const map = new Map<string, SubjectClassData['assignments']>()
    for (const a of data.assignments) map.set(a.classId, [...(map.get(a.classId) ?? []), a])
    return map
  }, [data.assignments])

  const teacherLoad = useMemo(() => {
    const map = new Map<string, { subjects: Set<string>; classes: Set<string>; rows: SubjectClassData['assignments'] }>()
    for (const a of data.assignments) {
      if (!a.teacherId) continue
      const entry = map.get(a.teacherId) ?? { subjects: new Set(), classes: new Set(), rows: [] }
      entry.subjects.add(a.subjectId)
      entry.classes.add(a.classId)
      entry.rows.push(a)
      map.set(a.teacherId, entry)
    }
    return map
  }, [data.assignments])

  const selectedClass = data.classes.find((c) => c.id === classId) ?? null
  const rows = (byClass.get(classId) ?? []).slice().sort((a, b) => (subjectById.get(a.subjectId)?.name ?? '').localeCompare(subjectById.get(b.subjectId)?.name ?? ''))
  const assignedIds = new Set(rows.map((r) => r.subjectId))
  const available = data.subjects.filter((s) => !assignedIds.has(s.id))

  const kpis = {
    noTeacher: data.assignments.filter((a) => !a.teacherId).length,
    emptyClasses: data.classes.filter((c) => !(byClass.get(c.id)?.length)).length,
    idleTeachers: data.teachers.filter((t) => !teacherLoad.has(t.id)).length,
  }

  const classList = data.classes.filter((c) => c.displayName.toLowerCase().includes(classQuery.trim().toLowerCase()))

  // ---------------- Actions ----------------
  const addPicked = () =>
    start(async () => {
      const items = Object.entries(picked).map(([subjectId, teacherId]) => ({ subjectId, teacherId: teacherId || null }))
      const res = await saveClassAssignments(classId, items)
      if (res.success) {
        toast.success(`Added ${res.added} subject${res.added === 1 ? '' : 's'} to Class ${selectedClass?.displayName}`)
        setPicked({})
        reload(true)
      } else toast.error(res.error)
    })

  const changeTeacher = async (assignmentId: string, teacherId: string) => {
    setBusyRow(assignmentId)
    const res = await changeAssignmentTeacher(assignmentId, teacherId || null)
    setBusyRow(null)
    if (res.success) {
      toast.success(res.movedLessons ? `Teacher changed · ${res.movedLessons} timetable lesson${res.movedLessons === 1 ? '' : 's'} updated` : 'Teacher changed')
      reload(true)
    } else toast.error(res.error)
  }

  const copy = () =>
    start(async () => {
      const res = await copyClassAssignments(copyFrom, classId, copyTeachers)
      if (res.success) {
        toast.success(res.added ? `Copied ${res.added} subject${res.added === 1 ? '' : 's'}` : 'All of those subjects were already assigned')
        setCopyFrom('')
        reload(true)
      } else toast.error(res.error)
    })

  const teacherOptions = (current: string | null) =>
    data.teachers.map((t) => (
      <option key={t.id} value={t.id}>
        {t.name}{t.id !== current ? ` · ${teacherLoad.get(t.id)?.rows.length ?? 0} assigned` : ''}
      </option>
    ))

  const tabs: { id: Tab; label: string; icon: typeof BookOpen; badge?: number }[] = [
    { id: 'assign', label: 'Class assignments', icon: Users },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, badge: data.subjects.length },
    { id: 'teachers', label: 'Teacher workload', icon: GraduationCap, badge: data.teachers.length },
    { id: 'coverage', label: 'Coverage', icon: LayoutGrid },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subject &amp; Class</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Who teaches what, in every class · updated {data.generatedLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <button className={secondaryButton} onClick={() => reload()} disabled={refreshing}>
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} /> Refresh
          </button>
          <button className={primaryButton} onClick={() => setSubjectDialog({ subject: null })}>
            <Plus className="size-4" /> New subject
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Subjects', data.subjects.length, `${data.assignments.length} class assignments`, BookOpen, 'bg-orange-50 text-[#FF6B35]', null],
          ['Without a teacher', kpis.noTeacher, 'Class subjects to staff', UserX, kpis.noTeacher ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600', 'coverage'],
          ['Classes with no subjects', kpis.emptyClasses, `of ${data.classes.length} classes`, LayoutGrid, kpis.emptyClasses ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600', 'coverage'],
          ['Teachers not assigned', kpis.idleTeachers, `of ${data.teachers.length} teachers`, GraduationCap, kpis.idleTeachers ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600', 'teachers'],
        ].map(([label, value, hint, Icon, tone, target]) => {
          const I = Icon as typeof BookOpen
          return (
            <button
              key={label as string}
              onClick={() => target && setTab(target as Tab)}
              className={cn('flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm', target && 'transition hover:border-orange-200')}
            >
              <div>
                <div className="text-xs font-medium text-slate-500">{label as string}</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value as number}</div>
                <div className="mt-1 text-xs text-slate-400">{hint as string}</div>
              </div>
              <div className={cn('flex size-10 items-center justify-center rounded-xl', tone as string)}>
                <I className="size-5" />
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" role="tablist">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn('flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-semibold transition sm:text-sm', tab === id ? 'bg-white text-[#FF6B35] shadow-sm' : 'text-slate-500 hover:text-slate-800')}
          >
            <Icon className="size-4" /> {label}
            {badge !== undefined && <span className={cn('rounded-full px-1.5 text-[10px]', tab === id ? 'bg-orange-50' : 'bg-slate-200/70')}>{badge}</span>}
          </button>
        ))}
      </div>

      {/* ---------------- Assignments ---------------- */}
      {tab === 'assign' &&
        (data.classes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Create classes on the <Link href="/admin/classes" className="font-semibold text-[#FF6B35] hover:underline">Classes page</Link> first.
          </div>
        ) : (
          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[280px_1fr]">
            <aside className="flex min-h-0 flex-col border-b border-slate-200 lg:max-h-[calc(100vh-240px)] lg:border-b-0 lg:border-r">
              <div className="border-b border-slate-200 p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input value={classQuery} onChange={(e) => setClassQuery(e.target.value)} placeholder="Find a class" className={cn(inputClass, 'pl-9')} />
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible">
                {classList.map((c) => {
                  const list = byClass.get(c.id) ?? []
                  const staffed = list.filter((a) => a.teacherId).length
                  return (
                    <button
                      key={c.id}
                      onClick={() => setClassId(c.id)}
                      className={cn('min-w-[170px] rounded-xl px-3 py-2.5 text-left transition lg:min-w-0', c.id === classId ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-slate-50')}
                    >
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                        Class {c.displayName}
                        <span className="text-[11px] font-medium text-slate-400">{list.length} subj.</span>
                      </div>
                      <div className="mt-1.5"><Coverage done={staffed} total={list.length} /></div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {list.length === 0 ? 'No subjects yet' : staffed === list.length ? 'All subjects staffed' : `${list.length - staffed} without teacher`}
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>

            {selectedClass && (
              <section className="flex min-w-0 flex-col gap-5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Class {selectedClass.displayName}</h2>
                    <p className="text-xs text-slate-500">
                      {selectedClass.students} students · class teacher {selectedClass.classTeacher ?? 'not set'} · {rows.length} subjects
                    </p>
                  </div>
                  {data.classes.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
                      <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} className={cn(inputClass, 'h-9 w-auto text-xs')} aria-label="Copy subjects from">
                        <option value="">Copy subjects from…</option>
                        {data.classes.filter((c) => c.id !== classId && (byClass.get(c.id)?.length ?? 0) > 0).map((c) => (
                          <option key={c.id} value={c.id}>Class {c.displayName} ({byClass.get(c.id)?.length})</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <input type="checkbox" checked={copyTeachers} onChange={(e) => setCopyTeachers(e.target.checked)} className="size-3.5 accent-[#FF6B35]" />
                        with teachers
                      </label>
                      <button className={cn(secondaryButton, 'h-9 px-3 text-xs')} onClick={copy} disabled={!copyFrom || pending}>
                        <Copy className="size-3.5" /> Copy
                      </button>
                    </div>
                  )}
                </div>

                {/* Current */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {rows.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">No subjects yet. Add them below or copy from another section.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wide text-slate-400">
                            <th className="px-4 py-2.5 font-semibold">Subject</th>
                            <th className="px-2 py-2.5 font-semibold">Teacher</th>
                            <th className="px-2 py-2.5 text-center font-semibold">Lessons / week</th>
                            <th className="px-4 py-2.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((a) => {
                            const s = subjectById.get(a.subjectId)
                            return (
                              <tr key={a.id} className={cn('border-b border-slate-50 last:border-0', !a.teacherId && 'bg-rose-50/40')}>
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-slate-800">{s?.name}</div>
                                  <div className="font-mono text-[11px] text-slate-400">{s?.code}</div>
                                </td>
                                <td className="px-2 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={a.teacherId ?? ''}
                                      disabled={busyRow === a.id}
                                      onChange={(e) => changeTeacher(a.id, e.target.value)}
                                      className={cn(inputClass, 'h-9 w-60 text-xs', !a.teacherId && 'border-rose-200 text-rose-700')}
                                      aria-label={`Teacher for ${s?.name}`}
                                    >
                                      <option value="">No teacher yet</option>
                                      {teacherOptions(a.teacherId)}
                                    </select>
                                    {busyRow === a.id && <Loader2 className="size-4 animate-spin text-slate-400" />}
                                  </div>
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  {a.weeklyLessons ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{a.weeklyLessons}</span>
                                  ) : (
                                    <Link href="/admin/timetable" className="text-[11px] font-semibold text-amber-600 hover:underline">Not scheduled</Link>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    aria-label={`Remove ${s?.name}`}
                                    title="Remove from class"
                                    onClick={() =>
                                      setConfirm({
                                        title: 'Remove subject from class?',
                                        message: `${s?.name} will no longer be taught in Class ${selectedClass.displayName}. Homework, tests and materials already created are kept.`,
                                        run: async () => {
                                          const res = await removeClassAssignment(a.id)
                                          if (res.success) {
                                            toast.success('Subject removed')
                                            reload(true)
                                            return true
                                          }
                                          toast.error(res.error)
                                          return false
                                        },
                                      })
                                    }
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Add */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Add subjects</h3>
                    {available.length > 0 && (
                      <button
                        className="text-xs font-semibold text-[#FF6B35] hover:underline"
                        onClick={() => setPicked(Object.keys(picked).length === available.length ? {} : Object.fromEntries(available.map((s) => [s.id, picked[s.id] ?? ''])))}
                      >
                        {Object.keys(picked).length === available.length ? 'Unselect all' : 'Select all'}
                      </button>
                    )}
                  </div>
                  {data.subjects.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      No subjects in your school yet. <button className="font-semibold text-[#FF6B35] hover:underline" onClick={() => setSubjectDialog({ subject: null })}>Create one</button>.
                    </p>
                  ) : available.length === 0 ? (
                    <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                      <Check className="mr-1 inline size-3.5" /> Every subject is already assigned to this class.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {available.map((s) => {
                        const on = s.id in picked
                        return (
                          <div key={s.id} className={cn('rounded-xl border p-3 transition', on ? 'border-[#FF6B35] bg-orange-50/60' : 'border-slate-200 hover:border-slate-300')}>
                            <button
                              className="flex w-full items-center gap-2.5 text-left"
                              onClick={() =>
                                setPicked((p) => {
                                  const next = { ...p }
                                  if (on) delete next[s.id]
                                  else next[s.id] = ''
                                  return next
                                })
                              }
                            >
                              <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-[#FF6B35] bg-[#FF6B35] text-white' : 'border-slate-300')}>
                                {on && <Check className="size-3" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-slate-800">{s.name}</span>
                                <span className="font-mono text-[11px] text-slate-400">{s.code}</span>
                              </span>
                            </button>
                            {on && (
                              <select
                                value={picked[s.id]}
                                onChange={(e) => setPicked((p) => ({ ...p, [s.id]: e.target.value }))}
                                className={cn(inputClass, 'mt-2 h-9 text-xs')}
                                aria-label={`Teacher for ${s.name}`}
                              >
                                <option value="">Assign teacher later</option>
                                {teacherOptions(null)}
                              </select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {Object.keys(picked).length > 0 && (
                    <div className="sticky bottom-0 mt-3 flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5">
                      <span className="text-xs font-semibold text-[#d95324]">{Object.keys(picked).length} selected</span>
                      <div className="flex gap-2">
                        <button className={cn(secondaryButton, 'h-9')} onClick={() => setPicked({})}>Clear</button>
                        <button className={cn(primaryButton, 'h-9')} onClick={addPicked} disabled={pending}>
                          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                          Add to Class {selectedClass.displayName}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        ))}

      {/* ---------------- Subjects ---------------- */}
      {tab === 'subjects' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={subjectQuery} onChange={(e) => setSubjectQuery(e.target.value)} placeholder="Search subjects" className={cn(inputClass, 'pl-9')} />
            </div>
          </div>
          {data.subjects.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No subjects yet. <button className="font-semibold text-[#FF6B35] hover:underline" onClick={() => setSubjectDialog({ subject: null })}>Create the first one</button>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-semibold">Subject</th>
                    <th className="px-2 py-3 text-center font-semibold">Classes</th>
                    <th className="px-2 py-3 text-center font-semibold">Lessons</th>
                    <th className="px-2 py-3 text-center font-semibold">Homework</th>
                    <th className="px-2 py-3 text-center font-semibold">Tests</th>
                    <th className="px-2 py-3 text-center font-semibold">Materials</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subjects
                    .filter((s) => `${s.name} ${s.code} ${s.description}`.toLowerCase().includes(subjectQuery.trim().toLowerCase()))
                    .map((s) => {
                      const inUse = s.classCount + s.usage.homework + s.usage.tests + s.usage.materials + s.usage.lessons > 0
                      return (
                        <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{s.name}</span>
                              <span className="rounded bg-orange-50 px-1.5 py-px font-mono text-[10px] font-bold text-[#d95324]">{s.code}</span>
                            </div>
                            {s.description && <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">{s.description}</div>}
                          </td>
                          {[s.classCount, s.usage.lessons, s.usage.homework, s.usage.tests, s.usage.materials].map((n, i) => (
                            <td key={i} className={cn('px-2 py-3 text-center', n ? 'font-semibold text-slate-700' : 'text-slate-300')}>{n}</td>
                          ))}
                          <td className="px-5 py-3">
                            <div className="flex justify-end gap-1">
                              <button aria-label={`Edit ${s.name}`} onClick={() => setSubjectDialog({ subject: s })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <Pencil className="size-4" />
                              </button>
                              <button
                                aria-label={`Delete ${s.name}`}
                                title={inUse ? 'In use. Remove its assignments and records first.' : 'Delete'}
                                disabled={inUse}
                                onClick={() =>
                                  setConfirm({
                                    title: 'Delete subject?',
                                    message: `"${s.name}" will be permanently deleted.`,
                                    run: async () => {
                                      const res = await deleteSubject(s.id)
                                      if (res.success) {
                                        toast.success('Subject deleted')
                                        reload(true)
                                        return true
                                      }
                                      toast.error(res.error)
                                      return false
                                    },
                                  })
                                }
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Teacher workload ---------------- */}
      {tab === 'teachers' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {data.teachers.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No teachers yet. Add them on the <Link href="/admin/teachers" className="font-semibold text-[#FF6B35] hover:underline">Teachers page</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-semibold">Teacher</th>
                    <th className="px-2 py-3 text-center font-semibold">Subjects</th>
                    <th className="px-2 py-3 text-center font-semibold">Classes</th>
                    <th className="px-2 py-3 text-center font-semibold">Lessons / week</th>
                    <th className="px-5 py-3 font-semibold">Teaches</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.teachers]
                    .sort((a, b) => (teacherLoad.get(b.id)?.rows.length ?? 0) - (teacherLoad.get(a.id)?.rows.length ?? 0))
                    .map((t) => {
                      const load = teacherLoad.get(t.id)
                      const maxLessons = Math.max(1, ...data.teachers.map((x) => x.weeklyLessons))
                      return (
                        <tr key={t.id} className="border-b border-slate-50 align-top last:border-0">
                          <td className="px-5 py-3">
                            <Link href={`/admin/teachers/${t.id}`} className="font-semibold text-slate-800 hover:text-[#FF6B35]">{t.name}</Link>
                            <div className="text-[11px] text-slate-400">{t.teacherId}</div>
                          </td>
                          <td className="px-2 py-3 text-center font-semibold text-slate-700">{load?.subjects.size ?? 0}</td>
                          <td className="px-2 py-3 text-center font-semibold text-slate-700">{load?.classes.size ?? 0}</td>
                          <td className="px-2 py-3">
                            <div className="mx-auto flex w-28 items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-[#FF6B35]" style={{ width: `${(t.weeklyLessons / maxLessons) * 100}%` }} />
                              </div>
                              <span className="w-6 text-right text-xs font-semibold text-slate-700">{t.weeklyLessons}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            {load ? (
                              <div className="flex flex-wrap gap-1">
                                {load.rows.map((a) => (
                                  <button
                                    key={a.id}
                                    onClick={() => { setClassId(a.classId); setTab('assign') }}
                                    className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-orange-50 hover:text-[#d95324]"
                                  >
                                    {subjectById.get(a.subjectId)?.name} · {data.classes.find((c) => c.id === a.classId)?.displayName}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-amber-600">Not assigned to any class</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- Coverage ---------------- */}
      {tab === 'coverage' && (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.classes.map((c) => {
            const list = byClass.get(c.id) ?? []
            const staffed = list.filter((a) => a.teacherId).length
            return (
              <section key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Class {c.displayName}</h3>
                  <button onClick={() => { setClassId(c.id); setTab('assign') }} className="text-xs font-semibold text-[#FF6B35] hover:underline">Manage</button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{list.length} subjects · {staffed} staffed</span>
                  <span>{pct(staffed, list.length)}%</span>
                </div>
                <div className="mt-1.5"><Coverage done={staffed} total={list.length} /></div>
                <ul className="mt-3 space-y-1.5 text-xs">
                  {list.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-700">{subjectById.get(a.subjectId)?.name}</span>
                      <span className={cn('truncate text-right', a.teacherId ? 'text-slate-500' : 'font-semibold text-rose-600')}>
                        {a.teacherId ? teacherById.get(a.teacherId)?.name : 'No teacher'}
                      </span>
                    </li>
                  ))}
                  {list.length === 0 && <li className="text-amber-600">No subjects assigned yet.</li>}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {subjectDialog && <SubjectDialog subject={subjectDialog.subject} onClose={() => setSubjectDialog(null)} onSaved={() => reload(true)} />}
      {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel="Remove" onConfirm={confirm.run} onClose={() => setConfirm(null)} />}
    </div>
  )
}
