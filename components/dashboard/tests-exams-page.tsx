'use client'

import { useState } from 'react'
import { CalendarDays, ClipboardList, Pencil, Receipt, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { examRows, testRows } from '@/lib/mock-data'

function AssessmentTable({ title, count, filters, headers, rows }: { title: string; count: string; filters: string[]; headers: string[]; rows: readonly (readonly string[])[] }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col gap-4 px-5 pb-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary" className="rounded-full bg-orange-50 text-[#d95324]">{count}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <select key={filter} aria-label={filter} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600">
              <option>{filter}</option>
              <option>Class 9 - A</option>
              <option>Class 8 - B</option>
            </select>
          ))}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row[0]} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-4 font-semibold text-slate-800">{row[0]}</td>
                {row.slice(1).map((cell, cellIndex) => (
                  <td key={`${row[0]}-${cellIndex}`} className={cn('px-3 py-4 text-xs', headers[cellIndex + 1] === 'Subject' ? 'font-bold text-slate-700' : 'text-slate-500')}>
                    {(headers[cellIndex + 1] === 'Status') ? (
                      <Badge variant="secondary" className={cn('rounded-full text-[10px]', cell.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-700' : cell.toLowerCase() === 'scheduled' ? 'bg-orange-50 text-[#d95324]' : 'bg-slate-100 text-slate-600')}>
                        {cell}
                      </Badge>
                    ) : (headers[cellIndex + 1] === 'Date' || headers[cellIndex + 1] === 'Start Date' || headers[cellIndex + 1] === 'End Date' || headers[cellIndex + 1] === 'Duration') ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5 text-slate-400" />
                        {cell}
                      </span>
                    ) : cell}
                  </td>
                ))}
                {headers.includes('Actions') && (
                  <td className="px-3 py-4">
                    <div className="flex gap-1">
                      <button aria-label={`Edit ${row[0]}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
                        <Pencil className="size-4" />
                      </button>
                      <button aria-label={`Delete ${row[0]}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export default function TestsExamsPage() {
  const [tab, setTab] = useState('Tests')
  const inputClass = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100'
  const labelClass = 'flex flex-col gap-1.5 text-xs font-semibold text-slate-700'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tests &amp; Exams</h1>
        <p className="mt-1 text-sm text-slate-500">Schedule unit tests and multi-subject exams for classes.</p>
      </div>
      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">
        {([['Tests', ClipboardList], ['Exams', CalendarDays], ['Results', Receipt]] as const).map(([label, Icon]) => {
          const IconComponent = Icon as React.ComponentType<{ className?: string }>
          return (
            <button 
              key={label as string} 
              onClick={() => setTab(label as string)} 
              className={cn('flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold transition-all sm:text-sm', tab === label ? 'bg-white text-[#FF6B35] shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              <IconComponent className="size-4" />{label as string}
            </button>
          )
        })}
      </div>

      {tab === 'Tests' && (
        <>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle className="text-base">Create Test</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Single-subject unit test for one class.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => event.preventDefault()} className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>Class *
                  <select required className={inputClass}>
                    <option value="">Select class</option>
                    <option>9 - A</option>
                    <option>8 - B</option>
                    <option>7 - A</option>
                  </select>
                </label>
                <label className={labelClass}>Subject *
                  <select required className={inputClass}>
                    <option value="">Select subject</option>
                    <option>English</option>
                    <option>Mathematics</option>
                    <option>Science</option>
                  </select>
                </label>
                <label className={cn(labelClass, 'sm:col-span-2')}>Title *
                  <input required className={inputClass} placeholder="e.g. Unit Test 2 — English" />
                </label>
                <label className={labelClass}>Date *
                  <input required type="date" className={inputClass} />
                </label>
                <label className={labelClass}>Total Marks *
                  <input required type="number" min="1" className={inputClass} placeholder="50" />
                </label>
                <label className={labelClass}>Duration (min) *
                  <input required type="number" min="1" className={inputClass} placeholder="45" />
                </label>
                <label className={cn(labelClass, 'sm:col-span-2')}>Description
                  <textarea className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B35]" placeholder="Add instructions or topics covered..." />
                </label>
                <button className="w-fit rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e95b29]" type="submit">+ Create Test</button>
              </form>
            </CardContent>
          </Card>
          <AssessmentTable 
            title="All Tests" 
            count="60" 
            filters={['All classes', 'All subjects']} 
            headers={['Title', 'Subject', 'Class', 'Date', 'Marks', 'Duration', 'Status', 'Actions']} 
            rows={testRows} 
          />
        </>
      )}

      {tab === 'Exams' && (
        <>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle className="text-base">Create Exam</CardTitle>
              <p className="mt-1 text-xs text-slate-500">Multi-subject scheduled exam for one class.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => event.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className={labelClass}>Exam Title *
                  <input required className={inputClass} placeholder="e.g. Term 1 Examination" />
                </label>
                <label className={labelClass}>Exam Type *
                  <select required className={inputClass}>
                    <option>Annual Exam</option>
                    <option>Mid Term</option>
                    <option>Unit Exam</option>
                  </select>
                </label>
                <label className={labelClass}>Class *
                  <select required className={inputClass}>
                    <option>9 - A</option>
                    <option>8 - B</option>
                    <option>7 - A</option>
                  </select>
                </label>
                <label className={labelClass}>Start Date *
                  <input required type="date" className={inputClass} />
                </label>
                <label className={labelClass}>End Date *
                  <input required type="date" className={inputClass} />
                </label>
                <label className={cn(labelClass, 'sm:col-span-2 lg:col-span-3')}>Description
                  <textarea className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B35]" placeholder="Add exam instructions..." />
                </label>
                <button className="w-fit rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#e95b29]" type="submit">+ Create Exam</button>
              </form>
            </CardContent>
          </Card>
          <AssessmentTable 
            title="All Exams" 
            count="18" 
            filters={['All classes', 'All exam types']} 
            headers={['Title', 'Type', 'Class', 'Start Date', 'End Date', 'Status']} 
            rows={examRows} 
          />
        </>
      )}

      {tab === 'Results' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="px-5 pb-2 pt-5">
            <CardTitle className="text-base">Results</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Review performance after tests and exams are completed.</p>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5 sm:grid-cols-3">
            <div className="rounded-xl bg-orange-50 p-4">
              <div className="text-xs text-slate-500">Tests completed</div>
              <div className="mt-1 text-2xl font-bold text-[#FF6B35]">42</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">Average score</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">78%</div>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <div className="text-xs text-slate-500">Results published</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">36</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
