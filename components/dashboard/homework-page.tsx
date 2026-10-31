'use client'

import { useState } from 'react'
import { BookOpen, CalendarDays, ClipboardList, GraduationCap, Search, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { homeworkAssignments } from '@/lib/mock-data'

export default function HomeworkPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [classFilter, setClassFilter] = useState('All Classes')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [query, setQuery] = useState('')

  const visible = homeworkAssignments.filter(
    (item) =>
      (classFilter === 'All Classes' || item.className === classFilter) &&
      (statusFilter === 'All Status' || item.status === statusFilter) &&
      item.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Homework</h1>
          <p className="mt-1 text-sm text-slate-500">80 assignments total.</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#e95b29]"
        >
          <ClipboardList className="size-4" />+ New Assignment
        </button>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#FF6B35]"
            placeholder="Search by title or subject..."
          />
        </div>
        <select
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"
        >
          <option>All Classes</option>
          <option>Class 3-A</option>
          <option>Class 5-A</option>
          <option>Class 6-A</option>
          <option>Class 4-B</option>
          <option>Class 2-A</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"
        >
          <option>All Status</option>
          <option>Active</option>
          <option>Overdue</option>
          <option>Draft</option>
          <option>Completed</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {visible.map((item) => {
          const progress = item.total ? Math.round((item.submitted / item.total) * 100) : 0
          return (
            <Card key={item.title} className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FF6B35]">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-bold text-slate-900">{item.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">{item.subject}</p>
                  </div>
                  <Badge
                    className={cn(
                      'shrink-0 text-[10px] hover:bg-transparent',
                      item.status === 'Overdue'
                        ? 'bg-rose-50 text-rose-600'
                        : item.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.status === 'Draft'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-orange-50 text-[#d95324]'
                    )}
                  >
                    {item.status}
                  </Badge>
                  <button aria-label={`Delete ${item.title}`} className="shrink-0 text-slate-300 hover:text-rose-500">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <p className="mt-4 min-h-10 text-xs leading-5 text-slate-500">{item.description}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-slate-400" />
                    Due: {item.due}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-slate-400" />
                    {item.className}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="size-3.5 text-slate-400" />
                    {item.teacher}
                  </span>
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>Submissions</span>
                    <span>
                      {item.submitted}/{item.total}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#FF6B35]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="new-homework-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B35]">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h2 id="new-homework-title" className="text-lg font-bold text-slate-900">
                    New Homework Assignment
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">Create and share an assignment with a class.</p>
                </div>
              </div>
              <button type="button" onClick={() => setDialogOpen(false)} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
                <X className="size-5" />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                setDialogOpen(false)
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="homework-class" className="text-xs font-semibold text-slate-700">Class *</label>
                  <select id="homework-class" required className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option>Class 3 - Section A</option>
                    <option>Class 5 - Section A</option>
                    <option>Class 6 - Section A</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="homework-subject" className="text-xs font-semibold text-slate-700">Subject *</label>
                  <select id="homework-subject" required className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option>English</option>
                    <option>Mathematics</option>
                    <option>Science</option>
                    <option>Social Studies</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="homework-title" className="text-xs font-semibold text-slate-700">Assignment Title *</label>
                  <input id="homework-title" required placeholder="e.g. Weekly reading practice" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B35]" />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="homework-description" className="text-xs font-semibold text-slate-700">Instructions</label>
                  <textarea id="homework-description" rows={4} placeholder="Add instructions for students..." className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B35]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="homework-due" className="text-xs font-semibold text-slate-700">Due Date *</label>
                  <input id="homework-due" type="date" required className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B35]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="homework-teacher" className="text-xs font-semibold text-slate-700">Teacher *</label>
                  <select id="homework-teacher" required className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option>Neha Patel</option>
                    <option>Rohan Kumar</option>
                    <option>Mohammed Asif</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setDialogOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white">Create Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}