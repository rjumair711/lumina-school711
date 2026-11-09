'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AlertTriangle, Loader2, Search, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getMarksheet,
  saveMarks,
  type Marksheet,
  type SheetKind,
} from '@/app/actions/assessments'
import { gradeFor, round1, summarize } from '@/lib/grades'
import { Modal, inputClass, primaryButton, secondaryButton } from './forms'

type Row = {
  id: string
  name: string
  rollNo: string
  studentCode: string
  marks: string
  absent: boolean
  remarks: string
}

function toRows(sheet: Marksheet): Row[] {
  return sheet.students.map((s) => ({
    id: s.id,
    name: s.name,
    rollNo: s.rollNo,
    studentCode: s.studentCode,
    marks: s.marks === null ? '' : String(s.marks),
    absent: s.absent,
    remarks: s.remarks,
  }))
}

function rowError(row: Row, total: number): string | null {
  if (row.absent || row.marks.trim() === '') return null
  const n = Number(row.marks)
  if (!Number.isFinite(n)) return 'Not a number'
  if (n < 0 || n > total) return `0–${total}`
  if (Math.round(n * 2) !== n * 2) return 'Use .5 steps'
  return null
}

const signature = (rows: Row[]) =>
  JSON.stringify(rows.map((r) => [r.id, r.marks.trim(), r.absent, r.remarks.trim()]))

export function MarksheetModal({
  kind,
  id,
  onClose,
  onSaved,
}: {
  kind: SheetKind
  id: string
  onClose: () => void
  onSaved: () => void
}) {
  const [sheet, setSheet] = useState<Marksheet | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [baseline, setBaseline] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [markCompleted, setMarkCompleted] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [saving, startSaving] = useTransition()
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  const load = useCallback(async () => {
    setLoadError(null)
    const res = await getMarksheet(kind, id)
    if (!res.success) {
      setLoadError(res.error)
      return
    }
    const next = toRows(res.sheet)
    setSheet(res.sheet)
    setRows(next)
    setBaseline(signature(next))
  }, [kind, id])

  useEffect(() => {
    load()
  }, [load])

  const dirty = sheet !== null && signature(rows) !== baseline
  const total = sheet?.totalMarks ?? 0

  const errors = useMemo(() => rows.map((r) => rowError(r, total)), [rows, total])
  const hasErrors = errors.some(Boolean)

  const stats = useMemo(() => {
    if (!sheet) return null
    const marks = rows.map((r) => ({
      isAbsent: r.absent,
      marksObtained: r.absent || r.marks.trim() === '' || rowError(r, total) ? null : Number(r.marks),
    }))
    return summarize(marks, sheet.totalMarks, sheet.passingMarks)
  }, [rows, sheet, total])

  const allEntered = stats !== null && rows.length > 0 && stats.entered === rows.length

  useEffect(() => {
    if (sheet?.kind === 'test') {
      setMarkCompleted(allEntered && sheet.status !== 'Completed')
    }
  }, [allEntered, sheet?.kind, sheet?.status])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row }) =>
          !q ||
          row.name.toLowerCase().includes(q) ||
          row.rollNo.toLowerCase().includes(q) ||
          row.studentCode.toLowerCase().includes(q)
      )
  }, [rows, query])

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const focusRow = (visibleIndex: number) => {
    const target = visible[visibleIndex]
    if (target) {
      const el = inputs.current[target.index]
      el?.focus()
      el?.select()
    }
  }

  const requestClose = () => {
    if (dirty && !saving) setConfirmDiscard(true)
    else onClose()
  }

  const save = () => {
    if (!sheet || hasErrors || saving) return
    startSaving(async () => {
      const res = await saveMarks(
        kind,
        id,
        rows.map((r) => ({
          studentId: r.id,
          marks: r.absent || r.marks.trim() === '' ? null : Number(r.marks),
          absent: r.absent,
          remarks: r.remarks,
        })),
        { markCompleted: kind === 'test' && markCompleted }
      )
      if (res.success) {
        toast.success(`Marks saved for ${res.saved} student${res.saved === 1 ? '' : 's'}`)
        onSaved()
        await load()
      } else {
        toast.error(res.error)
      }
    })
  }

  // Ctrl/Cmd + S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  return (
    <Modal
      size="xl"
      title={sheet ? `Enter marks · ${sheet.title}` : 'Enter marks'}
      description={
        sheet
          ? `${sheet.subtitle} · Out of ${sheet.totalMarks} · Pass mark ${sheet.passMark}`
          : undefined
      }
      onClose={requestClose}
      footer={
        confirmDiscard ? (
          <>
            <span className="mr-auto flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="size-4" /> You have unsaved marks.
            </span>
            <button className={secondaryButton} onClick={() => setConfirmDiscard(false)}>Keep editing</button>
            <button className={cn(primaryButton, 'bg-rose-600 shadow-rose-200 hover:bg-rose-700')} onClick={onClose}>
              Discard changes
            </button>
          </>
        ) : (
          <>
            <span className="mr-auto text-xs text-slate-400">
              {sheet?.lastSavedLabel ? `Last saved ${sheet.lastSavedLabel}` : 'Not saved yet'}
              {dirty && <b className="ml-2 text-amber-600">· Unsaved changes</b>}
            </span>
            {sheet?.kind === 'test' && sheet.status !== 'Completed' && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={markCompleted}
                  onChange={(e) => setMarkCompleted(e.target.checked)}
                  className="size-4 accent-[#FF6B35]"
                />
                Mark test as completed
              </label>
            )}
            <button className={secondaryButton} onClick={requestClose}>Close</button>
            <button
              className={primaryButton}
              onClick={save}
              disabled={!sheet || saving || hasErrors || (!dirty && !markCompleted)}
              title="Ctrl + S"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save marks
            </button>
          </>
        )
      }
    >
      {loadError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-rose-700">
          <AlertTriangle className="size-6" />
          {loadError}
          <button className={secondaryButton} onClick={load}>Retry</button>
        </div>
      ) : !sheet ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Loading class roster…
        </div>
      ) : sheet.students.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          No students are enrolled in this class yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {stats && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                ['Entered', `${stats.entered} / ${rows.length}`],
                ['Average', stats.average === null ? '—' : `${stats.average} (${stats.averagePercent}%)`],
                ['Highest', stats.highest ?? '—'],
                ['Passed', stats.appeared ? `${stats.passed} / ${stats.appeared}` : '—'],
                ['Absent', stats.absent],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-medium text-slate-500">{k}</div>
                  <div className="text-sm font-bold text-slate-900">{v}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or roll no."
                className={cn(inputClass, 'pl-9')}
              />
            </div>
            <button
              className={cn(secondaryButton, 'h-9 text-xs')}
              onClick={() => setRows((prev) => prev.map((r) => (!r.absent && r.marks.trim() === '' ? { ...r, absent: true } : r)))}
            >
              <UserX className="size-3.5" /> Mark blanks absent
            </button>
            <button
              className={cn(secondaryButton, 'h-9 text-xs')}
              onClick={() => setRows((prev) => prev.map((r) => ({ ...r, marks: '', absent: false })))}
            >
              Clear all
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Tip: press <kbd className="rounded bg-slate-100 px-1">Enter</kbd> or <kbd className="rounded bg-slate-100 px-1">↓</kbd> to jump to the next student. Leave marks empty to skip a student.
          </p>

          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-semibold">Roll</th>
                  <th className="px-2 py-2 font-semibold">Student</th>
                  <th className="px-2 py-2 font-semibold">Marks / {sheet.totalMarks}</th>
                  <th className="px-2 py-2 text-center font-semibold">Absent</th>
                  <th className="px-2 py-2 font-semibold">Grade</th>
                  <th className="px-5 py-2 font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ row, index }, vi) => {
                  const err = errors[index]
                  const value = row.absent || row.marks.trim() === '' || err ? null : Number(row.marks)
                  const failed = value !== null && value < sheet.passMark
                  return (
                    <tr key={row.id} className={cn('border-b border-slate-50 last:border-0', row.absent && 'bg-slate-50/70')}>
                      <td className="px-5 py-2 text-xs font-semibold text-slate-500">{row.rollNo || '—'}</td>
                      <td className="px-2 py-2">
                        <div className="font-semibold text-slate-800">{row.name}</div>
                        <div className="text-[11px] text-slate-400">{row.studentCode}</div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          ref={(el) => {
                            inputs.current[index] = el
                          }}
                          inputMode="decimal"
                          aria-label={`Marks for ${row.name}`}
                          aria-invalid={Boolean(err)}
                          value={row.absent ? '' : row.marks}
                          disabled={row.absent}
                          placeholder={row.absent ? 'AB' : '—'}
                          onChange={(e) => update(index, { marks: e.target.value.replace(/[^\d.]/g, '') })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                              e.preventDefault()
                              focusRow(vi + 1)
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              focusRow(vi - 1)
                            }
                          }}
                          className={cn(
                            inputClass,
                            'h-9 w-24 text-center font-semibold',
                            err && 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-100',
                            failed && 'text-rose-600'
                          )}
                        />
                        {err && <div className="mt-0.5 text-[10px] font-semibold text-rose-600">{err}</div>}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${row.name} absent`}
                          checked={row.absent}
                          onChange={(e) => update(index, { absent: e.target.checked })}
                          className="size-4 accent-[#FF6B35]"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={cn(
                            'text-xs font-bold',
                            row.absent ? 'text-slate-400' : failed ? 'text-rose-600' : 'text-slate-700'
                          )}
                        >
                          {row.absent ? 'AB' : value === null ? '—' : gradeFor(round1((value / sheet.totalMarks) * 100))}
                        </span>
                      </td>
                      <td className="px-5 py-2">
                        <input
                          value={row.remarks}
                          maxLength={300}
                          onChange={(e) => update(index, { remarks: e.target.value })}
                          placeholder="Optional"
                          className={cn(inputClass, 'h-9 min-w-[160px]')}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  )
}
