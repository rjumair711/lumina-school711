'use client'

import { useState } from 'react'
import { Download, Eye, FileText, FolderOpen, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { materials } from '@/lib/mock-data'

export default function StudyMaterialsPage() {
  const [filter, setFilter] = useState('All')
  const filters = ['All', 'Pdf', 'Notes', 'Paper', 'Worksheet']
  
  const visible = filter === 'All' ? materials : materials.filter((item) => item.type === filter)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Study Materials</h1>
          <p className="mt-1 text-sm text-slate-500">60 resources available.</p>
        </div>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#e95b29]">
          <FolderOpen className="size-4" />+ Upload Material
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="h-10 w-full rounded-xl border border-slate-200 px-10 text-sm outline-none focus:border-[#FF6B35]" placeholder="Search by title or subject..." />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button 
              key={item} 
              onClick={() => setFilter(item)} 
              className={cn('rounded-full border px-4 py-2 text-xs font-semibold transition-colors', filter === item ? 'border-[#FF6B35] bg-[#FF6B35] text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-[#FF6B35]')}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {visible.map((item) => (
          <Card key={item.title} className="border-slate-200 shadow-sm">
            <CardContent className="flex h-full flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-[#FF6B35]">
                  <FileText className="size-5" />
                </div>
                <h2 className="min-w-0 flex-1 pt-1 text-sm font-bold leading-5 text-slate-900">{item.title}</h2>
                <button aria-label={`Save ${item.title}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50">
                  <Download className="size-4" />
                </button>
              </div>
              <div className="mt-4 text-xs font-medium text-slate-500">{item.teacher}</div>
              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{item.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="bg-orange-50 text-[10px] text-[#d95324] hover:bg-orange-50">{item.type}</Badge>
                <Badge variant="secondary" className="text-[10px]">{item.subject}</Badge>
                <Badge variant="secondary" className="text-[10px]">{item.className}</Badge>
              </div>
              <div className="mt-5 flex items-center justify-between text-[10px] text-slate-400">
                <span>{item.date}</span>
                <span>{item.downloads} downloads</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                  <Eye className="size-3.5" />Preview
                </button>
                <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#FF6B35] text-xs font-semibold text-white hover:bg-[#e95b29]">
                  <Download className="size-3.5" />Download
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
