'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  saveExam,
  savePaper,
  saveTest,
  type AssessmentsData,
} from '@/app/actions/assessments'
import { DEFAULT_PASS_PERCENT } from '@/lib/grades'

export type Test = AssessmentsData['tests'][number]
export type Exam = AssessmentsData['exams'][number]
export type Paper = Exam['papers'][number]

export const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-400'
export const labelClass = 'flex flex-col gap-1.5 text-xs font-semibold text-slate-700'
export const primaryButton =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white shadow-sm shadow-orange-200 transition hover:bg-[#e95b29] disabled:cursor-not-allowed disabled:opacity-60'
export const secondaryButton =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-60'

// ------------------------------------------------------------------
// Modal shell
// ------------------------------------------------------------------

export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  title: string
  description?: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4">
      <button aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl',
          size === 'xl' && 'sm:max-w-5xl'
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => Promise<boolean>
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className={secondaryButton} onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            className={cn(primaryButton, 'bg-rose-600 shadow-rose-200 hover:bg-rose-700')}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (await onConfirm()) onClose()
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3 text-sm text-slate-600">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="size-4" />
        </div>
        <p className="pt-1.5">{message}</p>
      </div>
    </Modal>
  )
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </div>
  )
}

function NoSubjectsHint({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <p className="text-[11px] font-normal text-amber-700">
      No subjects assigned to this class.{' '}
      <Link href="/admin/subject-class" className="font-semibold underline">
        Assign subjects
      </Link>
    </p>
  )
}

const toInt = (v: string) => (v.trim() === '' ? NaN : Number(v))

// ------------------------------------------------------------------
// Test form
// ------------------------------------------------------------------

export function TestForm({
  data,
  test,
  defaultDate,
  onClose,
  onSaved,
}: {
  data: AssessmentsData
  test: Test | null
  defaultDate: string
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const locked = Boolean(test && test.stats.entered > 0)

  const [form, setForm] = useState({
    classId: test?.classId ?? '',
    subjectId: test?.subjectId ?? '',
    title: test?.title ?? '',
    date: test?.date ?? defaultDate,
    totalMarks: String(test?.totalMarks ?? 50),
    passingMarks: test?.passingMarks === null || test?.passingMarks === undefined ? '' : String(test.passingMarks),
    duration: String(test?.duration ?? 45),
    status: test?.status ?? 'Scheduled',
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const subjects = data.subjectsByClass[form.classId] ?? []
  const total = toInt(form.totalMarks)
  const defaultPass = Number.isFinite(total) ? Math.ceil((total * DEFAULT_PASS_PERCENT) / 100) : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await saveTest(
        {
          title: form.title,
          classId: form.classId,
          subjectId: form.subjectId,
          date: form.date,
          totalMarks: toInt(form.totalMarks),
          passingMarks: form.passingMarks.trim() === '' ? null : toInt(form.passingMarks),
          duration: toInt(form.duration),
          status: form.status,
        },
        test?.id
      )
      if (res.success) {
        toast.success(test ? 'Test updated' : 'Test created')
        onSaved()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Modal
      title={test ? 'Edit test' : 'New test'}
      description="A single-subject test for one class."
      onClose={onClose}
      footer={
        <>
          <button className={secondaryButton} onClick={onClose} type="button">Cancel</button>
          <button className={primaryButton} form="test-form" type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {test ? 'Save changes' : 'Create test'}
          </button>
        </>
      }
    >
      <form id="test-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          Class *
          <select
            required
            value={form.classId}
            disabled={locked}
            onChange={(e) => set({ classId: e.target.value, subjectId: '' })}
            className={inputClass}
          >
            <option value="">Select class</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>Class {c.name} ({c.studentCount} students)</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Subject *
          <select
            required
            value={form.subjectId}
            disabled={!form.classId || locked}
            onChange={(e) => {
              const subject = subjects.find((s) => s.id === e.target.value)
              set({
                subjectId: e.target.value,
                title: form.title || (subject ? `Unit Test – ${subject.name}` : ''),
              })
            }}
            className={inputClass}
          >
            <option value="">{form.classId ? 'Select subject' : 'Choose a class first'}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.teacher ? ` · ${s.teacher}` : ''}
              </option>
            ))}
          </select>
          <NoSubjectsHint show={Boolean(form.classId) && subjects.length === 0} />
        </label>
        {locked && (
          <p className="text-[11px] text-slate-500 sm:col-span-2">
            Marks are already entered, so class and subject are locked.
          </p>
        )}
        <label className={cn(labelClass, 'sm:col-span-2')}>
          Title *
          <input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            className={inputClass}
            placeholder="e.g. Unit Test 2 – Mathematics"
          />
        </label>
        <label className={labelClass}>
          Date *
          <input required type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} className={inputClass} />
        </label>
        <label className={labelClass}>
          Duration (minutes) *
          <input required type="number" min={1} max={600} value={form.duration} onChange={(e) => set({ duration: e.target.value })} className={inputClass} />
        </label>
        <label className={labelClass}>
          Total marks *
          <input required type="number" min={1} max={1000} value={form.totalMarks} onChange={(e) => set({ totalMarks: e.target.value })} className={inputClass} />
        </label>
        <label className={labelClass}>
          Passing marks
          <input
            type="number"
            min={0}
            max={Number.isFinite(total) ? total : undefined}
            value={form.passingMarks}
            onChange={(e) => set({ passingMarks: e.target.value })}
            className={inputClass}
            placeholder={defaultPass !== null ? `Default ${defaultPass} (${DEFAULT_PASS_PERCENT}%)` : ''}
          />
        </label>
        <label className={labelClass}>
          Status
          <select value={form.status} onChange={(e) => set({ status: e.target.value })} className={inputClass}>
            {data.statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </form>
    </Modal>
  )
}

// ------------------------------------------------------------------
// Exam form
// ------------------------------------------------------------------

export function ExamForm({
  data,
  exam,
  defaultDate,
  onClose,
  onSaved,
}: {
  data: AssessmentsData
  exam: Exam | null
  defaultDate: string
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: exam?.title ?? '',
    examType: exam?.examType ?? data.examTypes[1],
    classId: exam?.classId ?? '',
    startDate: exam?.startDate ?? defaultDate,
    endDate: exam?.endDate ?? defaultDate,
    status: exam?.status ?? 'Scheduled',
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))
  const classLocked = Boolean(exam && exam.papers.length > 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await saveExam(form, exam?.id)
      if (res.success) {
        toast.success(exam ? 'Exam updated' : 'Exam created. Now add its subject papers.')
        onSaved()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Modal
      title={exam ? 'Edit exam' : 'New exam'}
      description="A multi-subject exam for one class. Add subject papers after creating it."
      onClose={onClose}
      footer={
        <>
          <button className={secondaryButton} onClick={onClose} type="button">Cancel</button>
          <button className={primaryButton} form="exam-form" type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {exam ? 'Save changes' : 'Create exam'}
          </button>
        </>
      }
    >
      <form id="exam-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className={cn(labelClass, 'sm:col-span-2')}>
          Exam title *
          <input required maxLength={200} value={form.title} onChange={(e) => set({ title: e.target.value })} className={inputClass} placeholder="e.g. Term 1 Examination" />
        </label>
        <label className={labelClass}>
          Exam type *
          <select value={form.examType} onChange={(e) => set({ examType: e.target.value })} className={inputClass}>
            {data.examTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          Class *
          <select required value={form.classId} disabled={classLocked} onChange={(e) => set({ classId: e.target.value })} className={inputClass}>
            <option value="">Select class</option>
            {data.classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
          </select>
          {classLocked && <span className="text-[11px] font-normal text-slate-500">Locked while the exam has papers.</span>}
        </label>
        <label className={labelClass}>
          Start date *
          <input
            required
            type="date"
            value={form.startDate}
            onChange={(e) => set({ startDate: e.target.value, endDate: form.endDate < e.target.value ? e.target.value : form.endDate })}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          End date *
          <input required type="date" min={form.startDate} value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inputClass} />
        </label>
        <label className={labelClass}>
          Status
          <select value={form.status} onChange={(e) => set({ status: e.target.value })} className={inputClass}>
            {data.statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </form>
    </Modal>
  )
}

// ------------------------------------------------------------------
// Exam paper form
// ------------------------------------------------------------------

export function PaperForm({
  data,
  exam,
  paper,
  onClose,
  onSaved,
}: {
  data: AssessmentsData
  exam: Exam
  paper: Paper | null
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const used = useMemo(
    () => new Set(exam.papers.filter((p) => p.id !== paper?.id).map((p) => p.subjectId)),
    [exam.papers, paper?.id]
  )
  const subjects = (data.subjectsByClass[exam.classId] ?? []).filter((s) => !used.has(s.id))
  const locked = Boolean(paper && paper.stats.entered > 0)

  const [form, setForm] = useState({
    subjectId: paper?.subjectId ?? subjects[0]?.id ?? '',
    date: paper?.date ?? exam.startDate,
    totalMarks: String(paper?.totalMarks ?? 100),
    passingMarks: paper?.passingMarks === null || paper?.passingMarks === undefined ? '' : String(paper.passingMarks),
  })
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const total = toInt(form.totalMarks)
  const defaultPass = Number.isFinite(total) ? Math.ceil((total * DEFAULT_PASS_PERCENT) / 100) : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await savePaper(
        exam.id,
        {
          subjectId: form.subjectId,
          date: form.date,
          totalMarks: toInt(form.totalMarks),
          passingMarks: form.passingMarks.trim() === '' ? null : toInt(form.passingMarks),
        },
        paper?.id
      )
      if (res.success) {
        toast.success(paper ? 'Paper updated' : 'Paper added')
        onSaved()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Modal
      title={paper ? 'Edit paper' : 'Add subject paper'}
      description={`${exam.title} · Class ${exam.className} · ${exam.dateLabel}`}
      onClose={onClose}
      footer={
        <>
          <button className={secondaryButton} onClick={onClose} type="button">Cancel</button>
          <button className={primaryButton} form="paper-form" type="submit" disabled={pending || subjects.length === 0}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {paper ? 'Save changes' : 'Add paper'}
          </button>
        </>
      }
    >
      <form id="paper-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <label className={cn(labelClass, 'sm:col-span-2')}>
          Subject *
          <select required value={form.subjectId} disabled={locked} onChange={(e) => set({ subjectId: e.target.value })} className={inputClass}>
            <option value="">Select subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {subjects.length === 0 && (
            <p className="text-[11px] font-normal text-amber-700">
              Every subject assigned to this class already has a paper.{' '}
              <Link href="/admin/subject-class" className="font-semibold underline">Assign more subjects</Link>
            </p>
          )}
          {locked && <span className="text-[11px] font-normal text-slate-500">Marks are entered, so the subject is locked.</span>}
        </label>
        <label className={cn(labelClass, 'sm:col-span-2')}>
          Date *
          <input required type="date" min={exam.startDate} max={exam.endDate} value={form.date} onChange={(e) => set({ date: e.target.value })} className={inputClass} />
        </label>
        <label className={labelClass}>
          Total marks *
          <input required type="number" min={1} max={1000} value={form.totalMarks} onChange={(e) => set({ totalMarks: e.target.value })} className={inputClass} />
        </label>
        <label className={labelClass}>
          Passing marks
          <input
            type="number"
            min={0}
            max={Number.isFinite(total) ? total : undefined}
            value={form.passingMarks}
            onChange={(e) => set({ passingMarks: e.target.value })}
            className={inputClass}
            placeholder={defaultPass !== null ? `Default ${defaultPass} (${DEFAULT_PASS_PERCENT}%)` : ''}
          />
        </label>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </form>
    </Modal>
  )
}
