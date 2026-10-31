'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, GraduationCap, Mail, Phone, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export type TeacherDetailProps = {
  teacher: {
    id: string
    teacherId: string
    phone: string | null
    qualification: string | null
    experience: string | null
    user: {
      name: string | null
      email: string | null
    } | null
    classes: Array<{ id: string; name: string; section: string }>
    subjects: Array<{ id: string; name: string }>
  }
}

export default function TeacherDetailPage({ teacher }: TeacherDetailProps) {
  const [activeTab, setActiveTab] = useState('Overview')

  const initials = (teacher.user?.name || 'T').substring(0, 2).toUpperCase()
  const tabs = ['Overview', 'Classes', 'Subjects', 'Schedule']

  return (
    <div className="flex flex-col gap-6">
      {/* Back Button */}
      <div>
        <Link
          href="/admin/teachers"
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-[#FF6B35]"
        >
          <ArrowLeft className="size-4" />
          Back to Teachers
        </Link>
      </div>

      {/* Main Header Banner */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-600">
              {initials}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-slate-900">{teacher.user?.name || 'Unnamed Teacher'}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{teacher.qualification || 'N/A'}</span>
                <span>•</span>
                <span className="font-medium text-[#FF6B35]">ID: {teacher.teacherId}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {teacher.user?.email || 'No email registered'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {teacher.phone || 'No phone'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50/60 px-6 py-4 text-center sm:min-w-[140px]">
            <div>
              <div className="text-2xl font-black text-indigo-600">{teacher.experience || '0'}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Experience</div>
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

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="size-4 text-slate-500" /> Professional Details
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Teacher ID</span>
                  <span className="font-semibold text-slate-800">{teacher.teacherId}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Qualification</span>
                  <span className="font-semibold text-slate-800">{teacher.qualification || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Experience</span>
                  <span className="font-semibold text-slate-800">{teacher.experience || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'Classes' && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Assigned Classes</h2>
            {teacher.classes.length === 0 ? (
              <p className="text-sm text-slate-500">No classes assigned to this teacher yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teacher.classes.map(c => (
                  <span key={c.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    Class {c.name}-{c.section}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Subjects' && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Assigned Subjects</h2>
            {teacher.subjects.length === 0 ? (
              <p className="text-sm text-slate-500">No subjects assigned to this teacher yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map(s => (
                  <span key={s.id} className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
                    {s.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Schedule' && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center text-xs text-slate-500">
            No schedule recorded for this teacher yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}