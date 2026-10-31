'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity, BookOpen, CalendarCheck, CalendarDays, CircleDollarSign,
  ClipboardList, FolderOpen, GraduationCap, LayoutDashboard, MessageCircle,
  Receipt, Settings2, ShieldCheck, Sparkles, Users, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Teachers', href: '/admin/teachers', icon: GraduationCap },
  { label: 'Classes', href: '/admin/classes', icon: BookOpen },
  { label: 'Attendance', href: '/admin/attendance', icon: CalendarCheck },
  { label: 'Fees', href: '/admin/fees', icon: CircleDollarSign },
  { label: 'Homework', href: '/admin/homework', icon: ClipboardList },
  { label: 'Timetable', href: '/admin/timetable', icon: CalendarDays },
  { label: 'Notice Board', href: '/admin/notice-board', icon: Activity },
  { label: 'Communication', href: '/admin/communication', icon: MessageCircle },
  { label: 'Reports', href: '/admin/reports', icon: Receipt },
  { label: 'AI Assistant', href: '/admin/ai-assistant', icon: Sparkles },
  { label: 'Roles & Permissions', href: '/admin/roles-permissions', icon: ShieldCheck },
  { label: 'Subject & Class', href: '/admin/subject-class', icon: BookOpen },
  { label: 'Tests & Exams', href: '/admin/tests-exams', icon: ClipboardList },
  { label: 'Study Materials', href: '/admin/study-materials', icon: FolderOpen },
  { label: 'Settings', href: '/admin/settings', icon: Settings2 },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex w-[232px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <GraduationCap className="size-5" />
        </div>
        <div>
          <div className="text-lg font-bold tracking-tight text-slate-900">EduFlow</div>
          <div className="text-xs text-slate-400">School Admin</div>
        </div>
        <button onClick={onClose} aria-label="Close menu" className="ml-auto lg:hidden">
          <X className="size-5" />
        </button>
      </div>

      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        Navigation
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={label}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900',
                isActive && 'bg-indigo-50 font-semibold text-indigo-700'
              )}
            >
              <Icon className="size-[17px]" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
        <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
          SA
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-slate-800">School Admin</div>
          <div className="text-[10px] text-slate-400">Administrator</div>
        </div>
        <Settings2 className="ml-auto size-4 text-slate-400" />
      </div>
    </aside>
  )
}