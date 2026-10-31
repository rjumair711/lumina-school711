'use client'

import { useState } from 'react'
import { ChevronRight, Settings2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { permissionGroups, permissionTeachers } from '@/lib/mock-data'

export default function RolesPermissionsPage() {
  const [selectedName, setSelectedName] = useState('Anjali Singh')
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ 
    'View student profiles': true, 
    'Add and edit students': true, 
    'View attendance records': true, 
    'Mark attendance': true, 
    'View exam results': true, 
    'Manage homework': true 
  })
  const [saved, setSaved] = useState(false)
  
  const teacher = permissionTeachers.find((item) => item.name === selectedName) ?? permissionTeachers[0]
  const activeCount = Object.values(enabled).filter(Boolean).length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-[#FF6B35]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Roles &amp; Permissions</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Assign permissions to teachers</p>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid min-h-[650px] lg:grid-cols-[34%_66%]">
          <section className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r" aria-label="Teachers">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-800">Teachers</h2>
              <p className="mt-1 text-xs text-slate-400">Select a teacher to manage access</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {permissionTeachers.map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => { setSelectedName(item.name); setSaved(false) }} 
                  className={cn('relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors', teacher.name === item.name ? 'bg-orange-50' : 'hover:bg-slate-50')}
                >
                  <span className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#FF6B35]', teacher.name === item.name ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#d95324]">{item.initials}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-800">{item.name}</span>
                    <span className="mt-1 block text-[11px] text-slate-400">{item.id}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </section>

          <section className="flex min-h-0 flex-col" aria-label="Permission settings">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
              <span className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-[#d95324]">
                {teacher.initials}
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">{teacher.name}</h2>
                <p className="mt-1 truncate text-xs text-slate-500">{teacher.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs font-medium text-slate-400">{activeCount} active</span>
                <button 
                  onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1800) }} 
                  className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B35] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e95b29]"
                >
                  <Settings2 className="size-3.5" />
                  {saved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {permissionGroups.map((group) => (
                <div key={group.title} className="mb-7 last:mb-0">
                  <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{group.title}</h3>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {group.items.map((item) => (
                      <label key={item} className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5">
                        <span className="text-sm font-medium text-slate-700">{item}</span>
                        <span className={cn('relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors', enabled[item] ? 'bg-[#FF6B35]' : 'bg-slate-200')}>
                          <input 
                            type="checkbox" 
                            className="sr-only" 
                            checked={Boolean(enabled[item])} 
                            onChange={() => setEnabled((current) => ({ ...current, [item]: !current[item] }))} 
                          />
                          <span className={cn('absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform', enabled[item] ? 'translate-x-6' : 'translate-x-1')} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Card>
    </div>
  )
}
