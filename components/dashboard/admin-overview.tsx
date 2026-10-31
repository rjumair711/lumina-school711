'use client'

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Tooltip, XAxis, YAxis
} from 'recharts'
import {
  CalendarCheck, CalendarDays, ChevronLeft, ChevronRight,
  ClipboardList, CircleDollarSign, GraduationCap, Users
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import {
  activity, attendance, exams, fees,
  pending, performance
} from '@/lib/mock-data'

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: string }) {
  return (
    <Card className={cn('border-0 shadow-sm', tone)}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-[26px] font-bold tracking-tight text-slate-900">{value}</div>
        </div>
        <div className="flex size-11 items-center justify-center rounded-full bg-white/80 text-indigo-600 shadow-sm">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('border-slate-200/80 shadow-sm', className)}>
      <CardHeader className="px-5 pb-0 pt-5">
        <CardTitle className="text-sm font-bold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-4">{children}</CardContent>
    </Card>
  )
}

const chartConfig = { value: { label: 'Value', color: 'var(--chart-1)' } }

function AttendanceChart() {
  return (
    <ChartCard title="Attendance Overview">
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <AreaChart data={attendance} margin={{ left: -10, right: 12, top: 10 }}>
          <defs>
            <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef1f6" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis domain={[0, 160]} ticks={[0, 40, 80, 120, 160]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip content={<ChartTooltipContent />} />
          <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#attendanceFill)" />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  )
}

function FeeChart() {
  return (
    <ChartCard title="Fee Collection">
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart data={fees} margin={{ left: -2, right: 8, top: 10 }}>
          <CartesianGrid vertical={false} stroke="#eef1f6" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis domain={[0, 1000000]} ticks={[0, 250000, 500000, 750000, 1000000]} tickFormatter={(v) => v === 0 ? '0' : `${v / 1000}k`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip content={<ChartTooltipContent formatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} />} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
            {fees.map((entry) => (
              <Cell key={entry.month} fill={entry.month === 'Aug' ? '#6366f1' : '#c7d2fe'} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

function ClassPerformanceChart() {
  return (
    <ChartCard title="Class Performance">
      <ChartContainer config={chartConfig} className="h-[220px] w-full">
        <BarChart data={performance} margin={{ left: -20, right: 10, top: 10 }}>
          <CartesianGrid vertical={false} stroke="#eef1f6" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]}>
            {performance.map((_, i) => (
              <Cell key={i} fill={['#818cf8', '#a5b4fc', '#6366f1', '#c4b5fd', '#94a3b8'][i]} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  )
}

function RecentActivity() {
  return (
    <Card>
      <CardHeader className="px-5 pb-2 pt-5">
        <CardTitle className="text-sm font-bold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-5 pb-3">
        {activity.map(([title, name, time, Icon]) => (
          <div key={name} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-700">
                {title} <span className="font-normal text-slate-500">— {name}</span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">{time}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function UpcomingExams() {
  return (
    <Card>
      <CardHeader className="px-5 pb-2 pt-5">
        <CardTitle className="text-sm font-bold">Upcoming Exams</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-5 pb-3">
        {exams.map((exam) => (
          <div key={exam} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <ClipboardList className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-700">{exam}</div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                <CalendarDays className="size-3" /> Aug 28, 2026
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 bg-amber-50 text-[10px] font-medium text-amber-700">
              In 9 days
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function PendingFees() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-5 pb-2 pt-5">
        <CardTitle className="text-sm font-bold">Pending Fees</CardTitle>
        <Badge className="bg-rose-50 text-[10px] text-rose-600 hover:bg-rose-50">10 pending</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-5 pb-3">
        {pending.map(([initials, name]) => (
          <div key={name} className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 last:border-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-slate-700">{name}</div>
              <div className="truncate text-[10px] text-slate-400">1-A · Examination Fee · Half Yearly</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-slate-700">₹800</div>
              <div className="text-[10px] text-amber-600">pending</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function SchoolCalendar() {
  const days = Array.from({ length: 42 }, (_, i) => i - 5)
  const events = [3, 5, 22, 24, 26, 28, 29]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 px-5 pb-2 pt-5">
        <CalendarDays className="size-4 text-indigo-600" />
        <CardTitle className="text-sm font-bold">School Calendar</CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="mb-4 flex items-center justify-between">
          <button aria-label="Previous month"><ChevronLeft className="size-4 text-slate-400" /></button>
          <span className="text-xs font-bold text-slate-700">August 2026</span>
          <button aria-label="Next month"><ChevronRight className="size-4 text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] text-slate-400">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}${i}`} className="pb-2 font-semibold">{d}</div>
          ))}
          {days.map((day, i) => (
            <div
              key={i}
              className={cn(
                'mx-auto flex size-6 items-center justify-center rounded-full text-[10px]',
                day < 1 || day > 31 ? 'text-slate-300' : 'text-slate-600',
                events.includes(day) && 'bg-indigo-50 font-semibold text-indigo-600',
                day === 19 && 'ring-2 ring-indigo-500 ring-offset-1'
              )}
            >
              {day < 1 ? 31 + day : day > 31 ? day - 31 : day}
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-slate-100 pt-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Upcoming</div>
          <div className="flex flex-col gap-2 text-[11px] text-slate-500">
            <div>• Parent–Teacher Meeting – Aug 22</div>
            <div className="truncate">• Health Check-up Camp – Aug 24</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardOverview() {
  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Students" value="161" icon={Users} tone="bg-indigo-50/80" />
        <StatCard label="Total Teachers" value="22" icon={GraduationCap} tone="bg-emerald-50/80" />
        <StatCard label="Attendance Rate" value="—" icon={CalendarCheck} tone="bg-amber-50/80" />
        <StatCard label="Fee Collection" value="₹1,539,000" icon={CircleDollarSign} tone="bg-rose-50/80" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <AttendanceChart />
        <FeeChart />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <ClassPerformanceChart />
        <RecentActivity />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <UpcomingExams />
        <PendingFees />
        <SchoolCalendar />
      </div>
    </>
  )
}