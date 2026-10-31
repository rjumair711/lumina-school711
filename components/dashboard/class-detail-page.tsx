'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, GraduationCap, Users, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type ClassDetailProps = {
    cls: {
        id: string
        name: string
        section: string
        capacity: number
        classTeacherName: string
        students: Array<{ id: string; name: string; email: string; rollNo: string; initials: string }>
        subjects: Array<{ id: string; name: string; code: string | null }>
        teachers: Array<{ id: string; name: string; qualification: string }>
    }
}

export default function ClassDetailPage({ cls }: ClassDetailProps) {
    const [activeTab, setActiveTab] = useState('Students')

    const tabs = ['Students', 'Subjects', 'Teachers', 'Overview']

    return (
        <div className="flex flex-col gap-6">
            {/* Back Button */}
            <div>
                <Link
                    href="/admin/classes"
                    className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-[#FF6B35]"
                >
                    <ArrowLeft className="size-4" />
                    Back to Classes
                </Link>
            </div>

            {/* Main Header Banner */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-2xl font-bold text-[#FF6B35]">
                            {cls.name}-{cls.section}
                        </div>
                        <div className="flex flex-col gap-1">
                            <h1 className="text-xl font-bold text-slate-900">Class {cls.name} - Section {cls.section}</h1>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="font-semibold text-slate-700">Class Teacher: {cls.classTeacherName}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                                <span className="inline-flex items-center gap-1.5">
                                    <Users className="size-3.5" />
                                    Enrolled: {cls.students.length} / {cls.capacity} Capacity
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50/60 px-6 py-4 text-center sm:min-w-[140px]">
                        <div>
                            <div className="text-2xl font-black text-indigo-600">{cls.students.length}</div>
                            <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Total Students</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'cursor-pointer rounded-xl px-4 py-2.5 text-xs font-semibold transition-all',
                            activeTab === tab
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100'
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content: Students */}
            {activeTab === 'Students' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left text-sm">
                            <thead>
                                <tr className="border-b bg-slate-50 text-xs text-slate-500">
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">Roll No.</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cls.students.map((student) => (
                                    <tr key={student.id} className="border-b transition-colors hover:bg-slate-50/80 last:border-0">
                                        <td className="px-5 py-4">
                                            <Link href={`/admin/students/${student.id}`} className="group flex items-center gap-3">
                                                <div className="flex size-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 group-hover:bg-[#FF6B35] group-hover:text-white transition-colors">
                                                    {student.initials}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 group-hover:text-[#FF6B35] transition-colors">
                                                        {student.name}
                                                    </div>
                                                    <div className="text-xs text-slate-400">{student.email}</div>
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">{student.rollNo}</td>
                                        <td className="px-5 py-4 text-right">
                                            <Link
                                                href={`/admin/students/${student.id}`}
                                                className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                            >
                                                View Profile
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {cls.students.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-slate-500">
                                            No students enrolled in this class yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* Tab Content: Subjects */}
            {activeTab === 'Subjects' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <h2 className="mb-4 text-sm font-bold text-slate-900">Subjects Taught in Class {cls.name}-{cls.section}</h2>
                        {cls.subjects.length === 0 ? (
                            <p className="text-sm text-slate-500">No subjects linked to this class yet.</p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {cls.subjects.map(subject => (
                                    <div key={subject.id} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                        <span className="font-semibold text-slate-800">{subject.name}</span>
                                        <span className="text-xs text-slate-400">Code: {subject.code || 'N/A'}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab Content: Teachers */}
            {activeTab === 'Teachers' && (
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-6">
                        <h2 className="mb-4 text-sm font-bold text-slate-900">Teachers Assigned to Class {cls.name}-{cls.section}</h2>
                        {cls.teachers.length === 0 ? (
                            <p className="text-sm text-slate-500">No teachers assigned to this class yet.</p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {cls.teachers.map(t => (
                                    <Link key={t.id} href={`/admin/teachers/${t.id}`} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 hover:border-orange-300 transition-colors">
                                        <span className="font-semibold text-slate-800">{t.name}</span>
                                        <span className="text-xs text-slate-400">{t.qualification}</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab Content: Overview */}
            {activeTab === 'Overview' && (
                <div className="grid gap-6 sm:grid-cols-2">
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-6">
                            <h2 className="mb-4 text-sm font-bold text-slate-900">Class Information</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-slate-500">Class Name</span>
                                    <span className="font-semibold text-slate-800">Grade {cls.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-slate-500">Section</span>
                                    <span className="font-semibold text-slate-800">{cls.section}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-slate-500">Capacity Limit</span>
                                    <span className="font-semibold text-slate-800">{cls.capacity} Students</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 pb-2">
                                    <span className="text-slate-500">Class Teacher</span>
                                    <span className="font-semibold text-slate-800">{cls.classTeacherName}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}