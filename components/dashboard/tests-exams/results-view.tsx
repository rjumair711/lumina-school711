'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Award, Download, Loader2, Medal, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getResultSheet,
  type AssessmentsData,
  type ResultSheet,
} from '@/app/actions/assessments'
import { inputClass, secondaryButton } from './forms'

export type ResultTarget = { kind: 'test' | 'exam'; id: string }

const gradeColor: Record<string, string> = {
  'A+': '#059669',
  A: '#10b981',
  'B+': '#3b82f6',
  B: '#60a5fa',
  C: '#f59e0b',
  D: '#fb923c',
  E: '#f97316',
  F: '#f43f5e',
}

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const blob = new Blob(['﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function ResultsView({
  data,
  target,
  onTargetChange,
  version,
}: {
  data: AssessmentsData
  target: ResultTarget | null
  onTargetChange: (t: ResultTarget | null) => void
  version: string
}) {
  const [sheet, setSheet] = useState<ResultSheet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [classFilter, setClassFilter] = useState('')
  const reqId = useRef(0)

  // Only offer assessments that have at least one mark entered.
  const options = useMemo(() => {
    const tests = data.tests
      .filter((t) => t.stats.entered > 0 && (!classFilter || t.classId === classFilter))
      .map((t) => ({
        value: `test:${t.id}`,
        label: `${t.title} · ${t.className} · ${t.dateLabel}`,
      }))
    const exams = data.exams
      .filter((e) => e.papers.some((p) => p.stats.entered > 0) && (!classFilter || e.classId === classFilter))
      .map((e) => ({
        value: `exam:${e.id}`,
        label: `${e.title} · ${e.className} · ${e.dateLabel}`,
      }))
    return { tests, exams }
  }, [data, classFilter])

  const value = target ? `${target.kind}:${target.id}` : ''
  const first = options.exams[0]?.value ?? options.tests[0]?.value ?? ''

  // Default to the latest exam (or test) with marks.
  useEffect(() => {
    const all = [...options.exams, ...options.tests].map((o) => o.value)
    if (!value || !all.includes(value)) {
      if (first) {
        const [kind, id] = first.split(':') as ['test' | 'exam', string]
        onTargetChange({ kind, id })
      } else if (value) {
        onTargetChange(null)
      }
    }
  }, [first, value, options, onTargetChange])

  // Reload on selection change and whenever the live data refreshes.
  useEffect(() => {
    if (!target) {
      setSheet(null)
      return
    }
    const id = ++reqId.current
    setLoading(true)
    getResultSheet(target.kind, target.id).then((res) => {
      if (id !== reqId.current) return
      setLoading(false)
      if (res.success) {
        setSheet(res.sheet)
        setError(null)
      } else {
        setError(res.error)
      }
    })
  }, [target, version])

  const exportCsv = () => {
    if (!sheet) return
    const header = [
      'Rank', 'Roll', 'Student', 'Student ID',
      ...sheet.columns.map((c) => `${c.label} (/${c.totalMarks})`),
      'Total', 'Out of', 'Percent', 'Grade', 'Result',
    ]
    const rows = sheet.rows.map((r) => [
      r.rank, r.rollNo, r.name, r.studentCode,
      ...sheet.columns.map((c) => {
        const cell = r.cells[c.id]
        return cell === null ? '' : cell.absent ? 'AB' : cell.marks
      }),
      r.obtained, r.maxTotal, r.percent, r.grade, r.result,
    ])
    downloadCsv(`results_${sheet.title.replace(/[^\w-]+/g, '_')}.csv`, [
      [sheet.title], [sheet.subtitle], [], header, ...rows,
    ])
  }

  const maxGrade = Math.max(1, ...(sheet?.stats.gradeDistribution.map((g) => g.count) ?? [1]))
  const toppers = sheet?.rows.filter((r) => r.rank !== null && r.rank <= 3) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex min-w-[160px] flex-col gap-1 text-xs font-semibold text-slate-600">
          Class
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={inputClass}>
            <option value="">All classes</option>
            {data.classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
          </select>
        </label>
        <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
          Test or exam
          <select
            value={value}
            onChange={(e) => {
              const [kind, id] = e.target.value.split(':') as ['test' | 'exam', string]
              onTargetChange(id ? { kind, id } : null)
            }}
            className={inputClass}
          >
            {!options.tests.length && !options.exams.length && <option value="">No marks entered yet</option>}
            {options.exams.length > 0 && (
              <optgroup label="Exams">
                {options.exams.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            )}
            {options.tests.length > 0 && (
              <optgroup label="Tests">
                {options.tests.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        <button className={secondaryButton} onClick={exportCsv} disabled={!sheet}>
          <Download className="size-4" /> Export CSV
        </button>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {!target ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Award className="size-7 text-slate-300" />
          <div className="text-sm font-semibold text-slate-600">No results yet</div>
          <p className="max-w-sm text-xs text-slate-400">
            Enter marks for a test or an exam paper and its results will appear here, ranked and graded.
          </p>
        </div>
      ) : !sheet ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Loading results…
        </div>
      ) : (
        <div className={cn('flex flex-col gap-6 transition-opacity', loading && 'opacity-60')}>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{sheet.title}</h3>
            <p className="text-sm text-slate-500">{sheet.subtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {[
              ['Students', sheet.stats.students, ''],
              ['Results ready', `${sheet.stats.complete}`, sheet.stats.pending ? `${sheet.stats.pending} pending` : 'All complete'],
              ['Class average', sheet.stats.average === null ? '—' : `${sheet.stats.average}%`, ''],
              ['Highest', sheet.stats.highest === null ? '—' : `${sheet.stats.highest}%`, ''],
              ['Lowest', sheet.stats.lowest === null ? '—' : `${sheet.stats.lowest}%`, ''],
              ['Pass rate', sheet.stats.passRate === null ? '—' : `${sheet.stats.passRate}%`, `${sheet.stats.passed} passed`],
            ].map(([k, v, hint]) => (
              <div key={k as string} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-medium text-slate-500">{k}</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{v}</div>
                {hint && <div className="text-[11px] text-slate-400">{hint}</div>}
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800">Top performers</h4>
              {toppers.length ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {toppers.map((r) => {
                    const Icon = r.rank === 1 ? Trophy : Medal
                    return (
                      <li key={r.studentId} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <Icon className={cn('size-5', r.rank === 1 ? 'text-amber-500' : r.rank === 2 ? 'text-slate-400' : 'text-orange-400')} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-800">{r.name}</div>
                          <div className="text-[11px] text-slate-400">Rank {r.rank} · Roll {r.rollNo || '—'}</div>
                        </div>
                        <div className="text-right text-sm font-bold text-slate-900">{r.percent}%</div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-400">Rankings appear once a student has marks in every paper.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800">Grade distribution</h4>
              <div className="mt-4 flex h-32 items-end gap-2">
                {sheet.stats.gradeDistribution.map((g) => (
                  <div key={g.grade} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-600">{g.count || ''}</span>
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `${(g.count / maxGrade) * 88 + (g.count ? 4 : 0)}px`,
                        background: gradeColor[g.grade] ?? '#94a3b8',
                        opacity: g.count ? 1 : 0.15,
                        minHeight: 2,
                      }}
                      title={`${g.grade}: ${g.count}`}
                    />
                    <span className="text-[10px] font-semibold text-slate-500">{g.grade}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800">Subject summary</h4>
              <ul className="mt-3 flex flex-col gap-2.5">
                {sheet.columns.map((c) => {
                  const s = sheet.columnStats.find((x) => x.id === c.id)
                  return (
                    <li key={c.id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{c.label}</span>
                        <span className="text-slate-500">
                          avg <b className="text-slate-800">{s?.averagePercent ?? '—'}{s?.averagePercent !== null ? '%' : ''}</b> · pass {s?.passRate ?? '—'}{s?.passRate !== null ? '%' : ''}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#FF6B35]" style={{ width: `${s?.averagePercent ?? 0}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-semibold">Rank</th>
                    <th className="px-2 py-3 font-semibold">Student</th>
                    {sheet.columns.map((c) => (
                      <th key={c.id} className="px-2 py-3 text-center font-semibold">
                        {c.label}
                        <div className="font-normal normal-case text-slate-300">/{c.totalMarks}</div>
                      </th>
                    ))}
                    <th className="px-2 py-3 text-right font-semibold">Total</th>
                    <th className="px-2 py-3 text-right font-semibold">%</th>
                    <th className="px-2 py-3 text-center font-semibold">Grade</th>
                    <th className="px-5 py-3 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((r) => (
                    <tr key={r.studentId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-2.5 font-bold text-slate-700">{r.rank ?? '—'}</td>
                      <td className="px-2 py-2.5">
                        <div className="font-semibold text-slate-800">{r.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Roll {r.rollNo || '—'} · {r.studentCode}
                          {r.leftClass && <span className="ml-1 text-amber-600">· moved class</span>}
                        </div>
                      </td>
                      {sheet.columns.map((c) => {
                        const cell = r.cells[c.id]
                        return (
                          <td key={c.id} className="px-2 py-2.5 text-center">
                            {cell === null ? (
                              <span className="text-slate-300">—</span>
                            ) : cell.absent ? (
                              <span className="text-xs font-bold text-slate-400">AB</span>
                            ) : (
                              <span className={cn('font-semibold', cell.passed ? 'text-slate-700' : 'text-rose-600')}>{cell.marks}</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2.5 text-right text-slate-600">{r.obtained}/{r.maxTotal}</td>
                      <td className="px-2 py-2.5 text-right font-semibold text-slate-800">{r.percent ?? '—'}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className="inline-flex min-w-8 justify-center rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: gradeColor[r.grade] ?? '#cbd5e1' }}>
                          {r.grade}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            r.result === 'Pass' && 'bg-emerald-50 text-emerald-700',
                            r.result === 'Fail' && 'bg-rose-50 text-rose-700',
                            r.result === 'Pending' && 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {r.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
