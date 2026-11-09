'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  endOfMonth,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  ArrowDownUp,
  BookOpenCheck,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Download,
  GraduationCap,
  Info,
  Phone,
  RefreshCw,
  Receipt,
  RotateCcw,
  TrendingUp,
  UserX,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChartContainer } from '@/components/ui/chart'
import {
  getReportsData,
  type Insight,
  type ReportData,
} from '@/app/actions/reports'
import type { ReportTab } from '@/lib/report-tabs'

// ------------------------------------------------------------------
// Config & formatting helpers
// ------------------------------------------------------------------

const REFRESH_MS = 30_000
const BRAND = '#FF6B35'

const TAB_META: { id: ReportTab; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'finance', label: 'Finance', icon: CircleDollarSign },
  { id: 'academics', label: 'Academics', icon: BookOpenCheck },
]

type Preset = 'this-month' | 'last-month' | 'last-30' | 'this-year' | 'custom'

const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-30', label: 'Last 30 days' },
  { id: 'this-year', label: 'This year' },
]

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

function presetRange(p: Exclude<Preset, 'custom'>) {
  const today = new Date()
  switch (p) {
    case 'this-month':
      return { from: ymd(startOfMonth(today)), to: ymd(today) }
    case 'last-month': {
      const last = subMonths(today, 1)
      return { from: ymd(startOfMonth(last)), to: ymd(endOfMonth(last)) }
    }
    case 'last-30':
      return { from: ymd(subDays(today, 29)), to: ymd(today) }
    case 'this-year':
      return { from: ymd(startOfYear(today)), to: ymd(today) }
  }
}

function detectPreset(from: string, to: string): Preset {
  for (const p of PRESETS) {
    const r = presetRange(p.id)
    if (r.from === from && r.to === to) return p.id
  }
  return 'custom'
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

const compactNumber = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const compactInr = (n: number) => `₹${compactNumber.format(n)}`

const pct = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `${n}%`

function rateTone(rate: number | null | undefined) {
  if (rate === null || rate === undefined) {
    return { text: 'text-slate-400', bar: 'bg-slate-200', fill: '#cbd5e1' }
  }
  if (rate >= 90) return { text: 'text-emerald-600', bar: 'bg-emerald-500', fill: '#10b981' }
  if (rate >= 75) return { text: 'text-amber-600', bar: 'bg-amber-500', fill: '#f59e0b' }
  return { text: 'text-rose-600', bar: 'bg-rose-500', fill: '#f43f5e' }
}

// ------------------------------------------------------------------
// CSV export
// ------------------------------------------------------------------

type CsvSection = {
  title: string
  headers: string[]
  rows: (string | number | null)[][]
}

function downloadCsv(filename: string, sections: CsvSection[]) {
  const escape = (v: string | number | null) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines: string[] = []
  sections.forEach((section, i) => {
    if (i > 0) lines.push('')
    lines.push(escape(section.title))
    lines.push(section.headers.map(escape).join(','))
    section.rows.forEach((row) => lines.push(row.map(escape).join(',')))
  })

  // BOM so Excel opens ₹ and other UTF-8 characters correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ------------------------------------------------------------------
// Small UI building blocks
// ------------------------------------------------------------------

const selectClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100'

function Panel({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm',
        className
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className="min-w-0 flex-1 px-5 pb-5 pt-4">{children}</div>
    </section>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  valueClass,
}: {
  label: string
  value: string
  hint?: string
  icon: typeof Users
  accent: string
  valueClass?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div
          className={cn(
            'mt-2 truncate text-2xl font-bold tracking-tight text-slate-900',
            valueClass
          )}
        >
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
      </div>
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          accent
        )}
      >
        <Icon className="size-5" />
      </div>
    </div>
  )
}

function Empty({
  icon: Icon = Info,
  title,
  text,
}: {
  icon?: typeof Users
  title: string
  text?: string
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
      <Icon className="size-6 text-slate-300" />
      <div className="text-sm font-semibold text-slate-600">{title}</div>
      {text && <p className="max-w-sm text-xs text-slate-400">{text}</p>}
    </div>
  )
}

function RateBar({ rate }: { rate: number | null }) {
  const tone = rateTone(rate)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn('h-full rounded-full', tone.bar)}
          style={{ width: `${Math.min(rate ?? 0, 100)}%` }}
        />
      </div>
      <span className={cn('w-12 text-right text-xs font-bold', tone.text)}>
        {pct(rate)}
      </span>
    </div>
  )
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-[#FF6B35] hover:text-[#FF6B35]"
    >
      <Download className="size-3.5" /> CSV
    </button>
  )
}

function ChartTip({
  active,
  payload,
  label,
  rows,
}: {
  active?: boolean
  payload?: { payload: Record<string, unknown> }[]
  label?: string
  rows: (p: Record<string, unknown>) => { name: string; value: string; color: string }[]
}) {
  if (!active || !payload?.length) return null
  const items = rows(payload[0].payload)
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-slate-800">{label}</div>
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-slate-600">
          <span className="size-2 rounded-sm" style={{ background: item.color }} />
          {item.name}
          <span className="ml-auto pl-4 font-semibold text-slate-900">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

const insightStyles: Record<Insight['tone'], { box: string; icon: typeof Info }> = {
  good: { box: 'border-emerald-200 bg-emerald-50 text-emerald-800', icon: CheckCircle2 },
  info: { box: 'border-sky-200 bg-sky-50 text-sky-800', icon: Info },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-800', icon: AlertTriangle },
  danger: { box: 'border-rose-200 bg-rose-50 text-rose-800', icon: AlertTriangle },
}

// ------------------------------------------------------------------
// Charts
// ------------------------------------------------------------------

function AttendanceTrendChart({
  data,
  granularity,
}: {
  data: ReportData['attendance']['trend']
  granularity: 'day' | 'month'
}) {
  if (!data.some((d) => d.total > 0)) {
    return (
      <Empty
        icon={CalendarCheck}
        title="No attendance in this period"
        text="Attendance marked from the Attendance page will appear here automatically."
      />
    )
  }

  return (
    <ChartContainer
      config={{ rate: { label: 'Attendance', color: '#3b82f6' } }}
      className="aspect-auto h-[260px] w-full"
    >
      <BarChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="#eef1f6" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={granularity === 'day' ? 12 : 4}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v) => `${v}%`}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          content={
            <ChartTip
              rows={(p) =>
                p.total
                  ? [
                      { name: 'Attendance', value: `${p.rate}%`, color: rateTone(p.rate as number).fill },
                      { name: 'Present', value: `${p.present} / ${p.total}`, color: '#94a3b8' },
                      { name: 'Absent', value: String(p.absent), color: '#f43f5e' },
                    ]
                  : [{ name: 'No records', value: '', color: '#cbd5e1' }]
              }
            />
          }
        />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((d, i) => (
            <Cell key={i} fill={rateTone(d.rate).fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function FinanceTrendChart({
  data,
  granularity,
}: {
  data: ReportData['finance']['trend']
  granularity: 'day' | 'month'
}) {
  if (!data.some((d) => d.collected > 0 || d.due > 0)) {
    return (
      <Empty
        icon={Wallet}
        title="No fees due or collected in this period"
        text="Create class fees and record payments from the Fees page."
      />
    )
  }

  return (
    <ChartContainer
      config={{
        collected: { label: 'Collected', color: '#10b981' },
        due: { label: 'Due', color: BRAND },
      }}
      className="aspect-auto h-[260px] w-full"
    >
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="#eef1f6" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={granularity === 'day' ? 12 : 4}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />
        <YAxis
          tickFormatter={(v) => compactInr(Number(v))}
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
        />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          content={
            <ChartTip
              rows={(p) => [
                { name: 'Collected', value: inr(p.collected as number), color: '#10b981' },
                { name: 'Fees due', value: inr(p.due as number), color: BRAND },
              ]}
            />
          }
        />
        <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="due" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  )
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------
// Tabs
// ------------------------------------------------------------------

function OverviewTab({ data }: { data: ReportData }) {
  const o = data.overview
  const g = data.range.granularity

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Students enrolled"
          value={o.students.toLocaleString('en-IN')}
          hint={`Across ${o.classes} class${o.classes === 1 ? '' : 'es'}`}
          icon={Users}
          accent="bg-orange-50 text-[#FF6B35]"
        />
        <Kpi
          label={data.filters.classId ? 'Teachers assigned' : 'Teachers'}
          value={o.teachers.toLocaleString('en-IN')}
          hint={`Staff attendance ${pct(data.attendance.staff.rate)}`}
          icon={GraduationCap}
          accent="bg-sky-50 text-sky-600"
        />
        <Kpi
          label="Student attendance"
          value={pct(o.attendanceRate)}
          hint={`${data.attendance.totals.total.toLocaleString('en-IN')} records in period`}
          icon={CalendarCheck}
          accent="bg-blue-50 text-blue-600"
          valueClass={rateTone(o.attendanceRate).text}
        />
        <Kpi
          label="Fees collected (period)"
          value={inr(o.collected)}
          hint={`Outstanding today ${inr(o.outstanding)}`}
          icon={CircleDollarSign}
          accent="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Attendance trend"
          description={`${g === 'day' ? 'Daily' : 'Monthly'} attendance rate · ${data.range.label}`}
          className="xl:col-span-2"
        >
          <AttendanceTrendChart data={data.attendance.trend} granularity={g} />
        </Panel>

        <Panel title="Needs attention" description="Generated from live data">
          {data.insights.length ? (
            <ul className="flex flex-col gap-2.5">
              {data.insights.map((insight) => {
                const style = insightStyles[insight.tone]
                const Icon = style.icon
                return (
                  <li
                    key={insight.title}
                    className={cn('flex gap-3 rounded-xl border p-3', style.box)}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{insight.title}</div>
                      <div className="mt-0.5 text-xs opacity-80">{insight.detail}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty icon={CheckCircle2} title="Nothing needs attention" />
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Fee collection"
          description="Payments received vs. fees falling due"
          action={
            <Legend
              items={[
                { label: 'Collected', color: '#10b981' },
                { label: 'Due', color: BRAND },
              ]}
            />
          }
        >
          <FinanceTrendChart data={data.finance.trend} granularity={g} />
        </Panel>

        <Panel title="Enrollment by class" description="Students vs. class capacity">
          {data.classRows.length ? (
            <ul className="flex max-h-[260px] flex-col gap-3 overflow-y-auto pr-1">
              {data.classRows.map((c) => {
                const occ = c.occupancy ?? 0
                return (
                  <li key={c.id} className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs font-semibold text-slate-700">
                      {c.name}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          occ > 100 ? 'bg-rose-500' : occ >= 90 ? 'bg-amber-500' : 'bg-[#FF6B35]'
                        )}
                        style={{ width: `${Math.min(occ, 100)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right text-xs text-slate-500">
                      <b className="text-slate-800">{c.students}</b> / {c.capacity}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty icon={Users} title="No classes yet" text="Create classes from the Classes page." />
          )}
        </Panel>
      </div>
    </div>
  )
}

function AttendanceTab({ data }: { data: ReportData }) {
  const a = data.attendance
  const t = a.totals
  const [sortByRate, setSortByRate] = useState(false)

  const rows = useMemo(() => {
    const list = [...data.classRows]
    if (sortByRate) {
      list.sort((x, y) => (x.attendance.rate ?? 101) - (y.attendance.rate ?? 101))
    }
    return list
  }, [data.classRows, sortByRate])

  const segments = [
    { label: 'Present', value: t.present, color: '#10b981' },
    { label: 'Late', value: t.late, color: '#f59e0b' },
    { label: 'Absent', value: t.absent, color: '#f43f5e' },
    { label: 'Excused', value: t.excused, color: '#94a3b8' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Attendance rate"
          value={pct(t.rate)}
          hint="Present + late ÷ marked"
          icon={TrendingUp}
          accent="bg-blue-50 text-blue-600"
          valueClass={rateTone(t.rate).text}
        />
        <Kpi
          label="Present / late"
          value={(t.present + t.late).toLocaleString('en-IN')}
          hint={`${t.late.toLocaleString('en-IN')} late arrivals`}
          icon={CheckCircle2}
          accent="bg-emerald-50 text-emerald-600"
        />
        <Kpi
          label="Absences"
          value={t.absent.toLocaleString('en-IN')}
          hint={`${t.excused.toLocaleString('en-IN')} excused`}
          icon={UserX}
          accent="bg-rose-50 text-rose-600"
        />
        <Kpi
          label="Staff attendance"
          value={pct(a.staff.rate)}
          hint={`${a.staff.absent} staff absences`}
          icon={GraduationCap}
          accent="bg-sky-50 text-sky-600"
          valueClass={rateTone(a.staff.rate).text}
        />
      </div>

      <Panel title="Status breakdown" description={data.range.label}>
        {t.total ? (
          <div className="flex flex-col gap-3">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
              {segments.map((s) =>
                s.value ? (
                  <div
                    key={s.label}
                    title={`${s.label}: ${s.value}`}
                    style={{ width: `${(s.value / t.total) * 100}%`, background: s.color }}
                  />
                ) : null
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {segments.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
                  {s.label}
                  <b className="text-slate-800">{s.value.toLocaleString('en-IN')}</b>
                  <span>({Math.round((s.value / t.total) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Empty icon={CalendarCheck} title="No attendance records" text="Try a wider date range or a different class." />
        )}
      </Panel>

      <Panel title="Attendance trend" description={`${data.range.granularity === 'day' ? 'Daily' : 'Monthly'} rate`}>
        <AttendanceTrendChart data={a.trend} granularity={data.range.granularity} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-5">
        <Panel
          title="Class-wise attendance"
          className="xl:col-span-3"
          action={
            <button
              onClick={() => setSortByRate((v) => !v)}
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition',
                sortByRate
                  ? 'border-[#FF6B35] bg-orange-50 text-[#FF6B35]'
                  : 'border-slate-200 text-slate-600 hover:text-slate-900'
              )}
            >
              <ArrowDownUp className="size-3.5" />
              {sortByRate ? 'Lowest first' : 'Sort by rate'}
            </button>
          }
        >
          {rows.length ? (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2 font-semibold">Class</th>
                    <th className="px-2 py-2 text-right font-semibold">Present</th>
                    <th className="px-2 py-2 text-right font-semibold">Absent</th>
                    <th className="px-2 py-2 text-right font-semibold">Late</th>
                    <th className="px-5 py-2 text-right font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-2.5">
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.students} students · {c.classTeacher}</div>
                      </td>
                      <td className="px-2 py-2.5 text-right text-slate-600">{c.attendance.present}</td>
                      <td className="px-2 py-2.5 text-right text-slate-600">{c.attendance.absent}</td>
                      <td className="px-2 py-2.5 text-right text-slate-600">{c.attendance.late}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex justify-end">
                          <RateBar rate={c.attendance.rate} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={Users} title="No classes found" />
          )}
        </Panel>

        <Panel
          title="Students at risk"
          description={`Below ${a.threshold}% attendance (min. 3 records)`}
          className="xl:col-span-2"
        >
          {a.atRisk.length ? (
            <ul className="flex max-h-[420px] flex-col divide-y divide-slate-100 overflow-y-auto">
              {a.atRisk.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-600">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{s.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                      <span>{s.className} · Roll {s.rollNo}</span>
                      {s.parentPhone && (
                        <a href={`tel:${s.parentPhone}`} className="inline-flex items-center gap-1 hover:text-[#FF6B35]">
                          <Phone className="size-3" /> {s.parentPhone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-rose-600">{s.rate}%</div>
                    <div className="text-[11px] text-slate-400">{s.absent} absent / {s.total}</div>
                  </div>
                </li>
              ))}
              {a.atRiskCount > a.atRisk.length && (
                <li className="py-2 text-center text-xs text-slate-400">
                  +{a.atRiskCount - a.atRisk.length} more. Narrow the filters to see them.
                </li>
              )}
            </ul>
          ) : (
            <Empty icon={CheckCircle2} title="No students at risk" text="Everyone with enough records is above the threshold." />
          )}
        </Panel>
      </div>
    </div>
  )
}

function FinanceTab({ data }: { data: ReportData }) {
  const f = data.finance
  const [showAllDefaulters, setShowAllDefaulters] = useState(false)
  const defaulters = showAllDefaulters ? f.defaulters : f.defaulters.slice(0, 8)
  const modeTotal = f.paymentModes.reduce((s, m) => s + m.amount, 0)
  const modeColors = ['#10b981', '#3b82f6', BRAND, '#8b5cf6', '#f59e0b', '#64748b']

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Fees due (period)"
          value={inr(f.dueInPeriod)}
          hint={`Collection rate ${pct(f.collectionRate)}`}
          icon={Receipt}
          accent="bg-orange-50 text-[#FF6B35]"
        />
        <Kpi
          label="Collected (period)"
          value={inr(f.collected)}
          hint={`${f.paymentCount} payment${f.paymentCount === 1 ? '' : 's'}`}
          icon={Wallet}
          accent="bg-emerald-50 text-emerald-600"
        />
        <Kpi
          label="Outstanding (today)"
          value={inr(f.outstanding)}
          hint="All unpaid balances"
          icon={CircleDollarSign}
          accent="bg-amber-50 text-amber-600"
        />
        <Kpi
          label="Overdue (today)"
          value={inr(f.overdue)}
          hint={`${f.defaulterCount} student${f.defaulterCount === 1 ? '' : 's'} past due`}
          icon={AlertTriangle}
          accent="bg-rose-50 text-rose-600"
          valueClass={f.overdue > 0 ? 'text-rose-600' : undefined}
        />
      </div>

      <Panel
        title="Collections vs. fees due"
        description={data.range.label}
        action={
          <Legend
            items={[
              { label: 'Collected', color: '#10b981' },
              { label: 'Due', color: BRAND },
            ]}
          />
        }
      >
        <FinanceTrendChart data={f.trend} granularity={data.range.granularity} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-5">
        <Panel title="Class-wise finance" className="xl:col-span-3">
          {data.classRows.length ? (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2 font-semibold">Class</th>
                    <th className="px-2 py-2 text-right font-semibold">Due (period)</th>
                    <th className="px-2 py-2 text-right font-semibold">Collected</th>
                    <th className="px-2 py-2 text-right font-semibold">Outstanding</th>
                    <th className="px-5 py-2 text-right font-semibold">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.classRows.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-2.5">
                        <div className="font-semibold text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.students} students</div>
                      </td>
                      <td className="px-2 py-2.5 text-right text-slate-600">{inr(c.due)}</td>
                      <td className="px-2 py-2.5 text-right font-medium text-emerald-600">{inr(c.collected)}</td>
                      <td className="px-2 py-2.5 text-right text-slate-600">{inr(c.outstanding)}</td>
                      <td className={cn('px-5 py-2.5 text-right font-semibold', c.overdue > 0 ? 'text-rose-600' : 'text-slate-400')}>
                        {inr(c.overdue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={Users} title="No classes found" />
          )}
        </Panel>

        <Panel title="Payment methods" description="Collected in period" className="xl:col-span-2">
          {f.paymentModes.length ? (
            <ul className="flex flex-col gap-3">
              {f.paymentModes.map((m, i) => (
                <li key={m.mode}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{m.mode}</span>
                    <span className="text-slate-500">
                      <b className="text-slate-800">{inr(m.amount)}</b> · {m.count}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${modeTotal ? (m.amount / modeTotal) * 100 : 0}%`,
                        background: modeColors[i % modeColors.length],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Wallet} title="No payments in this period" />
          )}
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Fee defaulters"
          description="Students with unpaid fees past the due date"
          action={
            f.defaulters.length > 8 ? (
              <button
                onClick={() => setShowAllDefaulters((v) => !v)}
                className="text-xs font-semibold text-[#FF6B35] hover:underline"
              >
                {showAllDefaulters ? 'Show less' : `Show all (${f.defaulters.length})`}
              </button>
            ) : undefined
          }
        >
          {defaulters.length ? (
            <ul className="flex flex-col divide-y divide-slate-100">
              {defaulters.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{d.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                      <span>{d.className} · {d.studentCode}</span>
                      {d.parentPhone && (
                        <a href={`tel:${d.parentPhone}`} className="inline-flex items-center gap-1 hover:text-[#FF6B35]">
                          <Phone className="size-3" /> {d.parentPhone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-rose-600">{inr(d.overdue)}</div>
                    <div className="text-[11px] text-slate-400">
                      {d.daysOverdue}d overdue · {d.fees} fee{d.fees === 1 ? '' : 's'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={CheckCircle2} title="No defaulters" text="All past-due fees are fully paid." />
          )}
        </Panel>

        <Panel title="Recent payments" description="Latest receipts in this period">
          {f.payments.length ? (
            <ul className="flex flex-col divide-y divide-slate-100">
              {f.payments.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Receipt className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{p.studentName}</div>
                    <div className="truncate text-xs text-slate-400">
                      {p.feeTitle} · {p.className} · {p.paidAt}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">{inr(p.amount)}</div>
                    <div className="text-[11px] text-slate-400">{p.mode}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={Receipt} title="No payments in this period" />
          )}
        </Panel>
      </div>
    </div>
  )
}

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) return { text: 'text-slate-400', bar: 'bg-slate-200' }
  if (score >= 75) return { text: 'text-emerald-600', bar: 'bg-emerald-500' }
  if (score >= 50) return { text: 'text-amber-600', bar: 'bg-amber-500' }
  return { text: 'text-rose-600', bar: 'bg-rose-500' }
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-300">—</span>
  return <span className={cn('text-xs font-bold', scoreTone(value).text)}>{value}%</span>
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase()
  const tone = s.includes('complete')
    ? 'bg-emerald-50 text-emerald-700'
    : s.includes('draft')
      ? 'bg-slate-100 text-slate-600'
      : s.includes('cancel')
        ? 'bg-rose-50 text-rose-700'
        : 'bg-sky-50 text-sky-700'
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', tone)}>
      {status}
    </span>
  )
}

function AcademicsTab({ data }: { data: ReportData }) {
  const h = data.academics.homework
  const perf = data.academics.performance
  const maxSubject = Math.max(1, ...h.bySubject.map((s) => s.count))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          label="Average score"
          value={pct(perf.averagePercent)}
          hint="Tests and exam papers in period"
          icon={TrendingUp}
          accent="bg-orange-50 text-[#FF6B35]"
          valueClass={scoreTone(perf.averagePercent).text}
        />
        <Kpi
          label="Pass rate"
          value={pct(perf.passRate)}
          hint="Scores at or above the pass mark"
          icon={CheckCircle2}
          accent="bg-emerald-50 text-emerald-600"
        />
        <Kpi
          label="Marks entered"
          value={perf.marksEntered.toLocaleString('en-IN')}
          hint="Student scores recorded"
          icon={ClipboardList}
          accent="bg-sky-50 text-sky-600"
        />
      </div>

      <Panel
        title="Subject performance"
        description="Average score per subject, weakest first"
        action={
          <Link href="/admin/tests-exams" className="text-xs font-semibold text-[#FF6B35] hover:underline">
            Enter marks &rarr;
          </Link>
        }
      >
        {perf.bySubject.length ? (
          <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {perf.bySubject.map((s) => {
              const tone = scoreTone(s.averagePercent)
              return (
                <li key={s.subject}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{s.subject}</span>
                    <span className="text-slate-500">
                      <b className={tone.text}>{s.averagePercent}%</b> avg · {s.passRate}% pass · {s.appeared} scores
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${s.averagePercent}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <Empty
            icon={BookOpenCheck}
            title="No marks in this period"
            text="Marks entered on the Tests & Exams page show up here automatically."
          />
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Homework due in period" value={String(h.total)} icon={ClipboardList} accent="bg-orange-50 text-[#FF6B35]" />
        <Kpi label="Active" value={String(h.byStatus.ACTIVE)} hint={`${h.byStatus.DRAFT} drafts`} icon={BookOpenCheck} accent="bg-sky-50 text-sky-600" />
        <Kpi label="Completed" value={String(h.byStatus.COMPLETED)} icon={CheckCircle2} accent="bg-emerald-50 text-emerald-600" />
        <Kpi
          label="Past due"
          value={String(h.pastDue)}
          hint="Active/overdue after due date"
          icon={AlertTriangle}
          accent="bg-rose-50 text-rose-600"
          valueClass={h.pastDue ? 'text-rose-600' : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Homework by subject" description="Assignments due in period">
          {h.bySubject.length ? (
            <ul className="flex flex-col gap-3">
              {h.bySubject.map((s) => (
                <li key={s.subject} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs font-semibold text-slate-700">{s.subject}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#FF6B35]" style={{ width: `${(s.count / maxSubject) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-xs font-bold text-slate-800">{s.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={ClipboardList} title="No homework due in this period" />
          )}
        </Panel>

        <Panel title={`Tests (${data.academics.tests.length})`} description="Scheduled in period" className="xl:col-span-2">
          {data.academics.tests.length ? (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2 font-semibold">Test</th>
                    <th className="px-2 py-2 font-semibold">Class</th>
                    <th className="px-2 py-2 font-semibold">Date</th>
                    <th className="px-2 py-2 text-right font-semibold">Marks</th>
                    <th className="px-2 py-2 text-right font-semibold">Avg</th>
                    <th className="px-5 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.academics.tests.map((t) => (
                    <tr key={t.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-2.5">
                        <div className="font-semibold text-slate-800">{t.title}</div>
                        <div className="text-xs text-slate-400">{t.subject} · {t.duration} min</div>
                      </td>
                      <td className="px-2 py-2.5 text-slate-600">{t.className}</td>
                      <td className="px-2 py-2.5 text-slate-600">{t.date}</td>
                      <td className="px-2 py-2.5 text-right text-slate-600">{t.totalMarks}</td>
                      <td className="px-2 py-2.5 text-right"><ScoreCell value={t.averagePercent} /></td>
                      <td className="px-5 py-2.5"><StatusPill status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={ClipboardList} title="No tests in this period" />
          )}
        </Panel>
      </div>

      <Panel title={`Exams (${data.academics.exams.length})`} description="Exams overlapping this period">
        {data.academics.exams.length ? (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-semibold">Exam</th>
                  <th className="px-2 py-2 font-semibold">Class</th>
                  <th className="px-2 py-2 font-semibold">Dates</th>
                  <th className="px-2 py-2 text-right font-semibold">Papers</th>
                  <th className="px-2 py-2 text-right font-semibold">Avg</th>
                  <th className="px-5 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.academics.exams.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-2.5">
                      <div className="font-semibold text-slate-800">{e.title}</div>
                      <div className="text-xs text-slate-400">{e.examType}</div>
                    </td>
                    <td className="px-2 py-2.5 text-slate-600">{e.className}</td>
                    <td className="px-2 py-2.5 text-slate-600">{e.startDate} – {e.endDate}</td>
                    <td className="px-2 py-2.5 text-right text-slate-600">{e.papers}</td>
                    <td className="px-2 py-2.5 text-right"><ScoreCell value={e.averagePercent} /></td>
                    <td className="px-5 py-2.5"><StatusPill status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={BookOpenCheck} title="No exams in this period" />
        )}
      </Panel>
    </div>
  )
}

// ------------------------------------------------------------------
// CSV builders per tab
// ------------------------------------------------------------------

function csvFor(tab: ReportTab, data: ReportData): CsvSection[] {
  const header: CsvSection = {
    title: `Lumina School report · ${data.range.label} · generated ${data.generatedLabel}`,
    headers: [],
    rows: [],
  }

  const classSection = (finance: boolean, attendance: boolean): CsvSection => ({
    title: 'By class',
    headers: [
      'Class', 'Class teacher', 'Students', 'Capacity',
      ...(attendance ? ['Present', 'Absent', 'Late', 'Excused', 'Attendance %'] : []),
      ...(finance ? ['Due (period)', 'Collected (period)', 'Outstanding', 'Overdue'] : []),
    ],
    rows: data.classRows.map((c) => [
      c.name, c.classTeacher, c.students, c.capacity,
      ...(attendance
        ? [c.attendance.present, c.attendance.absent, c.attendance.late, c.attendance.excused, c.attendance.rate]
        : []),
      ...(finance ? [c.due, c.collected, c.outstanding, c.overdue] : []),
    ]),
  })

  switch (tab) {
    case 'overview':
      return [
        header,
        {
          title: 'Summary',
          headers: ['Metric', 'Value'],
          rows: [
            ['Students', data.overview.students],
            ['Teachers', data.overview.teachers],
            ['Attendance %', data.overview.attendanceRate],
            ['Collected (period)', data.overview.collected],
            ['Outstanding (today)', data.overview.outstanding],
            ['Overdue (today)', data.overview.overdue],
            ['Collection rate %', data.overview.collectionRate],
          ],
        },
        classSection(true, true),
      ]
    case 'attendance':
      return [
        header,
        {
          title: 'Trend',
          headers: ['Period', 'Marked', 'Present+Late', 'Absent', 'Attendance %'],
          rows: data.attendance.trend.map((t) => [t.label, t.total, t.present, t.absent, t.rate]),
        },
        classSection(false, true),
        {
          title: 'Students at risk',
          headers: ['Name', 'Student ID', 'Class', 'Roll', 'Attendance %', 'Absent', 'Records', 'Parent phone'],
          rows: data.attendance.atRisk.map((s) => [s.name, s.studentCode, s.className, s.rollNo, s.rate, s.absent, s.total, s.parentPhone]),
        },
      ]
    case 'finance':
      return [
        header,
        classSection(true, false),
        {
          title: 'Defaulters',
          headers: ['Name', 'Student ID', 'Class', 'Parent', 'Parent phone', 'Overdue amount', 'Fees', 'Oldest due', 'Days overdue'],
          rows: data.finance.defaulters.map((d) => [d.name, d.studentCode, d.className, d.parentName, d.parentPhone, d.overdue, d.fees, d.oldestDue, d.daysOverdue]),
        },
        {
          title: 'Payments in period',
          headers: ['Receipt', 'Paid at', 'Student', 'Student ID', 'Class', 'Fee', 'Mode', 'Amount'],
          rows: data.finance.payments.map((p) => [p.receiptNo, p.paidAt, p.studentName, p.studentCode, p.className, p.feeTitle, p.mode, p.amount]),
        },
      ]
    case 'academics':
      return [
        header,
        {
          title: 'Homework by status',
          headers: ['Status', 'Count'],
          rows: Object.entries(data.academics.homework.byStatus),
        },
        {
          title: 'Subject performance',
          headers: ['Subject', 'Average %', 'Pass rate %', 'Scores'],
          rows: data.academics.performance.bySubject.map((s) => [s.subject, s.averagePercent, s.passRate, s.appeared]),
        },
        {
          title: 'Tests',
          headers: ['Title', 'Subject', 'Class', 'Date', 'Total marks', 'Duration (min)', 'Marks entered', 'Average %', 'Pass rate %', 'Status'],
          rows: data.academics.tests.map((t) => [t.title, t.subject, t.className, t.date, t.totalMarks, t.duration, t.entered, t.averagePercent, t.passRate, t.status]),
        },
        {
          title: 'Exams',
          headers: ['Title', 'Type', 'Class', 'Start', 'End', 'Papers', 'Average %', 'Status'],
          rows: data.academics.exams.map((e) => [e.title, e.examType, e.className, e.startDate, e.endDate, e.papers, e.averagePercent, e.status]),
        },
      ]
  }
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

type Filters = {
  from: string
  to: string
  classId: string
  subjectId: string
}

export default function ReportsPage({
  initialData,
  initialTab,
}: {
  initialData: ReportData
  initialTab: ReportTab
}) {
  const router = useRouter()

  const [data, setData] = useState(initialData)
  const [tab, setTab] = useState<ReportTab>(initialTab)
  const [filters, setFilters] = useState<Filters>({
    from: initialData.range.from,
    to: initialData.range.to,
    classId: initialData.filters.classId ?? '',
    subjectId: initialData.filters.subjectId ?? '',
  })
  const [preset, setPreset] = useState<Preset>(() =>
    detectPreset(initialData.range.from, initialData.range.to)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const requestId = useRef(0)
  const filtersRef = useRef(filters)
  filtersRef.current = filters

  const load = useCallback(
    async (next: Filters, silent = false) => {
      const id = ++requestId.current
      if (!silent) setLoading(true)

      try {
        const res = await getReportsData({
          from: next.from,
          to: next.to,
          classId: next.classId || null,
          subjectId: next.subjectId || null,
        })

        if (id !== requestId.current) return

        if (res.ok) {
          setData(res.data)
          setError(null)
        } else if (res.unauthorized) {
          router.replace('/')
        } else {
          setError(res.error)
        }
      } catch {
        if (id === requestId.current) {
          setError('Connection problem. Showing the last loaded data.')
        }
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [router]
  )

  const applyFilters = (patch: Partial<Filters>, nextPreset?: Preset) => {
    const next = { ...filtersRef.current, ...patch }
    setFilters(next)
    if (nextPreset) setPreset(nextPreset)

    if (!next.from || !next.to) return
    if (next.from > next.to) {
      setError('The start date must be on or before the end date.')
      return
    }
    load(next)
  }

  // Keep the URL in sync so the view can be bookmarked or shared.
  useEffect(() => {
    const p = new URLSearchParams()
    p.set('tab', tab)
    p.set('from', filters.from)
    p.set('to', filters.to)
    if (filters.classId) p.set('class', filters.classId)
    if (filters.subjectId) p.set('subject', filters.subjectId)
    window.history.replaceState(null, '', `${window.location.pathname}?${p}`)
  }, [tab, filters])

  // Live refresh: poll while the tab is visible, and refresh on return.
  useEffect(() => {
    if (!autoRefresh) return

    const tick = () => {
      if (document.visibilityState !== 'visible') return
      const f = filtersRef.current
      if (f.from && f.to && f.from <= f.to) load(f, true)
    }

    const interval = window.setInterval(tick, REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [autoRefresh, load])

  const hasActiveFilters =
    preset !== 'this-month' || Boolean(filters.classId) || Boolean(filters.subjectId)

  const resetFilters = () =>
    applyFilters({ ...presetRange('this-month'), classId: '', subjectId: '' }, 'this-month')

  const exportCsv = () => {
    const cls = data.options.classes.find((c) => c.id === data.filters.classId)
    const name = [
      'report',
      tab,
      cls ? `class-${cls.name}` : null,
      data.range.from,
      data.range.to,
    ]
      .filter(Boolean)
      .join('_')
    downloadCsv(`${name}.csv`, csvFor(tab, data))
  }

  const activeClass = data.options.classes.find((c) => c.id === data.filters.classId)
  const activeSubject = data.options.subjects.find((s) => s.id === data.filters.subjectId)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="relative flex size-2">
              {autoRefresh && (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className={cn(
                  'relative inline-flex size-2 rounded-full',
                  autoRefresh ? 'bg-emerald-500' : 'bg-slate-300'
                )}
              />
            </span>
            {autoRefresh ? 'Live' : 'Paused'} · Updated {data.generatedLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={cn(
              'h-10 rounded-xl border px-3 text-xs font-semibold transition',
              autoRefresh
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600'
            )}
            title="Automatically refresh every 30 seconds"
          >
            Auto-refresh {autoRefresh ? 'on' : 'off'}
          </button>
          <button
            onClick={() => load(filtersRef.current)}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-60"
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-[#e95b29]"
          >
            <Download className="size-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyFilters(presetRange(p.id), p.id)}
              className={cn(
                'h-8 rounded-lg px-3 text-xs font-semibold transition',
                preset === p.id
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              )}
            >
              {p.label}
            </button>
          ))}
          <span
            className={cn(
              'h-8 rounded-lg px-3 text-xs font-semibold leading-8',
              preset === 'custom' ? 'bg-slate-900 text-white' : 'text-slate-400'
            )}
          >
            Custom
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto]">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            From
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => applyFilters({ from: e.target.value }, 'custom')}
              className={selectClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            To
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => applyFilters({ to: e.target.value }, 'custom')}
              className={selectClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Class
            <select
              value={filters.classId}
              onChange={(e) => applyFilters({ classId: e.target.value })}
              className={selectClass}
            >
              <option value="">All classes</option>
              {data.options.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Class {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
            Subject
            <select
              value={filters.subjectId}
              onChange={(e) => applyFilters({ subjectId: e.target.value })}
              className={selectClass}
            >
              <option value="">All subjects (daily attendance)</option>
              {data.options.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium">{data.range.label}</span>
          {activeClass && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 font-medium text-[#d95324]">
              Class {activeClass.name}
            </span>
          )}
          {activeSubject && (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-700">
              {activeSubject.name}: subject-wise attendance
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => load(filtersRef.current)}
            className="text-xs font-semibold underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
        {TAB_META.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800',
              tab === id && 'border-[#FF6B35] text-[#FF6B35] hover:text-[#FF6B35]'
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div
        className={cn('transition-opacity duration-200', loading && 'pointer-events-none opacity-60')}
        aria-busy={loading}
      >
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'attendance' && <AttendanceTab data={data} />}
        {tab === 'finance' && <FinanceTab data={data} />}
        {tab === 'academics' && <AcademicsTab data={data} />}
      </div>
    </div>
  )
}
