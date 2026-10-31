'use client'

import { Bell, ChevronDown, PanelLeft, Search } from 'lucide-react'
import { signOut } from 'next-auth/react'

export function Header({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex h-[72px] w-full min-w-0 shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          onClick={onMenu}
          aria-label="Toggle sidebar"
          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50"
        >
          <PanelLeft className="size-5" />
        </button>
        <div className="relative min-w-0 max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-xl border-0 bg-slate-50 pl-10 pr-4 text-sm text-slate-700 outline-none ring-1 ring-transparent placeholder:text-slate-400 focus:ring-indigo-200"
            placeholder="Search students, classes..."
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          aria-label="Notifications"
          className="relative shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-50"
        >
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        <button className="hidden shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 sm:flex">
          <span className="text-indigo-600">▣</span> Alfiah <ChevronDown className="size-3.5" />
        </button>

        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          title="Sign Out"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
        >
          SA
        </button>
      </div>
    </header>
  )
}