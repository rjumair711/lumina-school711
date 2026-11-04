
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
  Pencil,
  Receipt,
  Trash2,
  Users,
  Plus,
  Search,
  X,
  Check,
  GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getSubjectClassData,
  saveSubject,
  deleteSubject,
  saveClassAssignments,
  removeClassAssignment,
} from '@/app/actions/subject-class'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

type Data = Awaited<
  ReturnType<typeof getSubjectClassData>
>

type Tab = 'Subjects' | 'Assign Subjects' | 'Summary'

type SubjectForm = {
  name: string
  code: string
  description: string
}

const emptyForm: SubjectForm = {
  name: '',
  code: '',
  description: '',
}

const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e95b29] disabled:cursor-not-allowed disabled:opacity-50'

const inputStyle =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#FF6B35]'

export default function SubjectClassPage({
  initialData,
}: {
  initialData: Data
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [tab, setTab] = useState<Tab>('Subjects')
  const [query, setQuery] = useState('')
  const [selectedClassId, setSelectedClassId] =
    useState(initialData.classes[0]?.id ?? '')

  const [selectedSubjects, setSelectedSubjects] =
    useState<string[]>([])

  const [teacherMap, setTeacherMap] =
    useState<Record<string, string>>({})

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(
    null
  )
  const [subjectForm, setSubjectForm] =
    useState<SubjectForm>(emptyForm)

  // Refresh the server data when other admins make changes.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        !pending &&
        !dialogOpen
      ) {
        router.refresh()
      }
    }, 20000)

    return () => window.clearInterval(timer)
  }, [router, pending, dialogOpen])

  const selectedClass = initialData.classes.find(
    (c) => c.id === selectedClassId
  )

  const assigned = useMemo(
    () =>
      initialData.assignments.filter(
        (a) => a.classId === selectedClassId
      ),
    [initialData.assignments, selectedClassId]
  )

  const assignedIds = useMemo(
    () => new Set(assigned.map((a) => a.subjectId)),
    [assigned]
  )

  useEffect(() => {
    setSelectedSubjects([])
    setTeacherMap({})
  }, [selectedClassId])

  const visibleSubjects = useMemo(() => {
    const search = query.trim().toLowerCase()

    return initialData.subjects.filter((s) =>
      [s.name, s.code, s.description]
        .join(' ')
        .toLowerCase()
        .includes(search)
    )
  }, [initialData.subjects, query])

  const teacherName = (id: string | null) =>
    initialData.teachers.find((t) => t.id === id)?.name ??
    'Not assigned'

  const subjectName = (id: string) =>
    initialData.subjects.find((s) => s.id === id)?.name ??
    'Unknown Subject'

  const getAssignment = (subjectId: string) =>
    assigned.find((a) => a.subjectId === subjectId)

  function openAdd() {
    setEditingId(null)
    setSubjectForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(id: string) {
    const subject = initialData.subjects.find(
      (s) => s.id === id
    )

    if (!subject) return

    setEditingId(id)
    setSubjectForm({
      name: subject.name,
      code: subject.code,
      description: subject.description,
    })
    setDialogOpen(true)
  }

  function submitSubject(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    startTransition(async () => {
      const result = await saveSubject(
        subjectForm,
        editingId ?? undefined
      )

      if (!result.success) {
        toast.error(result.error || 'Unable to save subject')
        return
      }

      toast.success(
        editingId ? 'Subject updated' : 'Subject created'
      )
      setDialogOpen(false)
      setEditingId(null)
      setSubjectForm(emptyForm)
      router.refresh()
    })
  }

  function removeSubject(id: string, name: string) {
    if (
      !window.confirm(
        `Delete "${name}"? This action cannot be undone.`
      )
    ) {
      return
    }

    startTransition(async () => {
      const result = await deleteSubject(id)

      if (!result.success) {
        toast.error(result.error || 'Unable to delete subject')
        return
      }

      toast.success('Subject deleted')
      router.refresh()
    })
  }

  function toggleSubject(id: string) {
    if (assignedIds.has(id)) return

    setSelectedSubjects((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  function assignSubjects() {
    if (!selectedClassId || selectedSubjects.length === 0) {
      toast.error('Select a class and at least one subject.')
      return
    }

    const items = selectedSubjects.map((subjectId) => ({
      subjectId,
      teacherId: teacherMap[subjectId] || null,
    }))

    startTransition(async () => {
      const result = await saveClassAssignments(
        selectedClassId,
        items
      )

      if (!result.success) {
        toast.error(result.error || 'Assignment failed')
        return
      }

      toast.success('Subjects assigned successfully')
      setSelectedSubjects([])
      setTeacherMap({})
      router.refresh()
    })
  }

  function switchTeacher(
    subjectId: string,
    teacherId: string
  ) {
    if (!selectedClassId) return

    startTransition(async () => {
      const result = await saveClassAssignments(
        selectedClassId,
        [{ subjectId, teacherId: teacherId || null }]
      )

      if (!result.success) {
        toast.error(result.error || 'Unable to change teacher')
        return
      }

      toast.success('Teacher assignment updated')
      router.refresh()
    })
  }

  function removeAssignment(
    id: string,
    name: string
  ) {
    if (
      !window.confirm(
        `Remove ${name} from this class?`
      )
    ) {
      return
    }

    startTransition(async () => {
      const result = await removeClassAssignment(id)

      if (!result.success) {
        toast.error(result.error || 'Unable to remove assignment')
        return
      }

      toast.success('Assignment removed')
      router.refresh()
    })
  }

  const tabs = [
    { name: 'Subjects' as Tab, icon: BookOpen },
    { name: 'Assign Subjects' as Tab, icon: Users },
    { name: 'Summary' as Tab, icon: Receipt },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Subject &amp; Class Assignment
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage school subjects, class sections and teacher assignments.
        </p>
      </div>

      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">
        {tabs.map(({ name, icon: Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-2 py-3 text-xs font-semibold transition-all sm:px-3 sm:text-sm',
              tab === name
                ? 'bg-white text-[#FF6B35] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{name}</span>
          </button>
        ))}
      </div>

      {/* SUBJECTS TAB */}
      {tab === 'Subjects' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-3 px-5 pb-4 pt-5">
            <div>
              <CardTitle className="text-base">
                Subjects
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                {initialData.subjects.length} subjects
              </p>
            </div>

            <button
              type="button"
              onClick={openAdd}
              className={buttonPrimary}
            >
              <Plus className="size-4" />
              Add Subject
            </button>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search subjects"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subjects..."
                className={cn(inputStyle, 'pl-10')}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-3">Subject</th>
                    <th className="px-3 py-3">Code</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Classes</th>
                    <th className="px-3 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleSubjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-4 font-semibold text-slate-800">
                        {subject.name}
                      </td>
                      <td className="px-3 py-4 text-xs font-bold text-[#d95324]">
                        {subject.code}
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-500">
                        {subject.description || '—'}
                      </td>
                      <td className="px-3 py-4 text-xs">
                        {subject.classCount}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            disabled={pending}
                            aria-label={`Edit ${subject.name}`}
                            onClick={() => openEdit(subject.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-orange-50 hover:text-[#FF6B35]"
                          >
                            <Pencil className="size-4" />
                          </button>

                          <button
                            type="button"
                            disabled={pending}
                            aria-label={`Delete ${subject.name}`}
                            onClick={() =>
                              removeSubject(
                                subject.id,
                                subject.name
                              )
                            }
                            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {visibleSubjects.length === 0 && (
                <p className="py-10 text-center text-sm text-slate-500">
                  No subjects found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ASSIGN SUBJECTS TAB */}
      {tab === 'Assign Subjects' && (
        <div className="flex flex-col gap-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="px-5 pb-2 pt-5">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="size-4 text-[#FF6B35]" />
                Class &amp; Section Assignment
              </CardTitle>
              <p className="mt-1 text-xs text-slate-500">
                Choose a class section and assign subjects with their teachers.
              </p>
            </CardHeader>

            <CardContent className="space-y-5 px-5 pb-5">
              <div className="max-w-sm space-y-2">
                <label
                  htmlFor="assignment-class"
                  className="text-xs font-semibold text-slate-700"
                >
                  Select Class &amp; Section
                </label>
                <select
                  id="assignment-class"
                  value={selectedClassId}
                  onChange={(e) =>
                    setSelectedClassId(e.target.value)
                  }
                  className={inputStyle}
                >
                  <option value="">Select class</option>
                  {initialData.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Select Subjects
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Already assigned subjects are managed below.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {initialData.subjects.map((subject) => {
                      const isAssigned = assignedIds.has(
                        subject.id
                      )
                      const isSelected =
                        selectedSubjects.includes(subject.id)

                      return (
                        <div
                          key={subject.id}
                          className={cn(
                            'rounded-xl border p-4 transition-colors',
                            isAssigned
                              ? 'border-slate-200 bg-slate-50'
                              : isSelected
                              ? 'border-[#FF6B35] bg-orange-50'
                              : 'border-slate-200 bg-white'
                          )}
                        >
                          <button
                            type="button"
                            disabled={isAssigned || pending}
                            onClick={() =>
                              toggleSubject(subject.id)
                            }
                            className="flex w-full items-center gap-3 text-left disabled:cursor-not-allowed"
                          >
                            <span
                              className={cn(
                                'flex size-5 shrink-0 items-center justify-center rounded-full border',
                                isSelected || isAssigned
                                  ? 'border-[#FF6B35] bg-[#FF6B35] text-white'
                                  : 'border-slate-300'
                              )}
                            >
                              {(isSelected || isAssigned) && (
                                <Check className="size-3" />
                              )}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-slate-800">
                                {subject.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {subject.code}
                              </span>
                            </span>

                            {isAssigned && (
                              <Badge className="bg-emerald-50 text-emerald-700">
                                Assigned
                              </Badge>
                            )}
                          </button>

                          {isSelected && !isAssigned && (
                            <div className="mt-3 border-t border-orange-100 pt-3">
                              <label
                                htmlFor={`teacher-new-${subject.id}`}
                                className="mb-1.5 block text-xs font-medium text-slate-600"
                              >
                                Teacher
                              </label>

                              <select
                                id={`teacher-new-${subject.id}`}
                                value={
                                  teacherMap[subject.id] ?? ''
                                }
                                onChange={(e) =>
                                  setTeacherMap((current) => ({
                                    ...current,
                                    [subject.id]: e.target.value,
                                  }))
                                }
                                className={inputStyle}
                              >
                                <option value="">
                                  Assign later
                                </option>
                                {initialData.teachers.map((t) => (
                                  <option
                                    key={t.id}
                                    value={t.id}
                                  >
                                    {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {initialData.subjects.length === 0 && (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
                      Create subjects in the Subjects tab first.
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      pending || selectedSubjects.length === 0
                    }
                    onClick={assignSubjects}
                    className={buttonPrimary}
                  >
                    <Check className="size-4" />
                    {pending
                      ? 'Saving...'
                      : `Assign ${selectedSubjects.length} Subjects`}
                  </button>
                </>
              )}
            </CardContent>
          </Card>

          {selectedClass && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="px-5 pb-3 pt-5">
                <CardTitle className="text-base">
                  Current Assignments
                </CardTitle>
                <p className="text-xs text-slate-500">
                  {selectedClass.displayName} · {assigned.length} subjects
                </p>
              </CardHeader>

              <CardContent className="px-5 pb-5">
                {assigned.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No subjects have been assigned yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {assigned.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800">
                            {subjectName(a.subjectId)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {teacherName(a.teacherId)}
                          </p>
                        </div>

                        <select
                          aria-label={`Teacher for ${subjectName(a.subjectId)}`}
                          value={a.teacherId ?? ''}
                          disabled={pending}
                          onChange={(e) =>
                            switchTeacher(
                              a.subjectId,
                              e.target.value
                            )
                          }
                          className={cn(inputStyle, 'sm:w-52')}
                        >
                          <option value="">No teacher</option>
                          {initialData.teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={pending}
                          title="Remove assignment"
                          aria-label={`Remove ${subjectName(a.subjectId)}`}
                          onClick={() =>
                            removeAssignment(
                              a.id,
                              subjectName(a.subjectId)
                            )
                          }
                          className="self-end rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:self-auto"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* SUMMARY TAB */}
      {tab === 'Summary' && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Total Subjects',
                value: initialData.subjects.length,
                icon: BookOpen,
              },
              {
                label: 'Total Classes',
                value: initialData.classes.length,
                icon: GraduationCap,
              },
              {
                label: 'Total Assignments',
                value: initialData.assignments.length,
                icon: Users,
              },
            ].map(({ label, value, icon: Icon }) => (
              <Card
                key={label}
                className="border-slate-200 shadow-sm"
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-orange-50 p-3 text-[#FF6B35]">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">
                      {label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle className="text-base">
                Class Subject Coverage
              </CardTitle>
              <p className="text-xs text-slate-500">
                Review subjects and teachers assigned to each class section.
              </p>
            </CardHeader>

            <CardContent className="grid gap-4 px-5 pb-5 lg:grid-cols-2">
              {initialData.classes.map((c) => {
                const rows =
                  initialData.assignments.filter(
                    (a) => a.classId === c.id
                  )

                const withTeacher = rows.filter(
                  (a) => a.teacherId
                ).length

                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">
                        Class {c.displayName}
                      </h3>

                      <Badge className="bg-orange-50 text-[#d95324]">
                        {rows.length} Subjects
                      </Badge>
                    </div>

                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                      <span>Teacher coverage</span>
                      <span>
                        {withTeacher}/{rows.length}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#FF6B35]"
                        style={{
                          width: `${
                            rows.length
                              ? (withTeacher / rows.length) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      {rows.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-semibold text-slate-700">
                            {subjectName(a.subjectId)}
                          </span>
                          <span
                            className={cn(
                              'text-right',
                              a.teacherId
                                ? 'text-slate-500'
                                : 'font-semibold text-amber-600'
                            )}
                          >
                            {teacherName(a.teacherId)}
                          </span>
                        </div>
                      ))}

                      {rows.length === 0 && (
                        <p className="text-xs text-slate-400">
                          No subjects assigned.
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}

              {initialData.classes.length === 0 && (
                <p className="text-sm text-slate-500">
                  Create a class before assigning subjects.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ADD / EDIT SUBJECT DIALOG */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subject-dialog-title"
            className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2
                  id="subject-dialog-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {editingId ? 'Edit Subject' : 'Add Subject'}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manage your school subject catalog.
                </p>
              </div>

              <button
                type="button"
                disabled={pending}
                aria-label="Close dialog"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <form
              onSubmit={submitSubject}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="subject-name"
                  className="text-xs font-semibold text-slate-700"
                >
                  Subject Name *
                </label>
                <input
                  id="subject-name"
                  required
                  maxLength={100}
                  value={subjectForm.name}
                  onChange={(e) =>
                    setSubjectForm((f) => ({
                      ...f,
                      name: e.target.value,
                    }))
                  }
                  className={inputStyle}
                  placeholder="e.g. Mathematics"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="subject-code"
                  className="text-xs font-semibold text-slate-700"
                >
                  Subject Code *
                </label>
                <input
                  id="subject-code"
                  required
                  maxLength={30}
                  value={subjectForm.code}
                  onChange={(e) =>
                    setSubjectForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  className={inputStyle}
                  placeholder="e.g. MATH"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="subject-description"
                  className="text-xs font-semibold text-slate-700"
                >
                  Description
                </label>
                <textarea
                  id="subject-description"
                  rows={4}
                  maxLength={1000}
                  value={subjectForm.description}
                  onChange={(e) =>
                    setSubjectForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  className={cn(
                    inputStyle,
                    'h-auto min-h-24 py-2'
                  )}
                  placeholder="Subject details..."
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className={buttonPrimary}
                >
                  {pending
                    ? 'Saving...'
                    : editingId
                    ? 'Update Subject'
                    : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
