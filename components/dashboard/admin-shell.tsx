'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/admin-sidebar'
import { Header } from '@/components/dashboard/admin-header'

export function AdminShell({
  schoolName,
  adminName,
  children,
}: {
  schoolName: string
  adminName: string
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="h-screen overflow-hidden bg-[#f7f8fc] text-slate-900">
      <div className="flex h-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <button
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/20 lg:hidden"
          />
        )}
        <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <Header onMenu={() => setSidebarOpen(true)} schoolName={schoolName} adminName={adminName} />
          <main className="flex-1 overflow-y-auto px-5 py-7 sm:px-8">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}
