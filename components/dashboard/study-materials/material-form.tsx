'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, FileUp, Link2, Loader2, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { MaterialsData } from '@/app/actions/materials'
import {
  ACCEPT_ATTR,
  ALLOWED_FILES,
  MATERIAL_TYPES,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  extensionOf,
  formatBytes,
} from '@/lib/materials'
import { Modal, inputClass, labelClass, primaryButton, secondaryButton } from '../tests-exams/forms'
import { FileBadge } from './file-badge'

export type Material = MaterialsData['materials'][number]

// XHR (not fetch) so we can show upload progress.
function sendForm(url: string, form: FormData, onProgress: (pct: number) => void) {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      let body: { error?: string } = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        /* empty */
      }
      resolve(xhr.status >= 200 && xhr.status < 300 ? { ok: true } : { ok: false, error: body.error || `Upload failed (${xhr.status}).` })
    }
    xhr.onerror = () => resolve({ ok: false, error: 'Network error. Check your connection and try again.' })
    xhr.send(form)
  })
}

function titleFromFile(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

function guessType(name: string, link: string) {
  const ext = extensionOf(name)
  if (/youtu\.?be|vimeo/i.test(link)) return 'Video'
  if (ext === 'ppt' || ext === 'pptx') return 'Presentation'
  if (/paper|exam|question/i.test(name)) return 'Question Paper'
  if (/worksheet|practice|exercise/i.test(name)) return 'Worksheet'
  return 'Notes'
}

function checkFile(file: File): string | null {
  if (!ALLOWED_FILES[extensionOf(file.name)]) return 'This file type is not allowed. Use PDF, Word, PowerPoint, Excel, text or image files.'
  if (file.size > MAX_FILE_BYTES) return `This file is ${formatBytes(file.size)}. The limit is ${MAX_FILE_MB} MB.`
  if (file.size === 0) return 'This file is empty.'
  return null
}

export function MaterialForm({
  data,
  material,
  onClose,
  onSaved,
}: {
  data: MaterialsData
  material: Material | null
  onClose: () => void
  onSaved: () => void
}) {
  const editing = Boolean(material)
  const [mode, setMode] = useState<'file' | 'link'>(material && !material.fileName && material.link ? 'link' : 'file')
  const [file, setFile] = useState<File | null>(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [form, setForm] = useState({
    title: material?.title ?? '',
    type: material?.type ?? 'Notes',
    description: material?.description ?? '',
    classId: material?.classId ?? data.classes[0]?.id ?? '',
    subjectId: material?.subjectId ?? '',
    teacherId: material ? material.teacherId ?? 'none' : '',
    link: material?.link ?? '',
    published: material?.isPublished ?? true,
  })
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const subjects = data.subjectsByClass[form.classId] ?? []
  const assigned = subjects.find((s) => s.id === form.subjectId)
  const assignedTeacher = data.teachers.find((t) => t.id === assigned?.teacherId)
  const busy = progress !== null

  const subjectId = useMemo(
    () => (subjects.some((s) => s.id === form.subjectId) ? form.subjectId : subjects[0]?.id ?? ''),
    [subjects, form.subjectId]
  )

  const pick = (f: File | undefined) => {
    if (!f) return
    const problem = checkFile(f)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setFile(f)
    setRemoveFile(false)
    setForm((prev) => ({
      ...prev,
      title: prev.title || titleFromFile(f.name),
      type: prev.title ? prev.type : guessType(f.name, prev.link),
    }))
  }

  const hasFileAfterSave = mode === 'file' && (Boolean(file) || (Boolean(material?.fileName) && !removeFile))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (mode === 'file' && !hasFileAfterSave) return setError('Choose a file to upload.')
    if (mode === 'link' && !form.link.trim()) return setError('Paste a link.')

    const body = new FormData()
    body.set('title', form.title)
    body.set('type', form.type)
    body.set('description', form.description)
    body.set('classId', form.classId)
    body.set('subjectId', subjectId)
    body.set('teacherId', form.teacherId)
    body.set('published', form.published ? '1' : '0')
    body.set('link', mode === 'link' ? form.link.trim() : '')
    if (mode === 'file' && file) body.set('file', file)
    if (editing && (mode === 'link' || removeFile) && material?.fileName) body.set('removeFile', '1')

    setProgress(0)
    const res = await sendForm(editing ? `/api/materials/${material!.id}` : '/api/materials', body, setProgress)
    setProgress(null)

    if (res.ok) {
      toast.success(editing ? 'Material updated' : 'Material uploaded')
      onSaved()
      onClose()
    } else {
      setError(res.error ?? 'Upload failed.')
    }
  }

  return (
    <Modal
      size="lg"
      title={editing ? 'Edit material' : 'Upload study material'}
      description="Share notes, worksheets, papers or links with a class."
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button type="button" className={secondaryButton} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" form="material-form" className={primaryButton} disabled={busy || !subjects.length}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            {busy ? `Uploading ${progress}%` : editing ? 'Save changes' : 'Upload'}
          </button>
        </>
      }
    >
      <form id="material-form" onSubmit={submit} className="flex flex-col gap-4">
        {/* Source */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {([
            ['file', 'Upload a file', UploadCloud],
            ['link', 'Add a link', Link2],
          ] as const).map(([value, text, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn('flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold', mode === value ? 'bg-white text-[#FF6B35] shadow-sm' : 'text-slate-500')}
            >
              <Icon className="size-4" /> {text}
            </button>
          ))}
        </div>

        {mode === 'file' ? (
          file || (material?.fileName && !removeFile) ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <FileBadge mime={file ? ALLOWED_FILES[extensionOf(file.name)] : material?.mimeType} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{file?.name ?? material?.fileName}</div>
                <div className="text-[11px] text-slate-500">{formatBytes(file?.size ?? material?.fileSize)}{!file && ' · current file'}</div>
              </div>
              <button type="button" className="text-xs font-semibold text-[#FF6B35] hover:underline" onClick={() => inputRef.current?.click()}>
                Replace
              </button>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => (file ? setFile(null) : setRemoveFile(true))}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                pick(e.dataTransfer.files?.[0])
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition',
                dragOver ? 'border-[#FF6B35] bg-orange-50' : 'border-slate-200 hover:border-orange-200 hover:bg-orange-50/40'
              )}
            >
              <UploadCloud className="size-8 text-[#FF6B35]" />
              <span className="text-sm font-semibold text-slate-700">Drop a file here or click to browse</span>
              <span className="text-[11px] text-slate-400">PDF, Word, PowerPoint, Excel, text or images · up to {MAX_FILE_MB} MB</span>
            </button>
          )
        ) : (
          <label className={labelClass}>
            Link *
            <input
              type="url"
              value={form.link}
              onChange={(e) => set({ link: e.target.value, type: /youtu\.?be|vimeo/i.test(e.target.value) && !editing ? 'Video' : form.type })}
              placeholder="https://drive.google.com/… or https://youtube.com/…"
              className={inputClass}
            />
            <span className="font-normal text-slate-400">Make sure the link is shared so students can open it.</span>
          </label>
        )}
        <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />

        <label className={labelClass}>
          Title *
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} required maxLength={200} placeholder="e.g. Algebra – Chapter 3 notes" className={inputClass} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Class *
            <select value={form.classId} onChange={(e) => set({ classId: e.target.value, subjectId: '', teacherId: editing ? form.teacherId : '' })} className={inputClass}>
              {data.classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Subject *
            <select value={subjectId} onChange={(e) => set({ subjectId: e.target.value })} className={inputClass} disabled={!subjects.length}>
              {!subjects.length && <option value="">No subjects assigned</option>}
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {!subjects.length && (
              <span className="font-normal text-amber-700">
                Assign subjects to this class on the <Link href="/admin/subject-class" className="font-semibold underline">Subject &amp; Class</Link> page first.
              </span>
            )}
          </label>
          <label className={labelClass}>
            Type *
            <select value={form.type} onChange={(e) => set({ type: e.target.value })} className={inputClass}>
              {MATERIAL_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Teacher
            <select value={form.teacherId} onChange={(e) => set({ teacherId: e.target.value })} className={inputClass}>
              <option value="">Subject teacher{assignedTeacher ? ` (${assignedTeacher.name})` : ''}</option>
              <option value="none">No teacher</option>
              {data.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>

        <label className={labelClass}>
          Description
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={3} maxLength={2000} placeholder="What does it cover? Any instructions for students?" className={cn(inputClass, 'h-auto py-2')} />
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={form.published} onChange={(e) => set({ published: e.target.checked })} className="size-4 accent-[#FF6B35]" />
          Published (uncheck to keep as a draft)
        </label>

        {busy && (
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#FF6B35] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {error}
          </div>
        )}
      </form>
    </Modal>
  )
}
