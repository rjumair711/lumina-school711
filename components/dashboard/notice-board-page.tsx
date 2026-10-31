'use client'

import { useState } from 'react'
import { Activity, AlertTriangle, CalendarDays, Pencil, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { notices } from '@/lib/mock-data'

export default function NoticeBoardPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  
  const openDialog = (title?: string) => { 
    setEditing(title ?? null)
    setDialogOpen(true) 
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notice Board</h1>
          <p className="mt-1 text-sm text-slate-500">15 announcements posted.</p>
        </div>
        <button onClick={() => openDialog()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#e95b29]">
          <Activity className="size-4" />+ New Notice
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {notices.map((notice) => (
          <Card key={notice.title} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#FF6B35]">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">{notice.title}</h2>
                    <Badge className={cn('text-[10px] hover:bg-transparent', notice.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-[#d95324]')}>{notice.priority}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{notice.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{notice.date}</span>
                    <span>By {notice.author}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openDialog(notice.title)} aria-label={`Edit ${notice.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                    <Pencil className="size-4" />
                  </button>
                  <button aria-label={`Delete ${notice.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="notice-dialog-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 id="notice-dialog-title" className="text-lg font-bold text-slate-900">{editing ? 'Edit Notice' : 'Create New Notice'}</h2>
                <p className="mt-1 text-xs text-slate-500">Share an important update with your school community.</p>
              </div>
              <button type="button" onClick={() => setDialogOpen(false)} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); setDialogOpen(false) }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notice-title" className="text-xs font-semibold text-slate-700">Title *</label>
                <input id="notice-title" required defaultValue={editing ?? ''} placeholder="Notice title" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B35]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notice-description" className="text-xs font-semibold text-slate-700">Description *</label>
                <textarea id="notice-description" required rows={5} placeholder="Write notice details..." className="resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FF6B35]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="notice-priority" className="text-xs font-semibold text-slate-700">Priority</label>
                  <select id="notice-priority" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#FF6B35]">
                    <option>High</option><option>Medium</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="notice-author" className="text-xs font-semibold text-slate-700">Author</label>
                  <input id="notice-author" placeholder="Author name" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDialogOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button className="rounded-xl bg-[#FF6B35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e95b29]">{editing ? 'Save Changes' : 'Post Notice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}