'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText, GraduationCap, Mail, MapPin, Phone, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type StudentDetailProps = {
  student: {
    id: string
    studentId: string
    rollNo: string | null
    dob: string | null
    address: string | null
    parentName: string | null
    parentPhone: string | null
    parentEmail: string | null
    className: string
    section: string
    classTeacherName: string | null
    user: {
      name: string | null
      email: string | null
    } | null
    attendancesCount: number
    presentCount: number
    absentCount: number
    lateCount: number
    feeHistory: Array<{
      id: string
      title: string
      totalAmount: number
      paidAmount: number
      status: string
      dueDate: string
    }>
  }
}

export default function StudentDetailPage({ student }: StudentDetailProps) {
  const [activeTab, setActiveTab] = useState('Overview')

  const initials = (student.user?.name || 'ST').substring(0, 2).toUpperCase()
  const attendanceRate = student.attendancesCount > 0 
    ? Math.round((student.presentCount / student.attendancesCount) * 100) 
    : 100

  const tabs = ['Overview', 'Attendance', 'Marks', 'Results', 'Fee History', 'Documents']

  return (
    <div className="flex flex-col gap-6">
      {/* Back Button */}
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-[#FF6B35]"
        >
          <ArrowLeft className="size-4" />
          Back to Students
        </Link>
      </div>

      {/* Main Student Header Banner */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-orange-100 text-2xl font-bold text-[#d95324]">
              {initials}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-slate-900">{student.user?.name || 'Unnamed Student'}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Class {student.className}-{student.section}</span>
                <span>•</span>
                <span>Roll #{student.rollNo || 'N/A'}</span>
                <span>•</span>
                <span className="font-medium text-[#FF6B35]">ID: {student.studentId}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {student.user?.email || 'No email registered'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="size-3.5" />
                  Class {student.className}-{student.section}
                </span>
                {student.dob && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    DOB: {student.dob}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side attendance stat badge */}
          <div className="flex shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50/60 px-6 py-4 text-center sm:min-w-[140px]">
            <div>
              <div className="text-2xl font-black text-[#FF6B35]">{attendanceRate}%</div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Attendance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-xl px-4 py-2.5 text-xs font-semibold transition-all',
              activeTab === tab
                ? 'bg-[#FF6B35] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'Overview' && (
        <div className="flex flex-col gap-6">
          {/* Stats Bar */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-[#FF6B35]">{attendanceRate}%</div>
                <div className="mt-1 text-xs text-slate-500">Attendance Rate</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{student.presentCount}</div>
                <div className="mt-1 text-xs text-slate-500">Days Present</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">0</div>
                <div className="mt-1 text-xs text-slate-500">Streak Days</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-violet-600">0</div>
                <div className="mt-1 text-xs text-slate-500">Points</div>
              </CardContent>
            </Card>
          </div>

          {/* Student Details Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Student Details</h2>
              <div className="grid gap-x-8 gap-y-4 text-xs sm:grid-cols-2">
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Student ID:</span>
                  <span className="font-semibold text-slate-800">{student.studentId}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Class:</span>
                  <span className="font-semibold text-slate-800">{student.className}-{student.section}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Roll Number:</span>
                  <span className="font-semibold text-slate-800">{student.rollNo || '-'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Gender:</span>
                  <span className="font-semibold text-slate-800">-</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Blood Group:</span>
                  <span className="font-semibold text-slate-800">-</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Date of Birth:</span>
                  <span className="font-semibold text-slate-800">{student.dob || '-'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Class Teacher:</span>
                  <span className="font-semibold text-slate-800">{student.classTeacherName || '-'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Address:</span>
                  <span className="font-semibold text-slate-800">{student.address || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parent / Guardian Details Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Parent / Guardian Details</h2>
              <div className="grid gap-x-8 gap-y-4 text-xs sm:grid-cols-2">
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Name:</span>
                  <span className="font-semibold text-slate-800">{student.parentName || '-'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Relation:</span>
                  <span className="font-semibold text-slate-800">Parent / Guardian</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-semibold text-slate-800">{student.parentPhone || '-'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-2">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold text-slate-800">{student.parentEmail || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'Attendance' && (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{student.attendancesCount}</div>
                <div className="mt-1 text-xs text-slate-500">Total Days</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{student.presentCount}</div>
                <div className="mt-1 text-xs text-slate-500">Present</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-rose-600">{student.absentCount}</div>
                <div className="mt-1 text-xs text-slate-500">Absent</div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-500">{student.lateCount}</div>
                <div className="mt-1 text-xs text-slate-500">Late</div>
              </CardContent>
            </Card>
          </div>
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center text-xs text-slate-500">
              No detailed attendance records found for this student.
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'Fee History' && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Fee History</h2>
            {student.feeHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">No fee records found for this student.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {student.feeHistory.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="font-semibold text-slate-800">{fee.title}</div>
                      <div className="mt-0.5 text-slate-400">Due: {fee.dueDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">₹{fee.paidAmount} / ₹{fee.totalAmount}</div>
                      <Badge className="mt-1 bg-amber-50 text-amber-700">{fee.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(activeTab === 'Marks' || activeTab === 'Results' || activeTab === 'Documents') && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-12 text-center text-xs text-slate-500">
            No {activeTab.toLowerCase()} recorded for this student yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}