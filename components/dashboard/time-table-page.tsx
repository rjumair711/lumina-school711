'use client'

import { useState } from 'react'
import { BookOpen, CalendarCheck, CalendarDays, GraduationCap, Pencil, Settings2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { timetableRows } from '@/lib/mock-data'

const subjectStyles: Record<string, string> = { 
  'English': 'border-sky-200 bg-sky-50 text-sky-700', 
  'Mathematics': 'border-violet-200 bg-violet-50 text-violet-700', 
  'Computer Science': 'border-emerald-200 bg-emerald-50 text-emerald-700', 
  'Art & Craft': 'border-orange-200 bg-orange-50 text-orange-700' 
}

export default function TimetablePage() {
  const [entryOpen, setEntryOpen] = useState(false)
  const [periodsOpen, setPeriodsOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState({ day: 'Monday', period: 'Period 1' })
  
  const openEntry = (day: string, period: string) => { 
    setSelectedCell({ day, period })
    setEntryOpen(true) 
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Weekly Timetable</h1>
          <p className="mt-1 text-sm text-slate-500">View and manage class schedules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600">
            <option>Class 1-A</option>
            <option>Class 1-B</option>
            <option>Class 2-A</option>
          </select>
          <button onClick={() => setPeriodsOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:border-[#FF6B35] hover:text-[#FF6B35]">
            <Settings2 className="size-4" />Manage Periods
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.entries(subjectStyles).map(([subject, style]) => (
          <button key={subject} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold', style, subject === 'English' && 'ring-1 ring-slate-700')}>
            {subject}
          </button>
        ))}
      </div>
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="overflow-x-auto p-0">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[145px_repeat(6,minmax(130px,1fr))] border-b bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-2 px-4 py-4"><CalendarDays className="size-3.5" />Time</div>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day) => <div key={day} className="px-3 py-4 text-center">{day}</div>)}
            </div>
            {timetableRows.map((row) => (
              <div key={row.period} className="grid grid-cols-[145px_repeat(6,minmax(130px,1fr))] border-b last:border-0"> 
                <div className="flex flex-col justify-center px-4 py-3">
                  <span className="text-xs font-bold text-slate-700">{row.period}</span>
                  <span className="mt-1 text-[10px] text-slate-400">{row.time}</span>
                </div>
                {row.break ? (
                  <div className="col-span-6 flex items-center justify-center bg-slate-50/60 text-xs font-medium text-slate-400">{row.period}</div>
                ) : (
                  row.cells?.map((cell, index) => (
                    <button key={`${row.period}-${index}`} onClick={() => openEntry(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][index], row.period)} className="m-2 rounded-xl border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className={cn('w-fit rounded-md border px-2 py-1 text-[11px] font-bold', subjectStyles[cell.subject])}>{cell.subject}</div>
                      <div className="mt-2 text-[10px] text-slate-400">{cell.teacher}</div>
                    </button>
                  ))
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['48', 'Total Periods', CalendarCheck],
          ['7', 'Subjects', BookOpen],
          ['16', 'Teachers', GraduationCap],
          ['9', 'Period Rows', CalendarDays]
        ].map(([value, label, Icon]) => {
          const IconComponent = Icon as React.ComponentType<{ className?: string }>
          return (
            <Card key={label as string} className="border-orange-100 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50 text-[#FF6B35]">
                  <IconComponent className="size-4" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-900">{String(value)}</div>
                  <div className="text-[11px] text-slate-500">{String(label)}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {entryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Entry</h2>
                <p className="mt-1 text-xs text-slate-500">{selectedCell.day} · {selectedCell.period}</p>
              </div>
              <button onClick={() => setEntryOpen(false)} aria-label="Close dialog"><X className="size-5 text-slate-400" /></button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); setEntryOpen(false) }} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">Subject
                <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                  <option>English</option><option>Mathematics</option><option>Computer Science</option><option>Art & Craft</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">Teacher
                <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-normal" defaultValue="Ms. Neha" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEntryOpen(false)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
                <button className="rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {periodsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Manage Periods</h2>
                <p className="mt-1 text-xs text-slate-500">Configure school day timings.</p>
              </div>
              <button onClick={() => setPeriodsOpen(false)} aria-label="Close dialog"><X className="size-5 text-slate-400" /></button>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              {['Period 1 · 08:00 - 08:45','Period 2 · 08:45 - 09:30','Short Break · 09:30 - 09:45','Period 3 · 09:45 - 10:30'].map((period) => (
                <div key={period} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600">
                  <span>{period}</span>
                  <Pencil className="size-3.5 text-slate-400" />
                </div>
              ))}
              <button onClick={() => setPeriodsOpen(false)} className="mt-2 rounded-xl bg-[#FF6B35] py-2.5 text-sm font-semibold text-white">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}