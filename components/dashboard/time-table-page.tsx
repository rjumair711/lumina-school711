
'use client'

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  Plus,
  Settings2,
  Trash2,
  X,
  Pencil,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

import {
  getTimetableData,
  saveSchoolPeriod,
  deleteSchoolPeriod,
  saveTimetableLesson,
  deleteTimetableLesson,
} from '@/app/actions/timetable'

type Data = Awaited<ReturnType<typeof getTimetableData>>

type Period = Data['periods'][number]
type Slot = Data['slots'][number]
type Assignment = Data['assignments'][number]

const DAYS = [
  'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
]

const colors = [
  'border-sky-200 bg-sky-50 text-sky-700',
  'border-violet-200 bg-violet-50 text-violet-700',
  'border-emerald-200 bg-emerald-50 text-emerald-700',
  'border-orange-200 bg-orange-50 text-orange-700',
  'border-pink-200 bg-pink-50 text-pink-700',
  'border-teal-200 bg-teal-50 text-teal-700',
]

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#FF6B35]'

const primaryButton =
  'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white hover:bg-[#e95b29] disabled:cursor-not-allowed disabled:opacity-50'

type LessonForm = {
  classId: string
  day: string
  period: string
  subjectId: string
  teacherId: string
}

type PeriodForm = {
  name: string
  startTime: string
  endTime: string
  sortOrder: number
  isBreak: boolean
}

const emptyPeriod: PeriodForm = {
  name: '',
  startTime: '08:00',
  endTime: '08:45',
  sortOrder: 1,
  isBreak: false,
}

export default function TimetablePage({
  initialData,
}: {
  initialData: Data
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [view, setView] =
    useState<'class' | 'teacher'>('class')

  const [classId, setClassId] = useState(
    initialData.classes[0]?.id ?? ''
  )
  const [teacherId, setTeacherId] = useState('')

  const [lessonOpen, setLessonOpen] = useState(false)
  const [editingLesson, setEditingLesson] =
    useState<string | null>(null)

  const [periodsOpen, setPeriodsOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] =
    useState<string | null>(null)

  const [periodForm, setPeriodForm] =
    useState<PeriodForm>(emptyPeriod)

  const [lessonForm, setLessonForm] =
    useState<LessonForm>({
      classId: '',
      day: 'Monday',
      period: '',
      subjectId: '',
      teacherId: '',
    })

  // Refresh when data changes elsewhere.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        !lessonOpen &&
        !periodsOpen &&
        !pending
      ) {
        router.refresh()
      }
    }, 20000)

    return () => window.clearInterval(interval)
  }, [router, lessonOpen, periodsOpen, pending])

  const teachers = useMemo(() => {
    const map = new Map<string, string>()

    initialData.assignments.forEach((a) => {
      if (a.teacherId) {
        map.set(a.teacherId, a.teacherName)
      }
    })

    return Array.from(map, ([id, name]) => ({
      id,
      name,
    })).sort((a, b) => a.name.localeCompare(b.name))
  }, [initialData.assignments])

  const effectiveClassId =
    initialData.classes.some((c) => c.id === classId)
      ? classId
      : initialData.classes[0]?.id ?? ''

  const effectiveTeacherId =
    teachers.some((t) => t.id === teacherId)
      ? teacherId
      : teachers[0]?.id ?? ''

  const selectedClass = initialData.classes.find(
    (c) => c.id === effectiveClassId
  )

  const visibleSlots = useMemo(() => {
    return initialData.slots.filter((slot) =>
      view === 'class'
        ? slot.classId === effectiveClassId
        : slot.teacherId === effectiveTeacherId
    )
  }, [
    initialData.slots,
    view,
    effectiveClassId,
    effectiveTeacherId,
  ])

  const allPeriods = useMemo(() => {
    const configured = [...initialData.periods]

    // Display pre-existing lessons whose period has
    // not yet been configured in SchoolPeriod.
    const existingNames = new Set(
      configured.map((p) => p.name)
    )

    for (const slot of visibleSlots) {
      if (existingNames.has(slot.period)) continue

      configured.push({
        id: `legacy-${slot.period}`,
        name: slot.period,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sortOrder: 100,
        isBreak: slot.isBreak,
      })

      existingNames.add(slot.period)
    }

    return configured.sort(
      (a, b) =>
        a.startTime.localeCompare(b.startTime) ||
        a.sortOrder - b.sortOrder
    )
  }, [initialData.periods, visibleSlots])

  const classAssignments = useMemo(
    () =>
      initialData.assignments.filter(
        (a) => a.classId === lessonForm.classId
      ),
    [initialData.assignments, lessonForm.classId]
  )

  const chosenAssignment = classAssignments.find(
    (a) => a.subjectId === lessonForm.subjectId
  )

  const currentSlot = (
    day: string,
    period: Period
  ): Slot | undefined => {
    return visibleSlots.find(
      (s) =>
        s.day === day &&
        (
          s.period === period.name ||
          (
            s.startTime === period.startTime &&
            s.endTime === period.endTime
          )
        )
    )
  }

  function subjectStyle(subjectId: string | null) {
    if (!subjectId) return colors[0]

    const ids = [
      ...new Set(
        initialData.assignments.map((a) => a.subjectId)
      ),
    ].sort()

    return colors[
      Math.max(0, ids.indexOf(subjectId)) % colors.length
    ]
  }

  function openLesson(
    day: string,
    period: Period,
    slot?: Slot
  ) {
    if (view !== 'class') return

    if (period.isBreak) return

    if (period.id.startsWith('legacy-')) {
      toast.error(
        'Configure this period in Manage Periods first.'
      )
      return
    }

    setEditingLesson(slot?.id ?? null)

    const assigned = slot
      ? initialData.assignments.find(
        (a) =>
          a.classId === slot.classId &&
          a.subjectId === slot.subjectId
      )
      : undefined

    setLessonForm({
      classId: effectiveClassId,
      day,
      period: period.name,
      subjectId: assigned?.subjectId ?? '',
      teacherId: assigned?.teacherId ?? '',
    })

    setLessonOpen(true)
  }

  function saveLesson(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const assigned = classAssignments.find(
      (a) => a.subjectId === lessonForm.subjectId
    )

    if (!assigned?.teacherId) {
      toast.error(
        'Assign a teacher to this subject first.'
      )
      return
    }

    startTransition(async () => {
      const result = await saveTimetableLesson(
        {
          ...lessonForm,
          teacherId: assigned.teacherId!,
        },
        editingLesson ?? undefined
      )

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Timetable saved successfully')
      setLessonOpen(false)
      setEditingLesson(null)
      router.refresh()
    })
  }

  function removeLesson() {
    if (!editingLesson) return

    if (!window.confirm('Delete this scheduled lesson?')) {
      return
    }

    startTransition(async () => {
      const result =
        await deleteTimetableLesson(editingLesson)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Lesson removed')
      setLessonOpen(false)
      setEditingLesson(null)
      router.refresh()
    })
  }

  function openNewPeriod() {
    setEditingPeriod(null)
    setPeriodForm({
      ...emptyPeriod,
      sortOrder: initialData.periods.length + 1,
    })
  }

  function editPeriod(period: Period) {
    setEditingPeriod(period.id)
    setPeriodForm({
      name: period.name,
      startTime: period.startTime,
      endTime: period.endTime,
      sortOrder: period.sortOrder,
      isBreak: period.isBreak,
    })
  }

  function submitPeriod(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    startTransition(async () => {
      const result = await saveSchoolPeriod(
        periodForm,
        editingPeriod ?? undefined
      )

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('School period saved')
      setEditingPeriod(null)
      setPeriodForm(emptyPeriod)
      router.refresh()
    })
  }

  function removePeriod(id: string) {
    if (!window.confirm('Delete this period?')) return

    startTransition(async () => {
      const result = await deleteSchoolPeriod(id)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Period removed')
      setEditingPeriod(null)
      router.refresh()
    })
  }

  const totalLessons = visibleSlots.filter(
    (s) => !s.isBreak
  ).length

  const uniqueSubjects = new Set(
    visibleSlots
      .filter((s) => s.subjectId)
      .map((s) => s.subjectId)
  ).size

  const uniqueTeachers = new Set(
    visibleSlots
      .filter((s) => s.teacherId)
      .map((s) => s.teacherId)
  ).size

  const workingPeriods = allPeriods.filter(
    (p) => !p.isBreak
  )

  return (
    <div className="flex flex-col gap-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Weekly Timetable
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage class schedules, teachers and school periods.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPeriodsOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:border-[#FF6B35] hover:text-[#FF6B35]"
        >
          <Settings2 className="size-4" />
          Manage Periods
        </button>
      </div>

      {/* VIEW CONTROLS */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setView('class')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              view === 'class'
                ? 'bg-white text-[#FF6B35] shadow-sm'
                : 'text-slate-500'
            )}
          >
            Class View
          </button>

          <button
            type="button"
            onClick={() => setView('teacher')}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold',
              view === 'teacher'
                ? 'bg-white text-[#FF6B35] shadow-sm'
                : 'text-slate-500'
            )}
          >
            Teacher View
          </button>
        </div>

        {view === 'class' ? (
          <select
            aria-label="Select class"
            value={effectiveClassId}
            onChange={(e) => setClassId(e.target.value)}
            className={cn(inputClass, 'max-w-64')}
          >
            {initialData.classes.length === 0 && (
              <option value="">No classes found</option>
            )}

            {initialData.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        ) : (
          <select
            aria-label="Select teacher"
            value={effectiveTeacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className={cn(inputClass, 'max-w-64')}
          >
            {teachers.length === 0 && (
              <option value="">No assigned teachers</option>
            )}

            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: 'Weekly Lessons',
            value: totalLessons,
            icon: CalendarDays,
          },
          {
            label: 'Subjects',
            value: uniqueSubjects,
            icon: BookOpen,
          },
          {
            label: 'Teachers',
            value: uniqueTeachers,
            icon: GraduationCap,
          },
          {
            label: 'Lesson Periods',
            value: workingPeriods.length,
            icon: Clock3,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-[#FF6B35]">
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900">
                  {value}
                </p>
                <p className="text-[11px] text-slate-500">
                  {label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* EMPTY CONFIGURATION */}
      {allPeriods.length === 0 ? (
        <Card className="border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Clock3 className="size-8 text-[#FF6B35]" />
            <h2 className="text-base font-bold text-slate-900">
              Configure your school periods
            </h2>
            <p className="max-w-sm text-sm text-slate-500">
              Create lesson periods and breaks before building
              your weekly timetable.
            </p>
            <button
              type="button"
              onClick={() => setPeriodsOpen(true)}
              className={primaryButton}
            >
              <Plus className="size-4" />
              Configure Periods
            </button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="overflow-x-auto p-0">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[150px_repeat(6,minmax(140px,1fr))] border-b bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <div className="flex items-center gap-2 px-4 py-4">
                  <CalendarDays className="size-4" />
                  Time
                </div>

                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="px-3 py-4 text-center"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {allPeriods.map((period) => (
                <div
                  key={period.id}
                  className="grid grid-cols-[150px_repeat(6,minmax(140px,1fr))] border-b last:border-0"
                >
                  <div className="flex flex-col justify-center px-4 py-4">
                    <span className="text-xs font-bold text-slate-700">
                      {period.name}
                    </span>
                    <span className="mt-1 text-[10px] text-slate-400">
                      {period.startTime}–{period.endTime}
                    </span>
                  </div>

                  {period.isBreak ? (
                    <div className="col-span-6 flex items-center justify-center bg-slate-50 text-xs font-semibold text-slate-400">
                      {period.name}
                    </div>
                  ) : (
                    DAYS.map((day) => {
                      const slot = currentSlot(day, period)

                      return (
                        <button
                          key={`${period.id}-${day}`}
                          type="button"
                          disabled={view === 'teacher'}
                          onClick={() =>
                            openLesson(day, period, slot)
                          }
                          className={cn(
                            'm-1.5 min-h-20 rounded-xl border p-3 text-left transition sm:m-2',
                            slot
                              ? 'border-slate-200 bg-white hover:border-orange-200 hover:shadow-sm'
                              : 'border-dashed border-slate-200 bg-slate-50/60 hover:border-[#FF6B35]',
                            view === 'teacher' &&
                            'cursor-default'
                          )}
                        >
                          {slot ? (
                            <>
                              <span
                                className={cn(
                                  'inline-block rounded-md border px-2 py-1 text-[11px] font-bold',
                                  subjectStyle(slot.subjectId)
                                )}
                              >
                                {slot.subjectName || 'Lesson'}
                              </span>

                              <p className="mt-2 text-[11px] text-slate-500">
                                {view === 'teacher'
                                  ? slot.className
                                  : slot.teacherName ||
                                  'No teacher'}
                              </p>
                            </>
                          ) : view === 'class' ? (
                            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
                              <Plus className="size-4" />
                              <span className="text-[11px]">
                                Add Lesson
                              </span>
                            </div>
                          ) : null}
                        </button>
                      )
                    })
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* LESSON EDITOR */}
      {lessonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-title"
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2
                  id="lesson-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingLesson ? 'Edit Lesson' : 'Add Lesson'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedClass?.displayName} · {lessonForm.day} ·{' '}
                  {lessonForm.period}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                disabled={pending}
                onClick={() => setLessonOpen(false)}
              >
                <X className="size-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={saveLesson} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="lesson-subject"
                  className="text-xs font-semibold text-slate-700"
                >
                  Subject *
                </label>

                <select
                  id="lesson-subject"
                  required
                  value={lessonForm.subjectId}
                  onChange={(e) => {
                    const assignment =
                      classAssignments.find(
                        (a) =>
                          a.subjectId === e.target.value
                      )

                    setLessonForm((current) => ({
                      ...current,
                      subjectId: e.target.value,
                      teacherId:
                        assignment?.teacherId ?? '',
                    }))
                  }}
                  className={inputClass}
                >
                  <option value="">Select subject</option>

                  {classAssignments.map((a) => (
                    <option
                      key={a.id}
                      value={a.subjectId}
                    >
                      {a.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="lesson-teacher"
                  className="text-xs font-semibold text-slate-700"
                >
                  Assigned Teacher
                </label>

                <input
                  id="lesson-teacher"
                  readOnly
                  value={
                    chosenAssignment?.teacherName ??
                    'Select subject first'
                  }
                  className={cn(
                    inputClass,
                    'bg-slate-50'
                  )}
                />
              </div>

              {lessonForm.subjectId &&
                !chosenAssignment?.teacherId && (
                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertCircle className="size-4 shrink-0" />
                    Assign a teacher in Subject &amp; Class
                    Assignment before scheduling this lesson.
                  </div>
                )}

              {classAssignments.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  This class has no subject assignments.
                  Configure them in Subject &amp; Class first.
                </div>
              )}

              <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4">
                {editingLesson ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={removeLesson}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setLessonOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      pending ||
                      !lessonForm.subjectId ||
                      !chosenAssignment?.teacherId
                    }
                    className={primaryButton}
                  >
                    {pending
                      ? 'Saving...'
                      : 'Save Lesson'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERIOD MANAGER */}
      {periodsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="periods-title"
            className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2
                  id="periods-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Manage School Periods
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Timings apply to all classes in this school.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close period manager"
                disabled={pending}
                onClick={() => setPeriodsOpen(false)}
              >
                <X className="size-5 text-slate-400" />
              </button>
            </div>

            <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
              <div className="space-y-2">
                {initialData.periods.map((period) => (
                  <div
                    key={period.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {period.name}
                        {period.isBreak && (
                          <span className="ml-2 text-xs text-amber-600">
                            Break
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {period.startTime}–{period.endTime}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={pending}
                        title="Edit period"
                        onClick={() => editPeriod(period)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-orange-50 hover:text-[#FF6B35]"
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        type="button"
                        disabled={pending}
                        title="Delete period"
                        onClick={() => removePeriod(period.id)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  {editingPeriod ? 'Edit Period' : 'Add Period'}
                </h3>

                <form
                  onSubmit={submitPeriod}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <label className="space-y-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                    Period Name
                    <input
                      required
                      maxLength={60}
                      value={periodForm.name}
                      onChange={(e) =>
                        setPeriodForm((current) => ({
                          ...current,
                          name: e.target.value,
                        }))
                      }
                      placeholder="e.g. Period 1"
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                    Start Time
                    <input
                      type="time"
                      required
                      value={periodForm.startTime}
                      onChange={(e) =>
                        setPeriodForm((current) => ({
                          ...current,
                          startTime: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                    End Time
                    <input
                      type="time"
                      required
                      value={periodForm.endTime}
                      onChange={(e) =>
                        setPeriodForm((current) => ({
                          ...current,
                          endTime: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-slate-700">
                    Display Order
                    <input
                      type="number"
                      min={0}
                      max={100}
                      required
                      value={periodForm.sortOrder}
                      onChange={(e) =>
                        setPeriodForm((current) => ({
                          ...current,
                          sortOrder: Number(e.target.value),
                        }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={periodForm.isBreak}
                      onChange={(e) =>
                        setPeriodForm((current) => ({
                          ...current,
                          isBreak: e.target.checked,
                        }))
                      }
                      className="size-4 accent-[#FF6B35]"
                    />
                    This period is a break
                  </label>

                  <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                    {editingPeriod && (
                      <button
                        type="button"
                        onClick={openNewPeriod}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
                      >
                        Cancel Edit
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={pending}
                      className={primaryButton}
                    >
                      <Plus className="size-4" />
                      {pending
                        ? 'Saving...'
                        : editingPeriod
                          ? 'Update Period'
                          : 'Add Period'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
