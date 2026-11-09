'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Award,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ClipboardPen,
  Clock3,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  deleteExam,
  deletePaper,
  deleteTest,
  getAssessmentsData,
  setAssessmentStatus,
  type AssessmentsData,
  type SheetKind,
} from '@/app/actions/assessments'
import {
  ConfirmDialog,
  ExamForm,
  PaperForm,
  TestForm,
  inputClass,
  primaryButton,
  secondaryButton,
  type Exam,
  type Paper,
  type Test,
} from './tests-exams/forms'
import { MarksheetModal } from './tests-exams/marksheet'
import { ResultsView, type ResultTarget } from './tests-exams/results-view'

const REFRESH_MS = 30_000

type Tab = 'tests' | 'exams' | 'results'

type Dialog =
  | { type: 'test'; test: Test | null }
  | { type: 'exam'; exam: Exam | null }
  | { type: 'paper'; exam: Exam; paper: Paper | null }
  | { type: 'marks'; kind: SheetKind; id: string }
  | { type: 'confirm'; title: string; message: string; run: () => Promise<boolean> }
  | null

// Whole days between two yyyy-MM-dd strings.
function dayDiff(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function relativeDay(today: string, day: string) {
  const diff = dayDiff(today, day)
  if (diff === 0) return { text: 'Today', tone: 'text-[#FF6B35] font-semibold' }
  if (diff === 1) return { text: 'Tomorrow', tone: 'text-[#FF6B35]' }
  if (diff > 1 && diff <= 14) return { text: `In ${diff} days`, tone: 'text-sky-600' }
  if (diff === -1) return { text: 'Yesterday', tone: 'text-slate-400' }
  if (diff < 0) return { text: `${-diff} days ago`, tone: 'text-slate-400' }
  return { text: `In ${diff} days`, tone: 'text-slate-400' }
}

const statusTone: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600 border-slate-200',
  Scheduled: 'bg-sky-50 text-sky-700 border-sky-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
}

function StatusSelect({
  value,
  statuses,
  onChange,
}: {
  value: string
  statuses: string[]
  onChange: (status: string) => void
}) {
  return (
    <select
      value={value}
      aria-label="Status"
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'h-7 cursor-pointer rounded-full border px-2.5 text-[11px] font-semibold outline-none',
        statusTone[value] ?? 'border-slate-200 bg-white text-slate-600'
      )}
    >
      {[...new Set([...statuses, value])].map((s) => <option key={s}>{s}</option>)}
    </select>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : 'bg-[#FF6B35]')} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-slate-500">{done}/{total}</span>
    </div>
  )
}

function Kpi({ label, value, hint, icon: Icon, accent }: { label: string; value: string; hint?: string; icon: typeof Clock3; accent: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
      </div>
      <div className={cn('flex size-10 items-center justify-center rounded-xl', accent)}>
        <Icon className="size-5" />
      </div>
    </div>
  )
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'rounded-lg p-1.5 text-slate-400 transition',
        danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-slate-100 hover:text-slate-700'
      )}
    >
      {children}
    </button>
  )
}

function EmptyState({ icon: Icon, title, text, action }: { icon: typeof Clock3; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <Icon className="size-7 text-slate-300" />
      <div className="text-sm font-semibold text-slate-600">{title}</div>
      <p className="max-w-sm text-xs text-slate-400">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ------------------------------------------------------------------

export default function TestsExamsPage({ initialData }: { initialData: AssessmentsData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [tab, setTab] = useState<Tab>('tests')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [resultTarget, setResultTarget] = useState<ResultTarget | null>(null)

  // Test filters
  const [query, setQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [when, setWhen] = useState<'all' | 'upcoming' | 'past' | 'pending'>('all')

  const reqId = useRef(0)
  const dialogOpen = useRef(false)
  dialogOpen.current = dialog !== null

  const reload = useCallback(
    async (silent = false) => {
      const id = ++reqId.current
      if (!silent) setRefreshing(true)
      try {
        const res = await getAssessmentsData()
        if (id !== reqId.current) return
        if (res.success) setData(res.data)
        else if (res.unauthorized) router.replace('/')
        else if (!silent) toast.error(res.error)
      } catch {
        if (!silent) toast.error('Connection problem. Please try again.')
      } finally {
        if (id === reqId.current) setRefreshing(false)
      }
    },
    [router]
  )

  // Live updates; paused while a dialog is open so edits are not disturbed.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible' && !dialogOpen.current) reload(true)
    }
    const interval = window.setInterval(tick, REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  const closeDialog = useCallback(() => setDialog(null), [])
  const onSaved = useCallback(() => reload(true), [reload])

  const today = data.today
  const soon = addDays(today, 14)

  // ---------------- KPIs ----------------
  const kpis = useMemo(() => {
    const active = (s: string) => s !== 'Cancelled' && s !== 'Draft'

    const upcomingTests = data.tests.filter((t) => active(t.status) && t.date >= today && t.date <= soon)
    const upcomingPapers = data.exams.flatMap((e) =>
      active(e.status) ? e.papers.filter((p) => p.date >= today && p.date <= soon) : []
    )

    const pendingTests = data.tests.filter(
      (t) => active(t.status) && t.date <= today && t.stats.entered < t.studentCount
    )
    const pendingPapers = data.exams.flatMap((e) =>
      active(e.status) ? e.papers.filter((p) => p.date <= today && p.stats.entered < e.studentCount) : []
    )

    let weighted = 0
    let appeared = 0
    for (const s of [...data.tests.map((t) => t.stats), ...data.exams.flatMap((e) => e.papers.map((p) => p.stats))]) {
      if (s.averagePercent !== null) {
        weighted += s.averagePercent * s.appeared
        appeared += s.appeared
      }
    }

    return {
      upcoming: upcomingTests.length + upcomingPapers.length,
      upcomingHint: `${upcomingTests.length} test${upcomingTests.length === 1 ? '' : 's'} · ${upcomingPapers.length} exam paper${upcomingPapers.length === 1 ? '' : 's'}`,
      pending: pendingTests.length + pendingPapers.length,
      completed: data.tests.filter((t) => t.status === 'Completed').length + data.exams.filter((e) => e.status === 'Completed').length,
      average: appeared ? `${Math.round((weighted / appeared) * 10) / 10}%` : '—',
      averageHint: appeared ? `Across ${appeared.toLocaleString('en-IN')} marks entered` : 'No marks entered yet',
    }
  }, [data, today, soon])

  // ---------------- Tests list ----------------
  const tests = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = data.tests.filter((t) => {
      if (classFilter && t.classId !== classFilter) return false
      if (subjectFilter && t.subjectId !== subjectFilter) return false
      if (statusFilter && t.status !== statusFilter) return false
      if (when === 'upcoming' && t.date < today) return false
      if (when === 'past' && t.date >= today) return false
      if (when === 'pending' && !(t.date <= today && t.status !== 'Cancelled' && t.stats.entered < t.studentCount)) return false
      if (q && !`${t.title} ${t.subjectName} ${t.className}`.toLowerCase().includes(q)) return false
      return true
    })
    // Upcoming view reads best soonest-first.
    if (when === 'upcoming') list.sort((a, b) => a.date.localeCompare(b.date))
    return list
  }, [data.tests, query, classFilter, subjectFilter, statusFilter, when, today])

  const filtersActive = Boolean(query || classFilter || subjectFilter || statusFilter || when !== 'all')

  // ---------------- Exams list ----------------
  const [examClass, setExamClass] = useState('')
  const exams = useMemo(
    () => data.exams.filter((e) => !examClass || e.classId === examClass),
    [data.exams, examClass]
  )

  // ---------------- Actions ----------------
  const changeStatus = async (kind: 'test' | 'exam', id: string, status: string) => {
    const res = await setAssessmentStatus(kind, id, status)
    if (res.success) {
      toast.success(`Status changed to ${status}`)
      reload(true)
    } else toast.error(res.error)
  }

  const confirmDelete = (title: string, message: string, action: () => Promise<{ success: boolean; error?: string }>, done: string) =>
    setDialog({
      type: 'confirm',
      title,
      message,
      run: async () => {
        const res = await action()
        if (res.success) {
          toast.success(done)
          reload(true)
          return true
        }
        toast.error(res.error ?? 'Delete failed')
        return false
      },
    })

  const showResults = (t: ResultTarget) => {
    setResultTarget(t)
    setTab('results')
  }

  const defaultDate = today

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tests &amp; Exams</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live · Updated {data.generatedLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => reload()} className={secondaryButton} disabled={refreshing}>
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} /> Refresh
          </button>
          <button onClick={() => setDialog({ type: 'exam', exam: null })} className={secondaryButton}>
            <CalendarDays className="size-4" /> New exam
          </button>
          <button onClick={() => setDialog({ type: 'test', test: null })} className={primaryButton}>
            <Plus className="size-4" /> New test
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Coming up (14 days)" value={String(kpis.upcoming)} hint={kpis.upcomingHint} icon={CalendarClock} accent="bg-sky-50 text-sky-600" />
        <Kpi label="Awaiting marks" value={String(kpis.pending)} hint="Held, but marks incomplete" icon={ClipboardPen} accent="bg-amber-50 text-amber-600" />
        <Kpi label="Completed" value={String(kpis.completed)} hint="Tests and exams" icon={CheckCircle2} accent="bg-emerald-50 text-emerald-600" />
        <Kpi label="Average score" value={kpis.average} hint={kpis.averageHint} icon={TrendingUp} accent="bg-orange-50 text-[#FF6B35]" />
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1" role="tablist">
        {([
          ['tests', 'Tests', ClipboardList, data.tests.length],
          ['exams', 'Exams', CalendarDays, data.exams.length],
          ['results', 'Results', Award, null],
        ] as const).map(([id, labelText, Icon, count]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all sm:text-sm',
              tab === id ? 'bg-white text-[#FF6B35] shadow-sm' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Icon className="size-4" />
            {labelText}
            {count !== null && (
              <span className={cn('rounded-full px-1.5 text-[10px]', tab === id ? 'bg-orange-50' : 'bg-slate-200/70')}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ---------------- TESTS ---------------- */}
      {tab === 'tests' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tests" className={cn(inputClass, 'pl-9')} />
            </div>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={inputClass} aria-label="Class">
              <option value="">All classes</option>
              {data.classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
            </select>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={inputClass} aria-label="Subject">
              <option value="">All subjects</option>
              {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass} aria-label="Status">
              <option value="">All statuses</option>
              {data.statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={when} onChange={(e) => setWhen(e.target.value as typeof when)} className={inputClass} aria-label="Timeframe">
              <option value="all">Any date</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="pending">Awaiting marks</option>
            </select>
          </div>

          {data.tests.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No tests yet"
              text="Create a unit test for a class. You can enter marks right after it's held."
              action={<button className={primaryButton} onClick={() => setDialog({ type: 'test', test: null })}><Plus className="size-4" /> New test</button>}
            />
          ) : tests.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No tests match these filters"
              text="Try clearing a filter."
              action={
                filtersActive && (
                  <button className={secondaryButton} onClick={() => { setQuery(''); setClassFilter(''); setSubjectFilter(''); setStatusFilter(''); setWhen('all') }}>
                    Clear filters
                  </button>
                )
              }
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-semibold">Test</th>
                      <th className="px-2 py-3 font-semibold">Class</th>
                      <th className="px-2 py-3 font-semibold">Date</th>
                      <th className="px-2 py-3 font-semibold">Marks</th>
                      <th className="px-2 py-3 font-semibold">Results</th>
                      <th className="px-2 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => {
                      const rel = relativeDay(today, t.date)
                      const held = t.date <= today
                      return (
                        <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <div className="font-semibold text-slate-800">{t.title}</div>
                            <div className="text-xs text-slate-400">{t.subjectName} · {t.duration} min</div>
                          </td>
                          <td className="px-2 py-3 text-slate-600">{t.className}</td>
                          <td className="px-2 py-3">
                            <div className="text-slate-700">{t.dateLabel}</div>
                            <div className={cn('text-[11px]', rel.tone)}>{rel.text}</div>
                          </td>
                          <td className="px-2 py-3 text-slate-600">
                            {t.totalMarks}
                            <div className="text-[11px] text-slate-400">Pass {t.stats.passMark}</div>
                          </td>
                          <td className="px-2 py-3">
                            {t.stats.entered > 0 ? (
                              <div>
                                <Progress done={t.stats.entered} total={t.studentCount} />
                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  Avg {t.stats.averagePercent ?? '—'}{t.stats.averagePercent !== null && '%'} · Pass {t.stats.passRate ?? '—'}{t.stats.passRate !== null && '%'}
                                </div>
                              </div>
                            ) : (
                              <span className={cn('text-[11px]', held && t.status !== 'Cancelled' ? 'font-semibold text-amber-600' : 'text-slate-400')}>
                                {held && t.status !== 'Cancelled' ? 'Marks pending' : 'Not held yet'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <StatusSelect value={t.status} statuses={data.statuses} onChange={(s) => changeStatus('test', t.id, s)} />
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setDialog({ type: 'marks', kind: 'test', id: t.id })}
                                disabled={t.status === 'Cancelled'}
                                className="mr-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 text-xs font-semibold text-[#d95324] transition hover:bg-orange-100 disabled:opacity-40"
                              >
                                <ClipboardPen className="size-3.5" /> Marks
                              </button>
                              {t.stats.entered > 0 && (
                                <IconButton label="View results" onClick={() => showResults({ kind: 'test', id: t.id })}>
                                  <Award className="size-4" />
                                </IconButton>
                              )}
                              <IconButton label="Edit test" onClick={() => setDialog({ type: 'test', test: t })}>
                                <Pencil className="size-4" />
                              </IconButton>
                              <IconButton
                                label="Delete test"
                                danger
                                onClick={() =>
                                  confirmDelete(
                                    'Delete test?',
                                    t.stats.entered
                                      ? `"${t.title}" and the marks of ${t.stats.entered} student${t.stats.entered === 1 ? '' : 's'} will be permanently deleted.`
                                      : `"${t.title}" will be permanently deleted.`,
                                    () => deleteTest(t.id),
                                    'Test deleted'
                                  )
                                }
                              >
                                <Trash2 className="size-4" />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
                Showing {tests.length} of {data.tests.length} tests
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- EXAMS ---------------- */}
      {tab === 'exams' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={examClass} onChange={(e) => setExamClass(e.target.value)} className={cn(inputClass, 'w-auto min-w-[180px]')} aria-label="Class">
              <option value="">All classes</option>
              {data.classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
            </select>
            <span className="text-xs text-slate-400">{exams.length} exam{exams.length === 1 ? '' : 's'}</span>
          </div>

          {exams.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={data.exams.length ? 'No exams for this class' : 'No exams yet'}
              text="Create an exam (e.g. Mid Term), then add one paper per subject with its date and marks."
              action={<button className={primaryButton} onClick={() => setDialog({ type: 'exam', exam: null })}><Plus className="size-4" /> New exam</button>}
            />
          ) : (
            exams.map((e) => {
              const entered = e.papers.reduce((s, p) => s + p.stats.entered, 0)
              const expected = e.papers.length * e.studentCount
              const rel = relativeDay(today, e.startDate)
              const live = e.startDate <= today && e.endDate >= today
              return (
                <section key={e.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{e.title}</h3>
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-[#d95324]">{e.examType}</span>
                        {live && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">In progress</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span>Class {e.className} · {e.studentCount} students</span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> {e.dateLabel}</span>
                        {!live && <span className={rel.tone}>{rel.text}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusSelect value={e.status} statuses={data.statuses} onChange={(s) => changeStatus('exam', e.id, s)} />
                      {entered > 0 && (
                        <button className={cn(secondaryButton, 'h-8 px-3 text-xs')} onClick={() => showResults({ kind: 'exam', id: e.id })}>
                          <Award className="size-3.5" /> Results
                        </button>
                      )}
                      <IconButton label="Edit exam" onClick={() => setDialog({ type: 'exam', exam: e })}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Delete exam"
                        danger
                        onClick={() =>
                          confirmDelete(
                            'Delete exam?',
                            `"${e.title}" with ${e.papers.length} paper${e.papers.length === 1 ? '' : 's'}${entered ? ` and ${entered} entered marks` : ''} will be permanently deleted.`,
                            () => deleteExam(e.id),
                            'Exam deleted'
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </header>

                  <div className="px-5 py-4">
                    {e.papers.length === 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-sm text-slate-500">
                        <span className="flex items-center gap-2"><FileText className="size-4 text-slate-400" /> No subject papers yet.</span>
                        <button className={cn(primaryButton, 'h-9 text-xs')} onClick={() => setDialog({ type: 'paper', exam: e, paper: null })}>
                          <Plus className="size-3.5" /> Add first paper
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="-mx-5 overflow-x-auto">
                          <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                              <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                                <th className="px-5 pb-2 font-semibold">Subject</th>
                                <th className="px-2 pb-2 font-semibold">Date</th>
                                <th className="px-2 pb-2 font-semibold">Marks</th>
                                <th className="px-2 pb-2 font-semibold">Results</th>
                                <th className="px-5 pb-2 text-right font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {e.papers.map((p) => (
                                <tr key={p.id} className="border-t border-slate-50">
                                  <td className="px-5 py-2.5 font-semibold text-slate-800">{p.subjectName}</td>
                                  <td className="px-2 py-2.5 text-slate-600">
                                    {p.dateLabel}
                                    <div className={cn('text-[11px]', relativeDay(today, p.date).tone)}>{relativeDay(today, p.date).text}</div>
                                  </td>
                                  <td className="px-2 py-2.5 text-slate-600">
                                    {p.totalMarks}
                                    <span className="ml-1 text-[11px] text-slate-400">(pass {p.stats.passMark})</span>
                                  </td>
                                  <td className="px-2 py-2.5">
                                    {p.stats.entered > 0 ? (
                                      <div>
                                        <Progress done={p.stats.entered} total={e.studentCount} />
                                        <div className="mt-0.5 text-[11px] text-slate-500">Avg {p.stats.averagePercent ?? '—'}{p.stats.averagePercent !== null && '%'}</div>
                                      </div>
                                    ) : (
                                      <span className={cn('text-[11px]', p.date <= today && e.status !== 'Cancelled' ? 'font-semibold text-amber-600' : 'text-slate-400')}>
                                        {p.date <= today && e.status !== 'Cancelled' ? 'Marks pending' : 'Not held yet'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-2.5">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => setDialog({ type: 'marks', kind: 'paper', id: p.id })}
                                        disabled={e.status === 'Cancelled'}
                                        className="mr-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 text-xs font-semibold text-[#d95324] transition hover:bg-orange-100 disabled:opacity-40"
                                      >
                                        <ClipboardPen className="size-3.5" /> Marks
                                      </button>
                                      <IconButton label="Edit paper" onClick={() => setDialog({ type: 'paper', exam: e, paper: p })}>
                                        <Pencil className="size-4" />
                                      </IconButton>
                                      <IconButton
                                        label="Delete paper"
                                        danger
                                        onClick={() =>
                                          confirmDelete(
                                            'Delete paper?',
                                            `The ${p.subjectName} paper${p.stats.entered ? ` and ${p.stats.entered} entered marks` : ''} will be permanently deleted.`,
                                            () => deletePaper(p.id),
                                            'Paper deleted'
                                          )
                                        }
                                      >
                                        <Trash2 className="size-4" />
                                      </IconButton>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            Marks entered <Progress done={entered} total={expected} />
                          </div>
                          <button className={cn(secondaryButton, 'h-9 text-xs')} onClick={() => setDialog({ type: 'paper', exam: e, paper: null })}>
                            <Plus className="size-3.5" /> Add paper
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )
            })
          )}
        </div>
      )}

      {/* ---------------- RESULTS ---------------- */}
      {tab === 'results' && (
        <ResultsView data={data} target={resultTarget} onTargetChange={setResultTarget} version={data.generatedLabel} />
      )}

      {/* ---------------- Dialogs ---------------- */}
      {dialog?.type === 'test' && (
        <TestForm data={data} test={dialog.test} defaultDate={defaultDate} onClose={closeDialog} onSaved={onSaved} />
      )}
      {dialog?.type === 'exam' && (
        <ExamForm data={data} exam={dialog.exam} defaultDate={defaultDate} onClose={closeDialog} onSaved={onSaved} />
      )}
      {dialog?.type === 'paper' && (
        <PaperForm data={data} exam={dialog.exam} paper={dialog.paper} onClose={closeDialog} onSaved={onSaved} />
      )}
      {dialog?.type === 'marks' && (
        <MarksheetModal kind={dialog.kind} id={dialog.id} onClose={closeDialog} onSaved={onSaved} />
      )}
      {dialog?.type === 'confirm' && (
        <ConfirmDialog title={dialog.title} message={dialog.message} onConfirm={dialog.run} onClose={closeDialog} />
      )}
    </div>
  )
}
