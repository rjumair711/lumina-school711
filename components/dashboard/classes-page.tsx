'use client'

import { useState } from 'react'
import { Pencil, Search, Trash2, Users, Plus, X, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { addClassAction, updateClassAction, deleteClassAction } from '@/app/actions/admin'
import Link from 'next/link'

type ClassItem = {
    id: string
    name: string
    section: string
    capacity: number
    classTeacherId: string
    classTeacherName: string
    studentCount: number
}

type TeacherItem = {
    id: string
    name: string
}

export default function ClassesPage({
    classes,
    dbTeachers
}: {
    classes: ClassItem[];
    dbTeachers: TeacherItem[]
}) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleAddSubmit = async (formData: FormData) => {
        const res = await addClassAction(formData)
        if (res.success) {
            setDialogOpen(false)
        } else {
            alert(res.error)
        }
    }

    const handleEditSubmit = async (formData: FormData) => {
        if (!editingClass) return
        const res = await updateClassAction(editingClass.id, formData)
        if (res.success) {
            setEditingClass(null)
        } else {
            alert(res.error)
        }
    }

    const handleDelete = async (classId: string, name: string, section: string) => {
        if (confirm(`Are you sure you want to delete Class ${name}-${section}?`)) {
            setDeletingId(classId)
            const res = await deleteClassAction(classId)
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
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Classes</h1>
                    <p className="mt-1 text-sm text-slate-500">{classes.length} total classes configured.</p>
                </div>
                <button
                    onClick={() => setDialogOpen(true)}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                    <Plus className="size-4" />
                    Add Class
                </button>
            </div>

            <div className="flex flex-wrap items-start gap-3">
                <div className="relative min-w-[240px] flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#FF6B35]"
                        placeholder="Search by class name..."
                    />
                </div>
            </div>

            <Card>
                <CardContent className="overflow-x-auto p-0">
                    <table className="w-full min-w-[600px] text-left text-sm">
                        <thead>
                            <tr className="border-b bg-slate-50 text-xs text-slate-500">
                                <th className="px-5 py-3">Class</th>
                                <th className="px-5 py-3">Class Teacher</th>
                                <th className="px-5 py-3 text-center">Enrolled</th>
                                <th className="px-5 py-3 text-center">Capacity</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map((cls) => {
                                const isFull = cls.studentCount >= cls.capacity
                                return (
                                    <tr key={cls.id} className="border-b transition-colors hover:bg-slate-50/80 last:border-0">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex size-9 items-center justify-center rounded-lg bg-orange-50 text-sm font-bold text-[#FF6B35]">
                                                    {cls.name}
                                                </div>
                                                <div className="font-semibold text-slate-900">
                                                    Section {cls.section}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {cls.classTeacherName}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <Badge variant="secondary" className={isFull ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-700'}>
                                                {cls.studentCount}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-4 text-center text-slate-500">
                                            {cls.capacity}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/admin/classes/${cls.id}`}
                                                    title="View Details"
                                                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                >
                                                    <Eye className="size-4" />
                                                </Link>
                                                <button
                                                    onClick={() => setEditingClass(cls)}
                                                    title="Edit Class"
                                                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-orange-50 hover:text-[#FF6B35]"
                                                >
                                                    <Pencil className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cls.id, cls.name, cls.section)}
                                                    disabled={deletingId === cls.id}
                                                    title="Delete Class"
                                                    className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {classes.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No classes configured yet. Add one above!
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
                    <div role="dialog" className="my-8 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                            <h2 className="text-lg font-bold text-slate-900">Add New Class</h2>
                            <button onClick={() => setDialogOpen(false)} className="cursor-pointer rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <X className="size-5" />
                            </button>
                        </div>
                        <form action={handleAddSubmit} className="flex flex-col gap-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Class Name <span className="text-rose-500">*</span></label>
                                    <input name="name" required placeholder="e.g. 10" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Section <span className="text-rose-500">*</span></label>
                                    <input name="section" required placeholder="e.g. A" className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Student Capacity</label>
                                <input name="capacity" type="number" defaultValue={30} min={1} required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Users className="size-3.5 text-orange-500" /> Class Teacher (Optional)
                                </label>
                                <select name="classTeacherId" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400 text-slate-700">
                                    <option value="">None / Unassigned</option>
                                    {dbTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="mt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setDialogOpen(false)} className="cursor-pointer h-11 px-5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="cursor-pointer h-11 px-5 rounded-xl bg-[#FF6B35] text-sm font-semibold text-white shadow-sm hover:bg-[#e85a27]">Add Class</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editingClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4">
                    <div role="dialog" className="my-8 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                            <h2 className="text-lg font-bold text-slate-900">Edit Class</h2>
                            <button onClick={() => setEditingClass(null)} className="cursor-pointer rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                                <X className="size-5" />
                            </button>
                        </div>
                        <form action={handleEditSubmit} className="flex flex-col gap-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Class Name <span className="text-rose-500">*</span></label>
                                    <input name="name" defaultValue={editingClass.name} required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Section <span className="text-rose-500">*</span></label>
                                    <input name="section" defaultValue={editingClass.section} required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700">Student Capacity</label>
                                <input name="capacity" type="number" defaultValue={editingClass.capacity} min={1} required className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <Users className="size-3.5 text-orange-500" /> Class Teacher (Optional)
                                </label>
                                <select name="classTeacherId" defaultValue={editingClass.classTeacherId} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400 text-slate-700">
                                    <option value="">None / Unassigned</option>
                                    {dbTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="mt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setEditingClass(null)} className="cursor-pointer h-11 px-5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="cursor-pointer h-11 px-5 rounded-xl bg-[#FF6B35] text-sm font-semibold text-white shadow-sm hover:bg-[#e85a27]">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}