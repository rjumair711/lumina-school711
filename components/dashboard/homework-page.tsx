'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AssignmentStatus } from '@prisma/client'
import { BookOpen, CalendarDays, ClipboardList, GraduationCap, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createHomework, deleteHomework, updateHomeworkStatus } from '@/app/actions/homework'
import type { getHomeworkDashboardData } from '@/app/actions/homework'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Data = Awaited<ReturnType<typeof getHomeworkDashboardData>>
type FormState = { title: string; description: string; dueDate: string; classId: string; subjectId: string; teacherId: string; status: AssignmentStatus }
const emptyForm: FormState = { title: '', description: '', dueDate: '', classId: '', subjectId: '', teacherId: '', status: AssignmentStatus.ACTIVE }
const statusLabels: Record<AssignmentStatus, string> = { ACTIVE: 'Active', OVERDUE: 'Overdue', DRAFT: 'Draft', COMPLETED: 'Completed' }

export default function HomeworkPage({ initialData }: { initialData: Data }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)

  // Periodic refresh also picks up changes made by other administrators.
  useEffect(() => {
    const id = window.setInterval(() => { if (document.visibilityState === 'visible' && !dialogOpen && !pending) router.refresh() }, 20000)
    return () => window.clearInterval(id)
  }, [router, dialogOpen, pending])

  const subjects = useMemo(() => initialData.subjects.filter(s => !form.classId || s.classIds.includes(form.classId)), [initialData.subjects, form.classId])
  const teachers = useMemo(() => initialData.teachers.filter(t => (!form.classId || t.classIds.includes(form.classId)) && (!form.subjectId || t.subjectIds.includes(form.subjectId))), [initialData.teachers, form.classId, form.subjectId])
  const visible = useMemo(() => initialData.homeworks.filter(item => {
    const effectiveStatus = item.status === AssignmentStatus.ACTIVE && item.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10) ? AssignmentStatus.OVERDUE : item.status
    return (!classFilter || item.classId === classFilter) && (!statusFilter || effectiveStatus === statusFilter) && [item.title, item.subjectName, item.teacherName].some(s => s.toLowerCase().includes(query.toLowerCase()))
  }), [initialData.homeworks, classFilter, statusFilter, query])

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await createHomework(form)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Assignment created')
      setForm(emptyForm)
      setDialogOpen(false)
      router.refresh()
    })
  }
  function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteHomework(id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Assignment deleted')
      router.refresh()
    })
  }
  function changeStatus(id: string, status: AssignmentStatus) {
    startTransition(async () => {
      const result = await updateHomeworkStatus(id, status)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Status updated')
      router.refresh()
    })
  }

  return <div className="flex flex-col gap-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Homework</h1><p className="mt-1 text-sm text-slate-500">{initialData.homeworks.length} assignments total.</p></div>
      <button type="button" onClick={() => setDialogOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#e95b29]"><ClipboardList className="size-4" /> + New Assignment</button>
    </div>
    <div className="flex flex-col gap-3 md:flex-row">
      <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search assignments" value={query} onChange={e => setQuery(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#FF6B35]" placeholder="Search by title, subject or teacher..." /></div>
      <select aria-label="Filter class" value={classFilter} onChange={e => setClassFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="">All Classes</option>{initialData.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select aria-label="Filter status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"><option value="">All Status</option>{Object.values(AssignmentStatus).map(s => <option value={s} key={s}>{statusLabels[s]}</option>)}</select>
    </div>
    {visible.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">No assignments found. {initialData.homeworks.length === 0 ? 'Create your first assignment to get started.' : 'Try a different filter.'}</div> :
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{visible.map(item => {
        const effectiveStatus = item.status === AssignmentStatus.ACTIVE && item.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10) ? AssignmentStatus.OVERDUE : item.status
        return <Card key={item.id} className="border-slate-200 shadow-sm"><CardContent className="p-5">
          <div className="flex items-start gap-3"><div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FF6B35]"><BookOpen className="size-4" /></div><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold text-slate-900" title={item.title}>{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.subjectName}</p></div>
            <Badge className={cn('shrink-0 text-[10px]', effectiveStatus === 'OVERDUE' ? 'bg-rose-50 text-rose-600' : effectiveStatus === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : effectiveStatus === 'DRAFT' ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-[#d95324]')}>{statusLabels[effectiveStatus]}</Badge>
            <button type="button" disabled={pending} aria-label={`Delete ${item.title}`} title="Delete assignment" onClick={() => remove(item.id, item.title)} className="shrink-0 text-slate-400 hover:text-rose-500 disabled:opacity-50"><Trash2 className="size-4" /></button></div>
          <p className="mt-4 min-h-10 whitespace-pre-wrap text-xs leading-5 text-slate-500">{item.description || 'No instructions provided.'}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Due: {item.dueDate.slice(0, 10)}</span><span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" />{item.className}</span><span className="inline-flex items-center gap-1.5"><GraduationCap className="size-3.5" />{item.teacherName}</span></div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3"><label htmlFor={`status-${item.id}`} className="text-xs text-slate-500">Assignment status</label><select id={`status-${item.id}`} value={item.status} disabled={pending} onChange={e => changeStatus(item.id, e.target.value as AssignmentStatus)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">{Object.values(AssignmentStatus).map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
        </CardContent></Card>
      })}</div>}
    {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4"><div role="dialog" aria-modal="true" aria-labelledby="new-homework-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B35]"><BookOpen className="size-5" /></div><div><h2 id="new-homework-title" className="text-lg font-bold text-slate-900">New Homework Assignment</h2><p className="mt-1 text-xs text-slate-500">Create and share an assignment with a class.</p></div></div><button type="button" aria-label="Close dialog" onClick={() => setDialogOpen(false)} disabled={pending} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X className="size-5" /></button></div>
      <form onSubmit={submit} className="flex flex-col gap-4"><div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5"><label htmlFor="hw-class" className="text-xs font-semibold">Class *</label><select id="hw-class" required value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, subjectId: '', teacherId: '' }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Select class</option>{initialData.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="hw-subject" className="text-xs font-semibold">Subject *</label><select id="hw-subject" required value={form.subjectId} disabled={!form.classId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value, teacherId: '' }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Select subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="hw-title" className="text-xs font-semibold">Assignment Title *</label><input id="hw-title" required maxLength={200} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="e.g. Weekly reading practice" /></div>
        <div className="flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="hw-description" className="text-xs font-semibold">Instructions</label><textarea id="hw-description" maxLength={10000} rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Add instructions for students..." /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="hw-due" className="text-xs font-semibold">Due Date *</label><input id="hw-due" type="date" required value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="hw-teacher" className="text-xs font-semibold">Teacher *</label><select id="hw-teacher" required value={form.teacherId} disabled={!form.classId || !form.subjectId} onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Select teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="hw-status" className="text-xs font-semibold">Status</label><select id="hw-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AssignmentStatus }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">{[AssignmentStatus.ACTIVE, AssignmentStatus.DRAFT, AssignmentStatus.COMPLETED].map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></div>
      </div><div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setDialogOpen(false)} disabled={pending} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="submit" disabled={pending} className="rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Creating...' : 'Create Assignment'}</button></div></form>
    </div></div>}
  </div>
}
