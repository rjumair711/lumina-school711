'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  HardDrive,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  deleteMaterial,
  getMaterialsData,
  setMaterialPublished,
  type MaterialsData,
} from '@/app/actions/materials'
import { MATERIAL_TYPES, PREVIEWABLE, formatBytes } from '@/lib/materials'
import { ConfirmDialog, Modal, inputClass, primaryButton, secondaryButton } from './tests-exams/forms'
import { MaterialForm, type Material } from './study-materials/material-form'
import { FileBadge, fileLabel } from './study-materials/file-badge'

const REFRESH_MS = 30_000

type Dialog =
  | { type: 'form'; material: Material | null }
  | { type: 'preview'; material: Material }
  | { type: 'delete'; material: Material }
  | null

type Sort = 'newest' | 'oldest' | 'downloads' | 'title'

function youtubeId(url: string | null) {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') || u.pathname.match(/\/(shorts|embed)\/([\w-]+)/)?.[2] || null
    }
  } catch {
    /* invalid */
  }
  return null
}

const canPreview = (m: Material) =>
  (m.fileName && m.mimeType && PREVIEWABLE.has(m.mimeType)) || (!m.fileName && youtubeId(m.link))

function Preview({ material, onClose }: { material: Material; onClose: () => void }) {
  const src = `/api/materials/${material.id}?inline=1`
  const yt = !material.fileName ? youtubeId(material.link) : null
  const isImage = material.mimeType?.startsWith('image/')

  return (
    <Modal
      size="xl"
      title={material.title}
      description={`${material.subjectName} · Class ${material.className}${material.fileName ? ` · ${material.fileName}` : ''}`}
      onClose={onClose}
      footer={
        <>
          <button className={secondaryButton} onClick={onClose}>Close</button>
          <a href={`/api/materials/${material.id}`} className={primaryButton} target={material.fileName ? undefined : '_blank'} rel="noopener noreferrer">
            {material.fileName ? <><Download className="size-4" /> Download</> : <><ExternalLink className="size-4" /> Open link</>}
          </a>
        </>
      }
    >
      <div className="flex min-h-[60vh] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
        {yt ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`}
            title={material.title}
            className="aspect-video w-full"
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={material.title} className="max-h-[70vh] max-w-full object-contain" />
        ) : (
          <iframe src={src} title={material.title} className="h-[70vh] w-full bg-white" />
        )}
      </div>
    </Modal>
  )
}

export default function StudyMaterialsPage({ initialData }: { initialData: MaterialsData }) {
  const router = useRouter()
  const [data, setData] = useState(initialData)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [classId, setClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [type, setType] = useState('All')
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  // Remember the preferred layout for this browser.
  useEffect(() => {
    try {
      const v = localStorage.getItem('lumina.materials.view')
      if (v === 'grid' || v === 'list') setView(v)
    } catch {
      /* storage unavailable */
    }
  }, [])
  const changeView = (v: 'grid' | 'list') => {
    setView(v)
    try {
      localStorage.setItem('lumina.materials.view', v)
    } catch {
      /* storage unavailable */
    }
  }

  const reqId = useRef(0)
  const dialogOpen = useRef(false)
  dialogOpen.current = dialog !== null && dialog.type !== 'preview'

  const reload = useCallback(
    async (silent = false) => {
      const id = ++reqId.current
      if (!silent) setRefreshing(true)
      try {
        const res = await getMaterialsData()
        if (id !== reqId.current) return
        if (res.success) setData(res.data)
        else if (res.unauthorized) router.replace('/')
        else if (!silent) toast.error(res.error)
      } finally {
        if (id === reqId.current) setRefreshing(false)
      }
    },
    [router]
  )

  useEffect(() => {
    const tick = () => document.visibilityState === 'visible' && !dialogOpen.current && reload(true)
    const interval = window.setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [reload])

  // Downloads are counted on the server; refresh shortly after one starts.
  const onDownload = () => window.setTimeout(() => reload(true), 1500)

  const togglePublished = async (m: Material) => {
    const res = await setMaterialPublished(m.id, !m.isPublished)
    if (res.success) {
      toast.success(m.isPublished ? 'Moved to drafts' : 'Published')
      reload(true)
    } else toast.error(res.error)
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = data.materials.filter((m) => {
      if (classId && m.classId !== classId) return false
      if (subjectId && m.subjectId !== subjectId) return false
      if (type !== 'All' && m.type !== type) return false
      if (status === 'published' && !m.isPublished) return false
      if (status === 'draft' && m.isPublished) return false
      if (q && !`${m.title} ${m.subjectName} ${m.className} ${m.teacherName ?? ''} ${m.description}`.toLowerCase().includes(q)) return false
      return true
    })
    const sorted = [...list]
    if (sort === 'oldest') sorted.reverse()
    if (sort === 'downloads') sorted.sort((a, b) => b.downloads - a.downloads)
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [data.materials, query, classId, subjectId, type, status, sort])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: data.materials.length }
    for (const m of data.materials) counts[m.type] = (counts[m.type] ?? 0) + 1
    return counts
  }, [data.materials])

  const filtersActive = Boolean(query || classId || subjectId || type !== 'All' || status !== 'all')
  const clearFilters = () => {
    setQuery('')
    setClassId('')
    setSubjectId('')
    setType('All')
    setStatus('all')
  }

  // Classes with no materials yet, to nudge teachers/admins.
  const emptyClasses = data.classes.filter((c) => (data.subjectsByClass[c.id]?.length ?? 0) > 0 && !data.materials.some((m) => m.classId === c.id))

  const s = data.stats

  const actions = (m: Material, compact = false) => (
    <div className={cn('flex items-center gap-1', !compact && 'mt-4 grid grid-cols-2 gap-2')}>
      {compact ? (
        <>
          {canPreview(m) && (
            <button aria-label="Preview" title="Preview" onClick={() => setDialog({ type: 'preview', material: m })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <Eye className="size-4" />
            </button>
          )}
          <a aria-label="Download" title={m.fileName ? 'Download' : 'Open link'} href={`/api/materials/${m.id}`} onClick={onDownload} target={m.fileName ? undefined : '_blank'} rel="noopener noreferrer" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            {m.fileName ? <Download className="size-4" /> : <ExternalLink className="size-4" />}
          </a>
        </>
      ) : (
        <>
          <button
            onClick={() => setDialog({ type: 'preview', material: m })}
            disabled={!canPreview(m)}
            title={canPreview(m) ? 'Preview' : 'Preview is not available for this file type'}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eye className="size-3.5" /> Preview
          </button>
          <a
            href={`/api/materials/${m.id}`}
            onClick={onDownload}
            target={m.fileName ? undefined : '_blank'}
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#FF6B35] text-xs font-semibold text-white hover:bg-[#e95b29]"
          >
            {m.fileName ? <><Download className="size-3.5" /> Download</> : <><ExternalLink className="size-3.5" /> Open link</>}
          </a>
        </>
      )}
    </div>
  )

  const menu = (m: Material) => (
    <div className="flex shrink-0 items-center">
      <button aria-label={m.isPublished ? 'Move to drafts' : 'Publish'} title={m.isPublished ? 'Move to drafts' : 'Publish'} onClick={() => togglePublished(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        {m.isPublished ? <EyeOff className="size-4" /> : <Sparkles className="size-4" />}
      </button>
      <button aria-label="Edit" title="Edit" onClick={() => setDialog({ type: 'form', material: m })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <Pencil className="size-4" />
      </button>
      <button aria-label="Delete" title="Delete" onClick={() => setDialog({ type: 'delete', material: m })} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
        <Trash2 className="size-4" />
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Study Materials</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {s.total} resource{s.total === 1 ? '' : 's'} · updated {data.generatedLabel}
          </p>
        </div>
        <div className="flex gap-2">
          <button className={secondaryButton} onClick={() => reload()} disabled={refreshing}>
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} /> Refresh
          </button>
          <button className={primaryButton} onClick={() => setDialog({ type: 'form', material: null })} disabled={!data.classes.length}>
            <Plus className="size-4" /> Upload material
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Materials', String(s.total), `${s.published} published · ${s.total - s.published} draft`, FolderOpen, 'bg-orange-50 text-[#FF6B35]'],
          ['Downloads', s.downloads.toLocaleString('en-IN'), 'All time', Download, 'bg-emerald-50 text-emerald-600'],
          ['Added this month', String(s.thisMonth), 'New uploads and links', Plus, 'bg-sky-50 text-sky-600'],
          ['Storage used', formatBytes(s.storageBytes) || '0 KB', 'Uploaded files', HardDrive, 'bg-violet-50 text-violet-600'],
        ].map(([label, value, hint, Icon, tone]) => {
          const I = Icon as typeof FolderOpen
          return (
            <div key={label as string} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <div className="text-xs font-medium text-slate-500">{label as string}</div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value as string}</div>
                <div className="mt-1 text-xs text-slate-400">{hint as string}</div>
              </div>
              <div className={cn('flex size-10 items-center justify-center rounded-xl', tone as string)}>
                <I className="size-5" />
              </div>
            </div>
          )
        })}
      </div>

      {emptyClasses.length > 0 && data.materials.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <TrendingDown className="size-4 shrink-0" />
          No materials yet for {emptyClasses.slice(0, 5).map((c) => `Class ${c.name}`).join(', ')}
          {emptyClasses.length > 5 && ` and ${emptyClasses.length - 5} more`}.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, subject, teacher…" className={cn(inputClass, 'pl-9')} />
          </div>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass} aria-label="Class">
            <option value="">All classes</option>
            {data.classes.map((c) => <option key={c.id} value={c.id}>Class {c.name}</option>)}
          </select>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputClass} aria-label="Subject">
            <option value="">All subjects</option>
            {data.subjects.map((sub) => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputClass} aria-label="Status">
            <option value="all">Published &amp; drafts</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={inputClass} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="downloads">Most downloaded</option>
            <option value="title">Title A–Z</option>
          </select>
          <div className="flex rounded-xl border border-slate-200 p-0.5">
            {([['grid', LayoutGrid], ['list', List]] as const).map(([v, Icon]) => (
              <button key={v} aria-label={`${v} view`} onClick={() => changeView(v)} className={cn('flex size-9 items-center justify-center rounded-lg', view === v ? 'bg-orange-50 text-[#FF6B35]' : 'text-slate-400 hover:text-slate-700')}>
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['All', ...MATERIAL_TYPES].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                type === t ? 'border-[#FF6B35] bg-[#FF6B35] text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:text-[#FF6B35]'
              )}
            >
              {t} <span className={cn('ml-0.5', type === t ? 'text-white/80' : 'text-slate-300')}>{typeCounts[t] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {data.materials.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <FolderOpen className="size-8 text-slate-300" />
          <div className="text-sm font-semibold text-slate-700">No study materials yet</div>
          <p className="max-w-sm text-xs text-slate-400">Upload notes, worksheets or past papers, or share a Google Drive or YouTube link with a class.</p>
          <button className={cn(primaryButton, 'mt-2')} onClick={() => setDialog({ type: 'form', material: null })} disabled={!data.classes.length}>
            <Plus className="size-4" /> Upload the first material
          </button>
          {!data.classes.length && <p className="text-[11px] text-amber-700">Create a class first.</p>}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Search className="size-6 text-slate-300" />
          <div className="text-sm font-semibold text-slate-600">No materials match these filters</div>
          {filtersActive && <button className={secondaryButton} onClick={clearFilters}>Clear filters</button>}
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((m) => (
            <article key={m.id} className={cn('flex flex-col rounded-2xl border bg-white p-5 shadow-sm', m.isPublished ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/50')}>
              <div className="flex items-start gap-3">
                <FileBadge mime={m.mimeType} link={Boolean(m.link)} />
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">{m.title}</h2>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {m.teacherName ?? m.uploadedBy ?? 'School'} · {m.dateLabel}
                  </div>
                </div>
                {menu(m)}
              </div>
              {m.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{m.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {!m.isPublished && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Draft</span>}
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#d95324]">{m.type}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{m.subjectName}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Class {m.className}</span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-slate-400">
                <span>{m.fileName ? `${fileLabel(m.mimeType)} · ${formatBytes(m.fileSize)}` : 'External link'}</span>
                <span>{m.downloads} download{m.downloads === 1 ? '' : 's'}</span>
              </div>
              {actions(m)}
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Material</th>
                  <th className="px-2 py-3 font-semibold">Class · Subject</th>
                  <th className="px-2 py-3 font-semibold">Type</th>
                  <th className="px-2 py-3 font-semibold">Added</th>
                  <th className="px-2 py-3 text-right font-semibold">Downloads</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <FileBadge mime={m.mimeType} link={Boolean(m.link)} className="size-9" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-slate-800">{m.title}</span>
                            {!m.isPublished && <span className="rounded-full bg-slate-200 px-1.5 py-px text-[10px] font-semibold text-slate-600">Draft</span>}
                          </div>
                          <div className="text-[11px] text-slate-400">{m.fileName ? `${m.fileName} · ${formatBytes(m.fileSize)}` : 'External link'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-slate-600">
                      Class {m.className}
                      <div className="text-[11px] text-slate-400">{m.subjectName}{m.teacherName && ` · ${m.teacherName}`}</div>
                    </td>
                    <td className="px-2 py-3 text-slate-600">{m.type}</td>
                    <td className="px-2 py-3 text-slate-600">{m.dateLabel}</td>
                    <td className="px-2 py-3 text-right font-semibold text-slate-700">{m.downloads}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        {actions(m, true)}
                        {menu(m)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
            Showing {visible.length} of {data.materials.length}
          </div>
        </div>
      )}

      {dialog?.type === 'form' && (
        <MaterialForm data={data} material={dialog.material} onClose={() => setDialog(null)} onSaved={() => reload(true)} />
      )}
      {dialog?.type === 'preview' && <Preview material={dialog.material} onClose={() => setDialog(null)} />}
      {dialog?.type === 'delete' && (
        <ConfirmDialog
          title="Delete material?"
          message={`"${dialog.material.title}"${dialog.material.fileName ? ' and its file' : ''} will be permanently deleted.`}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const res = await deleteMaterial(dialog.material.id)
            if (res.success) {
              toast.success('Material deleted')
              reload(true)
              return true
            }
            toast.error(res.error)
            return false
          }}
        />
      )}
    </div>
  )
}
