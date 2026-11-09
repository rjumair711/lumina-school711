'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarHeart,
  FileSignature,
  KeyRound,
  Megaphone,
  MessageSquareText,
  ReceiptText,
  Settings2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAiAssistantData, type AiAssistantData } from '@/app/actions/ai'
import { InsightsChat } from './ai/insights-chat'
import { EventPlannerTool, FeeLetterTool, NoticeTool, ReportCommentTool } from './ai/generators'
import { AiSettingsPanel } from './ai/settings-panel'

type ToolId = 'insights' | 'report' | 'fees' | 'notice' | 'event' | 'settings'

const TOOLS: { id: ToolId; label: string; hint: string; icon: typeof Sparkles }[] = [
  { id: 'insights', label: 'School Insights', hint: 'Ask questions about your data', icon: MessageSquareText },
  { id: 'report', label: 'Report Card Comments', hint: 'From real marks & attendance', icon: FileSignature },
  { id: 'fees', label: 'Fee Reminder Letter', hint: 'For students with overdue fees', icon: ReceiptText },
  { id: 'notice', label: 'Notice Generator', hint: 'Save drafts to the Notice Board', icon: Megaphone },
  { id: 'event', label: 'Event Planner', hint: 'Timeline, budget, clash check', icon: CalendarHeart },
  { id: 'settings', label: 'AI Settings', hint: 'Provider, model & API key', icon: Settings2 },
]

const REFRESH_MS = 60_000

export default function AIAssistantPage({ initialData }: { initialData: AiAssistantData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [tool, setTool] = useState<ToolId>(initialData.ai.configured ? 'insights' : 'settings')
  const [noticePrefill, setNoticePrefill] = useState<{ topic: string; details: string } | null>(null)

  // Keep pickers and stats fresh (new students, payments, etc.).
  const reload = useCallback(async () => {
    const res = await getAiAssistantData()
    if (res.success) setData(res.data)
    else if (res.unauthorized) router.replace('/')
  }, [router])

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && reload()
    const id = window.setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [reload])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[#FF6B35]" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Assistant</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">AI tools grounded in {data.schoolName}&apos;s live records.</p>
        </div>
        <button
          onClick={() => setTool('settings')}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold transition hover:border-[#FF6B35]',
            data.ai.configured ? 'border-slate-200 bg-white text-slate-600' : 'border-amber-200 bg-amber-50 text-amber-800'
          )}
        >
          <span className={cn('size-1.5 rounded-full', data.ai.configured ? 'bg-emerald-500' : 'bg-amber-500')} />
          {data.ai.configured ? `${data.ai.provider} · ${data.ai.model}` : 'AI not connected'}
        </button>
      </div>

      {!data.ai.configured && tool !== 'settings' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <KeyRound className="size-4 shrink-0" />
          <span className="flex-1">{data.ai.problem}</span>
          <button onClick={() => setTool('settings')} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100">
            Open AI settings
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid min-h-[680px] lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">AI tools</div>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {TOOLS.map(({ id, label, hint, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTool(id)}
                  className={cn(
                    'flex min-w-[190px] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors lg:min-w-0',
                    tool === id ? 'bg-orange-50' : 'hover:bg-slate-50'
                  )}
                >
                  <Icon className={cn('mt-0.5 size-4 shrink-0', tool === id ? 'text-[#FF6B35]' : 'text-slate-400')} />
                  <span>
                    <span className={cn('block text-sm font-semibold', tool === id ? 'text-[#d95324]' : 'text-slate-700')}>{label}</span>
                    <span className="block text-[11px] text-slate-400">{hint}</span>
                  </span>
                </button>
              ))}
            </nav>

            <div className="mt-6 hidden rounded-xl bg-slate-50 lg:block">
              <div className="flex gap-2 p-3 text-[11px] leading-5 text-slate-500">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                <p>
                  Student names, attendance, marks and fee balances are sent to your chosen AI provider to generate answers. Phone numbers and emails are never sent.
                  Always review AI drafts before sharing them.
                </p>
              </div>
            </div>
          </aside>

          <section className="min-h-0 min-w-0">
            {tool === 'settings' && <AiSettingsPanel onSaved={reload} />}
            {tool === 'insights' && <InsightsChat data={data} />}
            {tool === 'report' && <ReportCommentTool data={data} />}
            {tool === 'fees' && <FeeLetterTool data={data} />}
            {tool === 'notice' && <NoticeTool prefill={noticePrefill} />}
            {tool === 'event' && (
              <EventPlannerTool
                onMakeNotice={(topic, details) => {
                  setNoticePrefill({ topic, details })
                  setTool('notice')
                }}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
