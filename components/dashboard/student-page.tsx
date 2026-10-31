'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Eye, Pencil, Search, Trash2, UserRoundPlus, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { addStudentAction, updateStudentAction, deleteStudentAction } from '@/app/actions/admin'

type Student = {
  id: string
  initials: string
  name: string
  email: string
  cls: string
  classId: string
  roll: string
  dob: string
  parentName: string
  parentPhone: string
  parentEmail: string
  address: string
  attendanceValue: number
  feeStatus: string
}

type ClassItem = { id: string; name: string; section: string }

export default function StudentsPage({ students, dbClasses }: { students: Student[]; dbClasses: ClassItem[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [classOpen, setClassOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filterClasses = ['All Classes', ...dbClasses.map((c) => `Class ${c.name}-${c.section}`)]
  const statuses = ['All Status', 'Paid', 'Pending']

  const handleAddSubmit = async (formData: FormData) => {
    const res = await addStudentAction(formData)
    if (res.success) {
      setDialogOpen(false)
    } else {
      alert(res.error)
    }
  }

  const handleEditSubmit = async (formData: FormData) => {
    if (!editingStudent) return
    const res = await updateStudentAction(editingStudent.id, formData)
    if (res.success) {
      setEditingStudent(null)
    } else {
      alert(res.error)
    }
  }

  const handleDelete = async (studentId: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setDeletingId(studentId)
      const res = await deleteStudentAction(studentId)
      setDeletingId(null)
      if (!res.success) {
        alert(res.error)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="mt-1 text-sm text-slate-500">{students.length} total students enrolled.</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <UserRoundPlus className="size-4" />
          Add Student
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#FF6B35]"
            placeholder="Search by name or roll number..."
          />
        </div>
        <div className="relative w-[180px]">
          <button
            onClick={() => setClassOpen(!classOpen)}
            className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"
          >
            All Classes <ChevronDown className="size-4" />
          </button>
          {classOpen && (
            <div className="absolute z-10 mt-2 w-full rounded-xl border bg-white p-1 shadow-xl">
              {filterClasses.map((item) => (
                <button
                  key={item}
                  onClick={() => setClassOpen(false)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-indigo-50"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative w-[160px]">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600"
          >
            All Status <ChevronDown className="size-4" />
          </button>
          {statusOpen && (
            <div className="absolute z-10 mt-2 w-full rounded-xl border bg-white p-1 shadow-xl">
              {statuses.map((item) => (
                <button
                  key={item}
                  onClick={() => setStatusOpen(false)}
                  className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-indigo-50"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs text-slate-500">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Roll No.</th>
                <th className="px-5 py-3">Attendance</th>
                <th className="px-5 py-3">Fee Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b transition-colors hover:bg-slate-50/80 last:border-0">
                  <td className="px-5 py-4">
                    <Link href={`/admin/students/${student.id}`} className="group flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 transition-colors group-hover:bg-[#FF6B35] group-hover:text-white">
                        {student.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 transition-colors group-hover:text-[#FF6B35]">
                          {student.name}
                        </div>
                        <div className="text-xs text-slate-400">{student.email}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4">{student.cls}</td>
                  <td className="px-5 py-4">{student.roll}</td>
                  <td className="px-5 py-4">{student.attendanceValue}%</td>
                  <td className="px-5 py-4">
                    <Badge variant="secondary">{student.feeStatus}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/students/${student.id}`}
                        title="View Details"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Eye className="size-4" />
                      </Link>
                      <button
                        onClick={() => setEditingStudent(student)}
                        title="Edit Student"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-orange-50 hover:text-[#FF6B35]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        disabled={deletingId === student.id}
                        title="Delete Student"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No students found. Add one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ADD STUDENT MODAL */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4">
          <div role="dialog" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add Student</h2>
                <p className="mt-1 text-xs text-slate-500">Create a new student profile and parent account.</p>
              </div>
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <form action={handleAddSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    name="fullName"
                    required
                    placeholder="Enter full name"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Class</label>
                  <select name="classId" required className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    {dbClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}-{c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Roll Number</label>
                  <input
                    name="rollNumber"
                    required
                    placeholder="e.g. 12"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                  <input name="dob" type="date" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Parent Name</label>
                  <input
                    name="parentName"
                    placeholder="Enter parent name"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Parent Phone</label>
                  <input
                    name="parentPhone"
                    type="tel"
                    placeholder="Enter phone number"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Parent Email</label>
                  <input
                    name="parentEmail"
                    required
                    type="email"
                    placeholder="parent@example.com"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Address</label>
                  <textarea
                    name="address"
                    rows={3}
                    placeholder="Enter home address"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="h-10 rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-[#FF6B35] px-5 text-sm font-semibold text-white hover:bg-[#e85a27]"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4">
          <div role="dialog" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Student</h2>
                <p className="mt-1 text-xs text-slate-500">Update profile details for {editingStudent.name}.</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <form action={handleEditSubmit} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    name="fullName"
                    defaultValue={editingStudent.name}
                    required
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Class</label>
                  <select name="classId" defaultValue={editingStudent.classId} required className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    {dbClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}-{c.section}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Roll Number</label>
                  <input
                    name="rollNumber"
                    defaultValue={editingStudent.roll}
                    required
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Date of Birth</label>
                  <input name="dob" type="date" defaultValue={editingStudent.dob} className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Parent Name</label>
                  <input
                    name="parentName"
                    defaultValue={editingStudent.parentName}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Parent Phone</label>
                  <input
                    name="parentPhone"
                    type="tel"
                    defaultValue={editingStudent.parentPhone}
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Parent Email</label>
                  <input
                    name="parentEmail"
                    defaultValue={editingStudent.parentEmail}
                    required
                    type="email"
                    className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">Address</label>
                  <textarea
                    name="address"
                    defaultValue={editingStudent.address}
                    rows={3}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="h-10 rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-[#FF6B35] px-5 text-sm font-semibold text-white hover:bg-[#e85a27]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}