'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, LogOut, PanelLeft, Search, Settings2 } from 'lucide-react'
import { signOut } from 'next-auth/react'

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? 'A') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function Header({
  onMenu,
  schoolName,
  adminName,
}: {
  onMenu: () => void
  schoolName: string
  adminName: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/admin/students?q=${encodeURIComponent(q)}` : '/admin/students')
  }

  return (
    <header className="flex h-[72px] w-full min-w-0 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open menu"
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50 lg:hidden"
        >
          <PanelLeft className="size-5" />
        </button>
        <form onSubmit={onSearch} role="search" className="relative min-w-0 max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search students"
            className="h-10 w-full rounded-xl border-0 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:ring-indigo-200"
            placeholder="Search students by name, ID or roll no…"
          />
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/admin/notice-board"
          aria-label="Notice board"
          title="Notice board"
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50"
        >
          <Bell className="size-5" />
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              {initials(adminName)}
            </span>
            <span className="hidden max-w-[180px] truncate sm:inline">{schoolName}</span>
            <ChevronDown className="size-3.5" />
          </button>

          {menuOpen && (
            <div role="menu" className="absolute right-0 z-40 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-semibold text-slate-900">{adminName}</p>
                <p className="truncate text-xs text-slate-500">{schoolName}</p>
              </div>
              <Link
                href="/admin/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Settings2 className="size-4" /> Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
