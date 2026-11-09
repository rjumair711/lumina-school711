'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp, Check, Copy, RotateCcw, Sparkles, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AiAssistantData } from '@/app/actions/ai'
import { Markdown } from './markdown'
import { useAiStream } from './use-ai-stream'

type Message = { role: 'user' | 'assistant'; content: string; failed?: boolean }

const STORAGE_KEY = 'lumina.ai.insights.v1'

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard blocked */
        }
      }}
      className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800', className)}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function InsightsChat({ data }: { data: AiAssistantData }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const ai = useAiStream()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Keep the conversation for this browser tab only.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch {
      /* storage unavailable */
    }
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)))
    } catch {
      /* storage unavailable */
    }
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, ai.text])

  const busy = ai.status === 'streaming'

  const ask = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    const history = [...messages.filter((m) => !m.failed), { role: 'user' as const, content: trimmed }]
    setMessages(history)
    setQuestion('')

    const answer = await ai.run({ tool: 'insights', messages: history })
    if (answer) {
      setMessages((m) => [...m, { role: 'assistant', content: answer }])
    } else {
      setMessages((m) => m.map((msg, i) => (i === m.length - 1 ? { ...msg, failed: true } : msg)))
    }
    inputRef.current?.focus()
  }

  const stopAndKeep = () => {
    const partial = ai.text
    ai.stop()
    if (partial) setMessages((m) => [...m, { role: 'assistant', content: `${partial}\n\n_(stopped)_` }])
    ai.reset()
  }

  const suggestions = [
    'Give me a summary of this month',
    'Which classes need attention and why?',
    'Who has the largest overdue fees?',
    'Which students are below 75% attendance?',
    'How are students performing by subject?',
    ...data.insights.slice(0, 2).map((i) => `Tell me more: ${i.title}`),
  ].slice(0, 6)

  const stats = [
    ['Students', data.stats.students.toLocaleString('en-IN')],
    ['Teachers', data.stats.teachers.toLocaleString('en-IN')],
    ['Classes', String(data.stats.classes)],
    ['Attendance', data.stats.attendanceRate === null ? '—' : `${data.stats.attendanceRate}%`],
    ['Collected', inr(data.stats.collected)],
    ['Outstanding', inr(data.stats.outstanding)],
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">School Insights</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Answers use this month&apos;s live data from {data.schoolName} · updated {data.updatedLabel}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => {
                ai.reset()
                setMessages([])
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="size-3.5" /> New chat
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-[10px] text-slate-400">{label}</div>
              <div className="mt-0.5 truncate text-xs font-bold text-slate-800">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex min-h-[360px] flex-1 flex-col gap-5 overflow-y-auto px-5 py-6" aria-live="polite">
        {messages.length === 0 && !busy ? (
          <div className="m-auto max-w-xl text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-orange-50">
              <Sparkles className="size-6 text-[#FF6B35]" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">Ask anything about your school</h3>
            <p className="mt-1 text-sm text-slate-500">Attendance, fees, marks, upcoming exams: answered from your real records.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  onClick={() => ask(item)}
                  className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-[#d95324] transition hover:bg-orange-100"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex flex-col items-end gap-1">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#FF6B35] px-4 py-2.5 text-sm text-white">
                    {m.content}
                  </div>
                  {m.failed && (
                    <button onClick={() => { setMessages((all) => all.slice(0, i)); ask(m.content) }} className="text-[11px] font-semibold text-rose-600 hover:underline">
                      Failed: retry
                    </button>
                  )}
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-50">
                    <Sparkles className="size-3.5 text-[#FF6B35]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Markdown text={m.content} />
                    <CopyButton text={m.content} className="-ml-2 mt-1" />
                  </div>
                </div>
              )
            )}
            {busy && (
              <div className="flex gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-50">
                  <Sparkles className="size-3.5 animate-pulse text-[#FF6B35]" />
                </div>
                <div className="min-w-0 flex-1">
                  {ai.text ? (
                    <Markdown text={ai.text} />
                  ) : (
                    <div className="flex items-center gap-1.5 pt-1.5 text-sm text-slate-400">
                      <span className="size-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-slate-300" />
                      <span className="ml-1">Reading your school data…</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {ai.error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{ai.error}</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(question)
        }}
        className="border-t border-slate-200 p-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-[#FF6B35] focus-within:ring-2 focus-within:ring-orange-100">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                ask(question)
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Ask about attendance, fees, results…"
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
          />
          {busy ? (
            <button type="button" onClick={stopAndKeep} aria-label="Stop" className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="submit" aria-label="Send" disabled={!question.trim()} className="flex size-10 items-center justify-center rounded-xl bg-[#FF6B35] text-white transition hover:bg-[#e95b29] disabled:opacity-40">
              <ArrowUp className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Enter to send · Shift+Enter for a new line · AI can make mistakes, so check important figures in Reports.</p>
      </form>
    </div>
  )
}
