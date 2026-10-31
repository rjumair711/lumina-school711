'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Search, Trash2, UserRoundPlus, Users, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { addTeacherAction, updateTeacherAction, deleteTeacherAction } from '@/app/actions/admin'

type Teacher = {
  id: string
  name: string
  email: string
  initials: string
  phone: string
  qualification: string
  experience: string
  subject: string
  subjectId: string
  classes: string[]
  classIds: string[]
  tone: string
}

type ClassItem = { id: string; name: string; section: string }
type SubjectItem = { id: string; name: string }

export default function TeachersPage({ 
  teachers, 
  dbClasses, 
  dbSubjects 
}: { 
  teachers: Teacher[]; 
  dbClasses: ClassItem[]; 
  dbSubjects: SubjectItem[] 
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAddSubmit = async (formData: FormData) => {
    const res = await addTeacherAction(formData)
    if (res.success) {
      setDialogOpen(false)
    } else {
      alert(res.error)
    }
  }

  const handleEditSubmit = async (formData: FormData) => {
    if (!editingTeacher) return
    const res = await updateTeacherAction(editingTeacher.id, formData)
    if (res.success) {
      setEditingTeacher(null)
    } else {
      alert(res.error)
    }
  }

  const handleDelete = async (teacherId: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      setDeletingId(teacherId)
      const res = await deleteTeacherAction(teacherId)
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Teachers</h1>
          <p className="mt-1 text-sm text-slate-500">{teachers.length} total teachers available.</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <UserRoundPlus className="size-4" />
          Add Teacher
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#FF6B35]"
            placeholder="Search by name or subject..."
          />
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs text-slate-500">
                <th className="px-5 py-3">Teacher</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Classes</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id} className="border-b transition-colors hover:bg-slate-50/80 last:border-0">
                  <td className="px-5 py-4">
                    <Link href={`/admin/teachers/${teacher.id}`} className="group flex cursor-pointer items-center gap-3">
                      <div className={`flex size-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${teacher.tone}`}>
                        {teacher.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 transition-colors group-hover:text-[#FF6B35]">
                          {teacher.name}
                        </div>
                        <div className="text-xs text-slate-400">{teacher.qualification} • {teacher.experience}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    <div>{teacher.email}</div>
                    <div className="text-slate-400">{teacher.phone}</div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                      {teacher.subject}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {teacher.classes.length > 0 ? teacher.classes.map(c => (
                        <span key={c} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                          {c}
                        </span>
                      )) : <span className="text-slate-400">None</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/teachers/${teacher.id}`}
                        title="View Details"
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Eye className="size-4" />
                      </Link>
                      <button
                        onClick={() => setEditingTeacher(teacher)}
                        title="Edit Teacher"
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-orange-50 hover:text-[#FF6B35]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.id, teacher.name)}
                        disabled={deletingId === teacher.id}
                        title="Delete Teacher"
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {teachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No teachers found. Add one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ADD MODAL */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4">
          <div role="dialog" className="my-8 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Add New Teacher</h2>
              <button onClick={() => setDialogOpen(false)} className="cursor-pointer rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="size-5" />
              </button>
            </div>
            <form action={handleAddSubmit} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Full Name <span className="text-rose-500">*</span></label>
                  <input name="fullName" required placeholder="Enter full name" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Subject <span className="text-rose-500">*</span></label>
                  <select name="subjectId" required className="h-11 rounded-xl border border-orange-400 bg-white px-3 text-sm outline-none text-slate-700">
                    <option value="">Select Subject</option>
                    {dbSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Email <span className="text-rose-500">*</span></label>
                  <input name="email" type="email" required placeholder="teacher@school.com" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Phone</label>
                  <input name="phone" placeholder="Phone number" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Qualification</label>
                  <input name="qualification" placeholder="e.g. BSc, MSc" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Experience</label>
                  <input name="experience" placeholder="e.g. 5 years" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>
              </div>

              {/* ASSIGN CLASSES */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                   <Users className="size-4 text-orange-500" /> Assign Classes
                </label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {dbClasses.map((cls) => (
                    <label key={cls.id} className="cursor-pointer group">
                      <input type="checkbox" name="classIds" value={cls.id} className="peer sr-only" />
                      <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 peer-checked:border-orange-400 peer-checked:bg-orange-50 peer-checked:text-orange-700">
                        {cls.name}-{cls.section}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex justify-center gap-3">
                <button type="button" onClick={() => setDialogOpen(false)} className="cursor-pointer h-11 min-w-[120px] rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="cursor-pointer h-11 min-w-[120px] rounded-xl bg-[#FF6B35] text-sm font-semibold text-white shadow-sm hover:bg-[#e85a27]">Add Teacher</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4">
          <div role="dialog" className="my-8 w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Edit Teacher</h2>
              <button onClick={() => setEditingTeacher(null)} className="cursor-pointer rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="size-5" />
              </button>
            </div>
            <form action={handleEditSubmit} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Full Name <span className="text-rose-500">*</span></label>
                  <input name="fullName" defaultValue={editingTeacher.name} required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Subject <span className="text-rose-500">*</span></label>
                  <select name="subjectId" defaultValue={editingTeacher.subjectId} required className="h-11 rounded-xl border border-orange-400 bg-white px-3 text-sm outline-none text-slate-700">
                    <option value="">Select Subject</option>
                    {dbSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input name="email" defaultValue={editingTeacher.email} disabled className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Phone</label>
                  <input name="phone" defaultValue={editingTeacher.phone} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Qualification</label>
                  <input name="qualification" defaultValue={editingTeacher.qualification} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">Experience</label>
                  <input name="experience" defaultValue={editingTeacher.experience} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                </div>
              </div>

              {/* ASSIGN CLASSES */}
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                   <Users className="size-4 text-orange-500" /> Assign Classes
                </label>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {dbClasses.map((cls) => (
                    <label key={cls.id} className="cursor-pointer group">
                      <input type="checkbox" name="classIds" value={cls.id} defaultChecked={editingTeacher.classIds.includes(cls.id)} className="peer sr-only" />
                      <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 peer-checked:border-orange-400 peer-checked:bg-orange-50 peer-checked:text-orange-700">
                        {cls.name}-{cls.section}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex justify-center gap-3">
                <button type="button" onClick={() => setEditingTeacher(null)} className="cursor-pointer h-11 min-w-[120px] rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="cursor-pointer h-11 min-w-[120px] rounded-xl bg-[#FF6B35] text-sm font-semibold text-white shadow-sm hover:bg-[#e85a27]">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
