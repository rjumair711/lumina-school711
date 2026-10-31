'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { CircleDollarSign, GraduationCap, Receipt, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { reportAttendanceData, reportClasses, reportFeeData } from '@/lib/mock-data'

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

export default function ReportsPage() {
  const [tab, setTab] = useState('Overview')
  const [month, setMonth] = useState('Aug')
  const [year, setYear] = useState('2026')
  const [className, setClassName] = useState('All Classes')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Live data across attendance, exams and finances.</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {['Overview', 'Attendance', 'Exam Results', 'Finance'].map((item) => (
          <button 
            key={item} 
            onClick={() => setTab(item)} 
            className={cn('rounded-t-lg px-4 py-3 text-sm font-semibold text-slate-500 transition-colors', tab === item && 'border-b-2 border-[#FF6B35] text-[#FF6B35]')}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Overview' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active Students" value="162" icon={Users} tone="bg-orange-50" />
            <StatCard label="Active Teachers" value="23" icon={GraduationCap} tone="bg-blue-50" />
            <StatCard label="Total Collected" value="₹1539.8k" icon={CircleDollarSign} tone="bg-emerald-50" />
            <StatCard label="Fee Pending" value="₹714.9k" icon={Receipt} tone="bg-amber-50" />
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between px-5 pb-0 pt-5">
              <CardTitle className="text-sm font-bold">Monthly Fee Overview</CardTitle>
              <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#FF6B35] hover:text-[#FF6B35]">
                Export
              </button>
            </CardHeader>
            <CardContent className="px-3 pb-5 pt-4">
              <ChartContainer config={{ collected: { label: 'Collected', color: '#22c55e' }, pending: { label: 'Pending', color: '#FF6B35' } }} className="h-[300px] w-full">
                <BarChart data={reportFeeData} margin={{ left: 0, right: 12, top: 10 }}>
                  <CartesianGrid vertical={false} stroke="#eef1f6" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 1600]} ticks={[0, 400, 800, 1200, 1600]} tickFormatter={(value) => `${value}k`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="px-5 pb-0 pt-5">
              <CardTitle className="text-sm font-bold">Classes (20)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 px-5 pb-5 pt-4">
              {reportClasses.map((item) => (
                <Badge key={item} variant="secondary" className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#d95324]">
                  {item}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </>
      ) : tab === 'Attendance' ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Month
              <select value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                <option>Aug</option><option>Jul</option><option>Jun</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Year
              <select value={year} onChange={(event) => setYear(event.target.value)} className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                <option>2026</option><option>2025</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Class
              <select value={className} onChange={(event) => setClassName(event.target.value)} className="mt-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                <option>All Classes</option><option>Class 1</option><option>Class 2</option>
              </select>
            </label>
            <button className="h-10 rounded-xl bg-[#FF6B35] px-5 text-sm font-semibold text-white">Generate</button>
            <button className="ml-auto h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600">Export CSV</button>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="px-5 pb-0 pt-5">
              <CardTitle className="text-sm font-bold">Attendance by Class — {month} {year}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-5 pt-4">
              <ChartContainer config={{ value: { label: 'Attendance', color: '#3b82f6' } }} className="h-[300px] w-full">
                <BarChart data={reportAttendanceData} margin={{ left: 0, right: 12, top: 10 }}>
                  <CartesianGrid vertical={false} stroke="#eef1f6" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="px-5 pb-0 pt-5">
              <CardTitle className="text-sm font-bold">Class-wise Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 px-5 pb-3 pt-2 sm:grid-cols-2">
              {reportAttendanceData.slice(0, 10).map((item) => (
                <div key={item.name} className="flex items-center justify-between border-b border-slate-100 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{item.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{Math.round(item.value * 1.2)} present out of 120 total</div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{item.value}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex min-h-[260px] items-center justify-center p-8 text-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{tab}</h2>
              <p className="mt-2 text-sm text-slate-500">Detailed {tab.toLowerCase()} reports will appear here.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
