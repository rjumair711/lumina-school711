'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/dashboard/admin-sidebar'
import { Header } from '@/components/dashboard/admin-header'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    // 1. Force the viewport to exactly screen height and hide external overflow
    <div className="h-screen bg-[#f7f8fc] text-slate-900 overflow-hidden">
      {/* 2. Change min-h-screen to h-full */}
      <div className="flex h-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        {sidebarOpen && (
          <button
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/20 lg:hidden"
          />
        )}
        {/* 3. Constrain the right-side flex column so the main content scrolls */}
        <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          <Header onMenu={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto px-5 py-7 sm:px-8">
            <div className="mx-auto max-w-[1440px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}