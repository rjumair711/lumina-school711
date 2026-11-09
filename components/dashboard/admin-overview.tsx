'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Info,
  Megaphone,
  Receipt,
  RefreshCw,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChartContainer } from '@/components/ui/chart'
import { getDashboardData, type DashboardData } from '@/app/actions/dashboard'

const REFRESH_MS = 60_000
const BRAND = '#FF6B35'
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })

function rateTone(rate: number | null) {
  if (rate === null) return { text: 'text-slate-400', fill: '#cbd5e1' }
  if (rate >= 90) return { text: 'text-emerald-600', fill: '#10b981' }
  if (rate >= 75) return { text: 'text-amber-600', fill: '#f59e0b' }
  return { text: 'text-rose-600', fill: '#f43f5e' }
}

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <header className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {action}
      </header>
      <div className="min-w-0 flex-1 px-5 pb-5 pt-3">{children}</div>
    </section>
  )
}

function ViewAll({ href, label = 'View all' }: { href: string; label?: string }) {
  return <Link href={href} className="text-xs font-semibold text-[#FF6B35] hover:underline">{label}</Link>
}

function Empty({ text, href, action }: { text: string; href?: string; action?: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
      {text}
      {href && action && <Link href={href} className="font-semibold text-[#FF6B35] hover:underline">{action}</Link>}
    </div>
  )
}

function Tip({ active, payload, label, rows }: { active?: boolean; payload?: { payload: Record<string, unknown> }[]; label?: string; rows: (p: Record<string, unknown>) => [string, string][] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-slate-800">{label}</div>
      {rows(payload[0].payload).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-slate-600"><span>{k}</span><b className="text-slate-900">{v}</b></div>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------
// Calendar
// ------------------------------------------------------------------

const EVENT_STYLE: Record<string, { dot: string; label: string }> = {
  test: { dot: 'bg-violet-500', label: 'Test' },
  exam: { dot: 'bg-rose-500', label: 'Exam' },
  homework: { dot: 'bg-sky-500', label: 'Homework' },
  fee: { dot: 'bg-amber-500', label: 'Fee due' },
}

function SchoolCalendar({ data }: { data: DashboardData }) {
  const today = new Date(`${data.today}T00:00:00`)
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(data.today)

  const byDay = useMemo(() => {
    const map = new Map<string, DashboardData['events']>()
    for (const e of data.events) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return map
  }, [data.events])

  const minMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1)
  const start = new Date(month)
  start.setDate(1 - month.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { d, key, inMonth: d.getMonth() === month.getMonth() }
  })
  const dayEvents = byDay.get(selected) ?? []
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))

  return (
    <Panel title="School calendar">
      <div className="mb-3 flex items-center justify-between">
        <button aria-label="Previous month" disabled={month <= minMonth} onClick={() => shift(-1)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-bold text-slate-700">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        <button aria-label="Next month" disabled={month >= maxMonth} onClick={() => shift(1)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[10px]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="pb-1 font-semibold text-slate-400">{d}</div>)}
        {cells.map(({ d, key, inMonth }) => {
          const ev = byDay.get(key) ?? []
          const kinds = [...new Set(ev.map((e) => e.kind))].slice(0, 3)
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={cn(
                'relative mx-auto flex size-8 flex-col items-center justify-center rounded-lg text-[11px] transition',
                inMonth ? 'text-slate-700' : 'text-slate-300',
                key === selected ? 'bg-[#FF6B35] font-bold text-white' : 'hover:bg-slate-100',
                key === data.today && key !== selected && 'font-bold text-[#FF6B35] ring-1 ring-orange-300'
              )}
              aria-label={`${d.toDateString()}${ev.length ? `, ${ev.length} events` : ''}`}
            >
              {d.getDate()}
              {kinds.length > 0 && (
                <span className="absolute bottom-0.5 flex gap-0.5">
                  {kinds.map((k) => <span key={k} className={cn('size-1 rounded-full', key === selected ? 'bg-white' : EVENT_STYLE[k]?.dot)} />)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        {Object.entries(EVENT_STYLE).map(([k, s]) => <span key={k} className="inline-flex items-center gap-1"><span className={cn('size-1.5 rounded-full', s.dot)} />{s.label}</span>)}
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {new Date(`${selected}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </div>
        {dayEvents.length ? (
          <ul className="flex max-h-32 flex-col gap-1.5 overflow-y-auto text-[11px]">
            {dayEvents.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', EVENT_STYLE[e.kind]?.dot)} />
                <span className="min-w-0"><span className="font-semibold text-slate-700">{e.title}</span> <span className="text-slate-400">· {e.detail}</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] text-slate-400">Nothing scheduled.</p>
        )}
      </div>
    </Panel>
  )
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

const ACTIVITY_ICON = { student: UserRoundPlus, payment: Receipt, notice: Megaphone, homework: ClipboardList, material: FolderOpen } as const
const ALERT_STYLE = {
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
} as const

export default function DashboardOverview({ initialData }: { initialData: DashboardData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [refreshing, setRefreshing] = useState(false)
  const reqId = useRef(0)

  const reload = useCallback(
    async (silent = false) => {
      const id = ++reqId.current
      if (!silent) setRefreshing(true)
      try {
        const res = await getDashboardData()
        if (id !== reqId.current) return
        if (res.success) setData(res.data)
        else if (res.unauthorized) router.replace('/')
      } finally {
        if (id === reqId.current) setRefreshing(false)
      }
    },
    [router]
  )

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && reload(true)
    const interval = window.setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [reload])

  const s = data.stats
  const attTone = rateTone(s.attendanceToday)
  const hasAttendance = data.attendanceSeries.some((d) => d.total > 0)
  const hasFees = data.feeSeries.some((d) => d.collected > 0 || d.due > 0)

  const kpis = [
    {
      label: 'Students',
      value: s.students.toLocaleString('en-IN'),
      hint: s.newStudents ? `+${s.newStudents} this month` : `${s.classes} classes`,
      icon: Users,
      tone: 'bg-orange-50 text-[#FF6B35]',
      href: '/admin/students',
    },
    {
      label: 'Teachers',
      value: s.teachers.toLocaleString('en-IN'),
      hint: s.staffToday === null ? 'Staff attendance not marked' : `${s.staffToday}% present today`,
      icon: GraduationCap,
      tone: 'bg-sky-50 text-sky-600',
      href: '/admin/teachers',
    },
    {
      label: 'Attendance today',
      value: s.attendanceToday === null ? '—' : `${s.attendanceToday}%`,
      hint: s.markedToday ? `${s.presentToday}/${s.markedToday} present · ${s.classesMarked}/${s.classesWithStudents} classes` : 'Not marked yet today',
      icon: CalendarCheck,
      tone: 'bg-emerald-50 text-emerald-600',
      valueClass: attTone.text,
      href: '/admin/attendance',
    },
    {
      label: 'Fees this month',
      value: inr(s.collectedThisMonth),
      hint: `${inr(s.outstanding)} outstanding`,
      icon: CircleDollarSign,
      tone: 'bg-violet-50 text-violet-600',
      change: s.collectedChange,
      href: '/admin/fees',
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{data.greeting}, {data.adminName.split(' ')[0]}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {data.todayLabel} · {data.schoolName}
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Live · {data.generatedLabel}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {s.lessonsToday > 0 && (
            <Link href="/admin/timetable" className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 sm:inline-flex">
              <BookOpen className="size-4 text-[#FF6B35]" /> {s.lessonsToday} lessons today
            </Link>
          )}
          <button onClick={() => reload()} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-60">
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow">
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-500">{k.label}</div>
              <div className={cn('mt-2 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-slate-900', k.valueClass)}>
                {k.value}
                {typeof k.change === 'number' && (
                  <span className={cn('inline-flex items-center text-xs font-semibold', k.change >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {k.change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {Math.abs(k.change)}%
                  </span>
                )}
              </div>
              <div className="mt-1 truncate text-xs text-slate-400">{k.hint}</div>
            </div>
            <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', k.tone)}>
              <k.icon className="size-5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
          {data.alerts.map((a) => (
            <Link key={a.text} href={a.href} className={cn('flex flex-1 items-center gap-3 rounded-xl border px-4 py-2.5 text-xs transition hover:shadow-sm lg:min-w-[280px]', ALERT_STYLE[a.tone])}>
              {a.tone === 'info' ? <Info className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
              <span className="flex-1 font-medium">{a.text}</span>
              <span className="shrink-0 font-semibold underline-offset-2 hover:underline">{a.action} →</span>
            </Link>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Attendance · last 14 days" action={<ViewAll href="/admin/reports?tab=attendance" label="Report" />}>
          {hasAttendance ? (
            <ChartContainer config={{ rate: { label: 'Attendance', color: '#10b981' } }} className="aspect-auto h-[220px] w-full">
              <BarChart data={data.attendanceSeries} margin={{ left: -14, right: 6, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#eef1f6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} content={<Tip rows={(p) => (p.total ? [['Attendance', `${p.rate}%`], ['Present', `${p.present} / ${p.total}`]] : [['No records', '']])} />} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {data.attendanceSeries.map((d, i) => <Cell key={i} fill={rateTone(d.rate).fill} stroke={d.isToday ? '#0f172a' : undefined} strokeWidth={d.isToday ? 1.5 : 0} />)}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <Empty text="No attendance marked in the last 14 days." href="/admin/attendance" action="Mark attendance" />
          )}
        </Panel>

        <Panel title="Fee collection · last 6 months" action={<ViewAll href="/admin/reports?tab=finance" label="Report" />}>
          {hasFees ? (
            <ChartContainer config={{ collected: { label: 'Collected', color: '#10b981' }, due: { label: 'Due', color: BRAND } }} className="aspect-auto h-[220px] w-full">
              <BarChart data={data.feeSeries} margin={{ left: 0, right: 6, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#eef1f6" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tickFormatter={(v) => `₹${compact.format(Number(v))}`} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} content={<Tip rows={(p) => [['Collected', inr(p.collected as number)], ['Fees due', inr(p.due as number)]]} />} />
                <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="due" fill={BRAND} fillOpacity={0.35} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ChartContainer>
          ) : (
            <Empty text="No fees due or collected in the last 6 months." href="/admin/fees" action="Set up fees" />
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Class performance · average score" action={<ViewAll href="/admin/tests-exams" label="Results" />}>
          {data.classPerformance.length ? (
            <ul className="flex max-h-[240px] flex-col gap-3 overflow-y-auto pr-1">
              {data.classPerformance.map((c) => (
                <li key={c.name} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs font-semibold text-slate-700">{c.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', c.average >= 75 ? 'bg-emerald-500' : c.average >= 50 ? 'bg-amber-500' : 'bg-rose-500')} style={{ width: `${c.average}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right text-xs text-slate-500"><b className="text-slate-800">{c.average}%</b> · {c.passRate}% pass</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Scores appear once marks are entered for tests or exams." href="/admin/tests-exams" action="Go to Tests & Exams" />
          )}
        </Panel>

        <Panel title="Recent activity">
          {data.activity.length ? (
            <ul className="flex flex-col">
              {data.activity.map((a) => {
                const Icon = ACTIVITY_ICON[a.kind]
                return (
                  <li key={a.id}>
                    <Link href={a.href} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#FF6B35]"><Icon className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-700">{a.title}</span>
                        <span className="block truncate text-[11px] text-slate-400">{a.detail}</span>
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">{a.when}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty text="Nothing has happened yet. Activity shows up here as you use the system." />
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Upcoming tests & exams" action={<ViewAll href="/admin/tests-exams" />}>
          {data.upcoming.length ? (
            <ul className="flex flex-col">
              {data.upcoming.map((u) => (
                <li key={u.id} className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', u.kind === 'exam' ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600')}>
                    {u.kind === 'exam' ? <CalendarDays className="size-4" /> : <ClipboardList className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-700">{u.title}</span>
                    <span className="block truncate text-[11px] text-slate-400">{u.detail} · {u.dateLabel}</span>
                  </span>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', u.inDays <= 1 ? 'bg-orange-100 text-[#d95324]' : u.inDays <= 7 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                    {u.inDays === 0 ? 'Today' : u.inDays === 1 ? 'Tomorrow' : `In ${u.inDays} days`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No tests or exams in the next 30 days." href="/admin/tests-exams" action="Schedule one" />
          )}
        </Panel>

        <Panel
          title="Overdue fees"
          action={data.overdue.count > 0 ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">{data.overdue.count} · {inr(data.overdue.total)}</span> : undefined}
        >
          {data.overdue.list.length ? (
            <>
              <ul className="flex flex-col">
                {data.overdue.list.map((d) => (
                  <li key={d.id}>
                    <Link href={`/admin/students/${d.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                        {d.name.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-700">{d.name}</span>
                        <span className="block truncate text-[11px] text-slate-400">{d.className} · {d.detail}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-xs font-bold text-rose-600">{inr(d.amount)}</span>
                        <span className="block text-[10px] text-slate-400">{d.daysOverdue}d overdue</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-right"><ViewAll href="/admin/reports?tab=finance" label="All defaulters →" /></div>
            </>
          ) : (
            <Empty text="No overdue fees. Every past-due fee has been paid." />
          )}
        </Panel>

        <SchoolCalendar data={data} />
      </div>
    </div>
  )
}
