import { FileImage, FileSpreadsheet, FileText, Link2, Presentation, FileType2, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fileKind } from '@/lib/materials'

const STYLE = {
  pdf: { icon: FileText, cls: 'bg-rose-50 text-rose-600', label: 'PDF' },
  doc: { icon: FileType2, cls: 'bg-blue-50 text-blue-600', label: 'DOC' },
  slides: { icon: Presentation, cls: 'bg-orange-50 text-[#FF6B35]', label: 'PPT' },
  sheet: { icon: FileSpreadsheet, cls: 'bg-emerald-50 text-emerald-600', label: 'XLS' },
  image: { icon: FileImage, cls: 'bg-violet-50 text-violet-600', label: 'IMG' },
  text: { icon: FileText, cls: 'bg-slate-100 text-slate-600', label: 'TXT' },
  link: { icon: Link2, cls: 'bg-sky-50 text-sky-600', label: 'LINK' },
  none: { icon: File, cls: 'bg-slate-100 text-slate-400', label: '' },
} as const

export function FileBadge({ mime, link, className }: { mime?: string | null; link?: boolean; className?: string }) {
  const s = STYLE[fileKind(mime, link)]
  const Icon = s.icon
  return (
    <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', s.cls, className)} title={s.label}>
      <Icon className="size-5" />
    </div>
  )
}

export function fileLabel(mime?: string | null, link?: boolean) {
  return STYLE[fileKind(mime, link)].label
}
