
'use client'

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'

import { useRouter } from 'next/navigation'
import { AssignmentStatus } from '@prisma/client'

import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Search,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

import { toast } from 'sonner'

import {
  createHomework,
  deleteHomework,
  updateHomeworkStatus,
} from '@/app/actions/homework'

import type {
  getHomeworkDashboardData,
} from '@/app/actions/homework'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Data = Awaited<
  ReturnType<typeof getHomeworkDashboardData>
>

type FormState = {
  title: string
  description: string
  dueDate: string
  classId: string
  subjectId: string
  teacherId: string
  status: AssignmentStatus
}

const emptyForm: FormState = {
  title: '',
  description: '',
  dueDate: '',
  classId: '',
  subjectId: '',
  teacherId: '',
  status: AssignmentStatus.ACTIVE,
}

const statusLabels: Record<AssignmentStatus, string> = {
  ACTIVE: 'Active',
  OVERDUE: 'Overdue',
  DRAFT: 'Draft',
  COMPLETED: 'Completed',
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#FF6B35] disabled:cursor-not-allowed disabled:bg-slate-50'

export default function HomeworkPage({
  initialData,
}: {
  initialData: Data
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [classFilter, setClassFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [query, setQuery] = useState('')

  const [form, setForm] = useState<FormState>(emptyForm)

  // Refresh data without interrupting an open form.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        !dialogOpen &&
        !pending
      ) {
        router.refresh()
      }
    }, 20000)

    return () => window.clearInterval(interval)
  }, [router, dialogOpen, pending])

  // Exact assignments belonging to the selected class.
  const classAssignments = useMemo(() => {
    if (!form.classId) return []

    return initialData.assignments.filter(
      (item) => item.classId === form.classId
    )
  }, [initialData.assignments, form.classId])

  // Subjects available in the chosen class.
  const subjects = useMemo(() => {
    return classAssignments.map((item) => ({
      id: item.subjectId,
      name: item.subjectName,
      code: item.subjectCode,
    }))
  }, [classAssignments])

  // One subject has one primary assigned teacher.
  const selectedAssignment = useMemo(() => {
    return classAssignments.find(
      (item) => item.subjectId === form.subjectId
    )
  }, [classAssignments, form.subjectId])

  const teacher = selectedAssignment?.teacherId
    ? {
        id: selectedAssignment.teacherId,
        name: selectedAssignment.teacherName,
      }
    : null

  // Keep the teacher ID synced with the current assignment.
  useEffect(() => {
    const nextTeacherId =
      selectedAssignment?.teacherId || ''

    setForm((current) => {
      if (current.teacherId === nextTeacherId) {
        return current
      }

      return {
        ...current,
        teacherId: nextTeacherId,
      }
    })
  }, [selectedAssignment?.teacherId])

  // Search and filter homework records.
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase()

    return initialData.homeworks.filter((item) => {
      const effectiveStatus =
        item.status === AssignmentStatus.ACTIVE &&
        item.dueDate.slice(0, 10) <
          new Date().toISOString().slice(0, 10)
          ? AssignmentStatus.OVERDUE
          : item.status

      const matchesClass =
        !classFilter || item.classId === classFilter

      const matchesStatus =
        !statusFilter || effectiveStatus === statusFilter

      const matchesSearch = [
        item.title,
        item.subjectName,
        item.teacherName,
      ].some((value) =>
        value.toLowerCase().includes(search)
      )

      return (
        matchesClass &&
        matchesStatus &&
        matchesSearch
      )
    })
  }, [
    initialData.homeworks,
    classFilter,
    statusFilter,
    query,
  ])

  function openDialog() {
    setForm({ ...emptyForm })
    setDialogOpen(true)

    // Fetch the latest assignments from the server.
    router.refresh()
  }

  function closeDialog() {
    if (pending) return

    setDialogOpen(false)
    setForm({ ...emptyForm })
  }

  function submit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!form.classId) {
      toast.error('Please select a class.')
      return
    }

    if (!form.subjectId) {
      toast.error('Please select a subject.')
      return
    }

    if (!selectedAssignment?.teacherId) {
      toast.error(
        'No teacher is assigned to this subject. Assign a teacher in Subject & Class Assignment first.'
      )
      return
    }

    startTransition(async () => {
      const result = await createHomework({
        ...form,
        teacherId: selectedAssignment.teacherId!,
      })

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('Homework assignment created')
      setDialogOpen(false)
      setForm({ ...emptyForm })
      router.refresh()
    })
  }

  function remove(id: string, title: string) {
    if (
      !window.confirm(
        `Delete "${title}"? This cannot be undone.`
      )
    ) {
      return
    }

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

  function changeStatus(
    id: string,
    status: AssignmentStatus
  ) {
    startTransition(async () => {
      const result = await updateHomeworkStatus(
        id,
        status
      )

      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success('Status updated')
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Homework
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {initialData.homeworks.length} assignments total.
          </p>
        </div>

        <button
          type="button"
          onClick={openDialog}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#e95b29]"
        >
          <ClipboardList className="size-4" />
          + New Assignment
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

          <input
            aria-label="Search assignments"
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            className={cn(inputClass, 'pl-10')}
            placeholder="Search by title, subject or teacher..."
          />
        </div>

        <select
          aria-label="Filter class"
          value={classFilter}
          onChange={(event) =>
            setClassFilter(event.target.value)
          }
          className={cn(inputClass, 'md:w-48')}
        >
          <option value="">All Classes</option>

          {initialData.classes.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter status"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className={cn(inputClass, 'md:w-44')}
        >
          <option value="">All Status</option>

          {Object.values(AssignmentStatus).map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {statusLabels[status]}
              </option>
            )
          )}
        </select>
      </div>

      {/* ASSIGNMENTS */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          {initialData.homeworks.length === 0
            ? 'No homework assignments yet. Create your first assignment.'
            : 'No assignments match your filters.'}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {visible.map((item) => {
            const effectiveStatus =
              item.status === AssignmentStatus.ACTIVE &&
              item.dueDate.slice(0, 10) <
                new Date().toISOString().slice(0, 10)
                ? AssignmentStatus.OVERDUE
                : item.status

            return (
              <Card
                key={item.id}
                className="border-slate-200 shadow-sm"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FF6B35]">
                      <BookOpen className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-slate-900">
                        {item.title}
                      </h2>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.subjectName}
                      </p>
                    </div>

                    <Badge
                      className={cn(
                        'shrink-0 text-[10px]',
                        effectiveStatus === 'OVERDUE'
                          ? 'bg-rose-50 text-rose-600'
                          : effectiveStatus === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : effectiveStatus === 'DRAFT'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-orange-50 text-[#d95324]'
                      )}
                    >
                      {statusLabels[effectiveStatus]}
                    </Badge>

                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Delete ${item.title}`}
                      onClick={() =>
                        remove(item.id, item.title)
                      }
                      className="text-slate-400 hover:text-rose-500 disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <p className="mt-4 min-h-10 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                    {item.description ||
                      'No instructions provided.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      Due: {item.dueDate.slice(0, 10)}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <BookOpen className="size-3.5" />
                      {item.className}
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="size-3.5" />
                      {item.teacherName}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <label
                      htmlFor={`status-${item.id}`}
                      className="text-xs text-slate-500"
                    >
                      Assignment status
                    </label>

                    <select
                      id={`status-${item.id}`}
                      value={item.status}
                      disabled={pending}
                      onChange={(event) =>
                        changeStatus(
                          item.id,
                          event.target.value as AssignmentStatus
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    >
                      {Object.values(
                        AssignmentStatus
                      ).map((status) => (
                        <option
                          key={status}
                          value={status}
                        >
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* CREATE HOMEWORK DIALOG */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-homework-title"
            className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  id="new-homework-title"
                  className="text-lg font-bold text-slate-900"
                >
                  New Homework Assignment
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Create and share homework with a class.
                </p>
              </div>

              <button
                type="button"
                disabled={pending}
                onClick={closeDialog}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={submit}
              className="flex flex-col gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {/* CLASS */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="hw-class"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Class &amp; Section *
                  </label>

                  <select
                    id="hw-class"
                    required
                    value={form.classId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        classId: event.target.value,
                        subjectId: '',
                        teacherId: '',
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Select class</option>

                    {initialData.classes.map((item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SUBJECT */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="hw-subject"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Subject *
                  </label>

                  <select
                    id="hw-subject"
                    required
                    value={form.subjectId}
                    disabled={
                      !form.classId ||
                      subjects.length === 0
                    }
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        subjectId: event.target.value,
                        teacherId: '',
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">
                      {!form.classId
                        ? 'Select class first'
                        : subjects.length === 0
                        ? 'No subjects assigned'
                        : 'Select subject'}
                    </option>

                    {subjects.map((subject) => (
                      <option
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ASSIGNMENT DIAGNOSTICS */}
                {form.classId && subjects.length === 0 && (
                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 sm:col-span-2">
                    <AlertCircle className="size-4 shrink-0" />

                    <div>
                      <p className="font-semibold">
                        No subjects assigned to this class.
                      </p>

                      <p className="mt-1">
                        Open Subject &amp; Class Assignment,
                        select this class, and assign a subject
                        with a teacher.
                      </p>
                    </div>
                  </div>
                )}

                {/* TITLE */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label
                    htmlFor="hw-title"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Assignment Title *
                  </label>

                  <input
                    id="hw-title"
                    required
                    maxLength={200}
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="e.g. Physics Chapter 1 Questions"
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label
                    htmlFor="hw-description"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Instructions
                  </label>

                  <textarea
                    id="hw-description"
                    rows={4}
                    maxLength={10000}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B35]"
                    placeholder="Enter homework instructions..."
                  />
                </div>

                {/* DUE DATE */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="hw-due"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Due Date *
                  </label>

                  <input
                    id="hw-due"
                    type="date"
                    required
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        dueDate: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                {/* TEACHER */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="hw-teacher"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Assigned Teacher *
                  </label>

                  <select
                    id="hw-teacher"
                    required
                    value={teacher?.id || ''}
                    disabled
                    className={inputClass}
                  >
                    <option value="">
                      {!form.subjectId
                        ? 'Select subject first'
                        : 'No teacher assigned'}
                    </option>

                    {teacher && (
                      <option value={teacher.id}>
                        {teacher.name}
                      </option>
                    )}
                  </select>
                </div>

                {/* TEACHER WARNING */}
                {form.subjectId && !teacher && (
                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 sm:col-span-2">
                    <AlertCircle className="size-4 shrink-0" />

                    <p>
                      This subject does not have an assigned
                      teacher. Assign one in Subject &amp;
                      Class Assignment before creating homework.
                    </p>
                  </div>
                )}

                {/* TEACHER CONFIRMATION */}
                {form.subjectId && teacher && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 sm:col-span-2">
                    <CheckCircle2 className="size-4" />
                    {teacher.name} is assigned to teach this
                    subject in the selected class.
                  </div>
                )}

                {/* STATUS */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="hw-status"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Status
                  </label>

                  <select
                    id="hw-status"
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status:
                          event.target.value as AssignmentStatus,
                      }))
                    }
                    className={inputClass}
                  >
                    {[
                      AssignmentStatus.ACTIVE,
                      AssignmentStatus.DRAFT,
                      AssignmentStatus.COMPLETED,
                    ].map((status) => (
                      <option
                        key={status}
                        value={status}
                      >
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={closeDialog}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    pending ||
                    !form.classId ||
                    !form.subjectId ||
                    !teacher ||
                    !form.title.trim() ||
                    !form.dueDate
                  }
                  className="rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending
                    ? 'Creating...'
                    : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
