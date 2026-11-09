'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  CalendarHeart,
  FileSignature,
  Loader2,
  Megaphone,
  Printer,
  RefreshCw,
  Save,
  Sparkles,
  Square,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { AiAssistantData } from '@/app/actions/ai'
import { saveNotice } from '@/app/actions/notices'
import { inputClass, labelClass, primaryButton } from '../tests-exams/forms'
import { Markdown } from './markdown'
import { CopyButton } from './insights-chat'
import { useAiStream } from './use-ai-stream'

const TONES = ['Warm', 'Formal', 'Encouraging', 'Firm but polite', 'Friendly', 'Neutral']
const AUDIENCES = ['Everyone', 'Parents', 'Students', 'Teachers', 'Staff']
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

function ToolHeader({ icon: Icon, title, text }: { icon: typeof Sparkles; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
        <Icon className="size-5 text-[#FF6B35]" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{text}</p>
      </div>
    </div>
  )
}

// Output area shared by all generators.
function Output({
  ai,
  mode,
  placeholder,
  onRegenerate,
  extra,
}: {
  ai: ReturnType<typeof useAiStream>
  mode: 'text' | 'markdown'
  placeholder: string
  onRegenerate: () => void
  extra?: React.ReactNode
}) {
  const streaming = ai.status === 'streaming'
  const hasText = Boolean(ai.text)

  return (
    <div className="flex min-h-[260px] flex-col rounded-2xl border border-slate-200 bg-slate-50/50">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Sparkles className={cn('size-3.5 text-[#FF6B35]', streaming && 'animate-pulse')} />
          {streaming ? 'Writing…' : hasText ? 'Draft (you can edit it)' : 'Output'}
        </span>
        <div className="flex items-center gap-1">
          {streaming ? (
            <button onClick={ai.stop} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100">
              <Square className="size-3 fill-current" /> Stop
            </button>
          ) : (
            hasText && (
              <>
                <CopyButton text={ai.text} />
                <button onClick={onRegenerate} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  <RefreshCw className="size-3.5" /> Regenerate
                </button>
                {extra}
              </>
            )
          )}
        </div>
      </div>
      <div className="flex-1 p-4">
        {ai.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{ai.error}</div>
        ) : !hasText ? (
          streaming ? (
            <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="size-4 animate-spin" /> Looking up records…</div>
          ) : (
            <p className="text-sm text-slate-400">{placeholder}</p>
          )
        ) : mode === 'markdown' || streaming ? (
          mode === 'markdown' ? <Markdown text={ai.text} /> : <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{ai.text}</p>
        ) : (
          <textarea
            value={ai.text}
            onChange={(e) => ai.setText(e.target.value)}
            className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700 outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100"
          />
        )}
      </div>
    </div>
  )
}

function GenerateButton({ busy, disabled, children }: { busy: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" className={cn(primaryButton, 'w-full')} disabled={busy || disabled}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
      {children}
    </button>
  )
}

// ------------------------------------------------------------------
// Report card comments
// ------------------------------------------------------------------

export function ReportCommentTool({ data }: { data: AiAssistantData }) {
  const ai = useAiStream()
  const [classId, setClassId] = useState(data.classes[0]?.id ?? '')
  const [studentId, setStudentId] = useState('')
  const [conduct, setConduct] = useState('Good')
  const [tone, setTone] = useState('Warm')
  const [length, setLength] = useState('Standard')
  const [notes, setNotes] = useState('')

  const students = useMemo(() => data.students.filter((s) => s.classId === classId), [data.students, classId])
  useEffect(() => setStudentId(students[0]?.id ?? ''), [students])

  const generate = () => ai.run({ tool: 'report-comment', input: { studentId, conduct, tone, length, notes } })

  return (
    <div className="flex flex-col gap-5 p-5">
      <ToolHeader icon={FileSignature} title="Report Card Comments" text="Uses the student's real marks and attendance from the last six months." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,360px)_1fr]">
        <form onSubmit={(e) => { e.preventDefault(); generate() }} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <label className={labelClass}>Class
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
                {data.classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
              </select>
            </label>
            <label className={labelClass}>Student
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass} disabled={!students.length}>
                {!students.length && <option value="">No students in this class</option>}
                {students.map((s) => <option key={s.id} value={s.id}>{s.rollNo ? `${s.rollNo}. ` : ''}{s.name}</option>)}
              </select>
            </label>
            <label className={labelClass}>Conduct
              <select value={conduct} onChange={(e) => setConduct(e.target.value)} className={inputClass}>
                {['Excellent', 'Good', 'Satisfactory', 'Needs improvement'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Tone
                <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
                  {['Warm', 'Encouraging', 'Formal', 'Neutral'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className={labelClass}>Length
                <select value={length} onChange={(e) => setLength(e.target.value)} className={inputClass}>
                  {['Short', 'Standard', 'Detailed'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
            </div>
          </div>
          <label className={labelClass}>Teacher&apos;s notes (optional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={600} rows={3} placeholder="e.g. Very active in the science club; needs to submit homework on time." className={cn(inputClass, 'h-auto py-2')} />
          </label>
          <GenerateButton busy={ai.status === 'streaming'} disabled={!studentId}>Generate comment</GenerateButton>
        </form>
        <Output ai={ai} mode="text" placeholder="Choose a student and generate a comment." onRegenerate={generate} />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Fee reminder letters
// ------------------------------------------------------------------

function printText(title: string, body: string) {
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  const doc = w.document
  doc.title = title
  const style = doc.createElement('style')
  style.textContent = 'body{font:15px/1.7 Georgia,serif;max-width:680px;margin:48px auto;padding:0 24px;color:#111;white-space:pre-wrap}'
  doc.head.appendChild(style)
  doc.body.textContent = body
  w.focus()
  w.print()
}

export function FeeLetterTool({ data }: { data: AiAssistantData }) {
  const ai = useAiStream()
  const [studentId, setStudentId] = useState(data.defaulters[0]?.id ?? '')
  const [tone, setTone] = useState('Formal')
  const [language, setLanguage] = useState('English')
  const selected = data.defaulters.find((d) => d.id === studentId)

  const generate = () => ai.run({ tool: 'fee-letter', input: { studentId, tone, language } })

  return (
    <div className="flex flex-col gap-5 p-5">
      <ToolHeader icon={FileSignature} title="Fee Reminder Letter" text="Written from the student's actual unpaid fees and due dates." />
      {data.defaulters.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
          No students have overdue fees right now. 🎉
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,360px)_1fr]">
          <form onSubmit={(e) => { e.preventDefault(); generate() }} className="flex flex-col gap-4">
            <label className={labelClass}>Student with overdue fees
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
                {data.defaulters.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} · {d.className} · {inr(d.overdue)}</option>
                ))}
              </select>
            </label>
            {selected && (
              <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                <b>{inr(selected.overdue)}</b> overdue · oldest {selected.daysOverdue} days past due
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClass}>Tone
                <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
                  {['Formal', 'Friendly', 'Firm but polite'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label className={labelClass}>Language
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                  {['English', 'Hindi', 'Urdu'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
            </div>
            <GenerateButton busy={ai.status === 'streaming'} disabled={!studentId}>Write letter</GenerateButton>
            <p className="text-[11px] text-slate-400">
              Record payments on the <Link href="/admin/fees" className="font-semibold text-[#FF6B35] hover:underline">Fees page</Link>. This list updates automatically.
            </p>
          </form>
          <Output
            ai={ai}
            mode="text"
            placeholder="Pick a student and write the letter."
            onRegenerate={generate}
            extra={
              <button onClick={() => printText('Fee reminder', ai.text)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <Printer className="size-3.5" /> Print
              </button>
            }
          />
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------
// Notice generator (can save straight to the Notice Board as a draft)
// ------------------------------------------------------------------

const audienceMap: Record<string, 'EVERYONE' | 'PARENTS' | 'STUDENTS' | 'TEACHERS'> = {
  Everyone: 'EVERYONE',
  Parents: 'PARENTS',
  Students: 'STUDENTS',
  Teachers: 'TEACHERS',
  Staff: 'TEACHERS',
}

function splitNotice(text: string) {
  const match = /^\s*Title:\s*(.+)\n+([\s\S]*)$/i.exec(text)
  return match ? { title: match[1].trim(), body: match[2].trim() } : { title: '', body: text.trim() }
}

export function NoticeTool({ prefill }: { prefill?: { topic: string; details: string } | null }) {
  const ai = useAiStream()
  const [topic, setTopic] = useState(prefill?.topic ?? '')
  const [details, setDetails] = useState(prefill?.details ?? '')
  const [audience, setAudience] = useState('Everyone')
  const [tone, setTone] = useState('Formal')
  const [saving, startSaving] = useTransition()
  const [savedId, setSavedId] = useState(false)

  useEffect(() => {
    if (prefill) {
      setTopic(prefill.topic)
      setDetails(prefill.details)
    }
  }, [prefill])

  const generate = () => {
    setSavedId(false)
    ai.run({ tool: 'notice', input: { topic, details, audience, tone } })
  }

  const saveDraft = () =>
    startSaving(async () => {
      const { title, body } = splitNotice(ai.text)
      const res = await saveNotice({
        title: (title || topic).slice(0, 200),
        description: body.slice(0, 10000),
        priority: 'MEDIUM',
        status: 'DRAFT',
        audience: audienceMap[audience] ?? 'EVERYONE',
        classId: null,
        isPinned: false,
        publishAt: null,
        expiresAt: null,
      })
      if (res.success) {
        setSavedId(true)
        toast.success('Saved as a draft on the Notice Board')
      } else toast.error(res.error)
    })

  return (
    <div className="flex flex-col gap-5 p-5">
      <ToolHeader icon={Megaphone} title="Notice Generator" text="Draft a notice, edit it, then save it to the Notice Board as a draft." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,360px)_1fr]">
        <form onSubmit={(e) => { e.preventDefault(); generate() }} className="flex flex-col gap-4">
          <label className={labelClass}>What is the notice about? *
            <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} required placeholder="e.g. Parent-teacher meeting for Class 9" className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Audience
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className={inputClass}>
                {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <label className={labelClass}>Tone
              <select value={tone} onChange={(e) => setTone(e.target.value)} className={inputClass}>
                {TONES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className={labelClass}>Key details
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={5} maxLength={2000} placeholder="Date, time, venue, what to bring, contact person…" className={cn(inputClass, 'h-auto py-2')} />
          </label>
          <GenerateButton busy={ai.status === 'streaming'} disabled={!topic.trim()}>Draft notice</GenerateButton>
        </form>
        <Output
          ai={ai}
          mode="text"
          placeholder="Describe the notice and generate a draft."
          onRegenerate={generate}
          extra={
            savedId ? (
              <Link href="/admin/notice-board" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">
                Open Notice Board →
              </Link>
            ) : (
              <button onClick={saveDraft} disabled={saving} className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-[11px] font-semibold text-[#d95324] hover:bg-orange-100">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Save as draft
              </button>
            )
          }
        />
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Event planner
// ------------------------------------------------------------------

export function EventPlannerTool({ onMakeNotice }: { onMakeNotice: (topic: string, details: string) => void }) {
  const ai = useAiStream()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [audience, setAudience] = useState('Everyone')
  const [budget, setBudget] = useState('')
  const [notes, setNotes] = useState('')

  const generate = () => ai.run({ tool: 'event', input: { name, date, audience, budget, notes } })

  return (
    <div className="flex flex-col gap-5 p-5">
      <ToolHeader icon={CalendarHeart} title="Event Planner" text="A task timeline and budget that checks for clashes with your upcoming tests and exams." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,360px)_1fr]">
        <form onSubmit={(e) => { e.preventDefault(); generate() }} className="flex flex-col gap-4">
          <label className={labelClass}>Event name *
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} placeholder="e.g. Annual Sports Day" className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>Budget (₹)
              <input inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))} placeholder="Optional" className={inputClass} />
            </label>
          </div>
          <label className={labelClass}>Audience
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className={inputClass}>
              {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label className={labelClass}>Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} placeholder="Venue, chief guest, activities, constraints…" className={cn(inputClass, 'h-auto py-2')} />
          </label>
          <GenerateButton busy={ai.status === 'streaming'} disabled={!name.trim()}>Plan event</GenerateButton>
        </form>
        <Output
          ai={ai}
          mode="markdown"
          placeholder="Describe the event to get a plan."
          onRegenerate={generate}
          extra={
            <button
              onClick={() => onMakeNotice(name, [date && `Date: ${date}`, notes].filter(Boolean).join('\n'))}
              className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-[11px] font-semibold text-[#d95324] hover:bg-orange-100"
            >
              <Megaphone className="size-3.5" /> Create notice
            </button>
          }
        />
      </div>
    </div>
  )
}

