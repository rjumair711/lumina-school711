'use client'

import { useState } from 'react'
import { BookOpen, Pencil, Receipt, Trash2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { subjectCatalog } from '@/lib/mock-data'

export default function SubjectClassPage() {
  const [tab, setTab] = useState('Subjects')
  const [selected, setSelected] = useState<string[]>(['English', 'Mathematics', 'Science', 'Social Studies', 'Urdu', 'Hindi'])
  const assigned = ['English', 'Mathematics']
  
  const toggleSubject = (name: string) => {
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subject &amp; Class Assignment</h1>
        <p className="mt-1 text-sm text-slate-500">Manage subjects and assign them to existing classes.</p>
      </div>

      <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">
        {[
          ["Subjects", BookOpen], 
          ["Assign Subjects", Users], 
          ["Summary", Receipt]
        ].map(([label, Icon]) => {
          const IconComponent = Icon as React.ComponentType<{ className?: string }>
          return (
            <button 
              key={label as string} 
              onClick={() => setTab(label as string)} 
              className={cn('flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold transition-all sm:text-sm', tab === label ? 'bg-white text-[#FF6B35] shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              <IconComponent className="size-4" />{label as string}
            </button>
          )
        })}
      </div>

      {tab === 'Subjects' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between px-5 pb-4 pt-5">
            <div>
              <CardTitle className="text-base">Subjects</CardTitle>
              <p className="mt-1 text-xs text-slate-500">{subjectCatalog.length} subject(s)</p>
            </div>
            <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white hover:bg-[#e95b29]">
              <span className="text-lg leading-none">+</span>Add Subject
            </button>
          </CardHeader>
          <CardContent className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-3">Subject Name</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjectCatalog.map((subject) => (
                  <tr key={subject.code} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-4 font-semibold text-slate-800">{subject.name}</td>
                    <td className="px-3 py-4 text-xs font-bold text-[#d95324]">{subject.code}</td>
                    <td className="px-3 py-4 text-xs text-slate-500">{subject.description}</td>
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-1">
                        <button aria-label={`Edit ${subject.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-orange-50 hover:text-[#FF6B35]">
                          <Pencil className="size-4" />
                        </button>
                        <button aria-label={`Delete ${subject.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === 'Assign Subjects' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="px-5 pb-2 pt-5">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-[#FF6B35]" />
              <CardTitle className="text-base">Single Assignment</CardTitle>
            </div>
            <p className="mt-1 text-xs text-slate-500">Select one class and assign subjects to it.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 px-5 pb-5">
            <label className="flex max-w-xs flex-col gap-2 text-xs font-semibold text-slate-700">
              Select Class
              <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#FF6B35]">
                <option>9 - A</option>
                <option>9 - B</option>
                <option>10 - A</option>
              </select>
            </label>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Select Subjects to Assign</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {subjectCatalog.map((subject) => {
                  const isAssigned = assigned.includes(subject.name)
                  const isSelected = selected.includes(subject.name)
                  return (
                    <button 
                      key={subject.code} 
                      disabled={isAssigned} 
                      onClick={() => toggleSubject(subject.name)} 
                      className={cn('flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors', isAssigned ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50' : isSelected ? 'border-[#FF6B35] bg-orange-50 text-[#d95324]' : 'border-slate-200 hover:border-orange-200')}
                    >
                      <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold', isAssigned || isSelected ? 'border-[#FF6B35] bg-[#FF6B35] text-white' : 'border-slate-300 text-transparent')}>
                        {isAssigned || isSelected ? '✓' : ''}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{subject.name}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">{subject.code}</span>
                      </span>
                      {isAssigned && <span className="text-[10px] font-semibold text-slate-400">assigned</span>}
                    </button>
                  )
                })}
              </div>
            </div>
            <button className="w-fit rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e95b29]">
              Assign {selected.length} Subjects
            </button>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span className="font-semibold">Currently assigned to 9:</span>
              {assigned.map((item) => (
                <Badge key={item} className="bg-orange-50 text-[#d95324] hover:bg-orange-50">{item}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'Summary' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="px-5 pb-2 pt-5">
            <CardTitle className="text-base">Assignment Summary</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Review subject coverage across your classes.</p>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            {['9 - A','9 - B','10 - A','10 - B','8 - A','8 - B'].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">{item}</span>
                  <span className="text-xs font-semibold text-[#FF6B35]">6 subjects</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-3/4 rounded-full bg-[#FF6B35]" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
