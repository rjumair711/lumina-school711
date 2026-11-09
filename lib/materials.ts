// Shared study-material rules (server and client).

export const MATERIAL_TYPES = [
  'Notes',
  'Worksheet',
  'Question Paper',
  'Presentation',
  'Reference Book',
  'Video',
  'Other',
] as const

export const MAX_FILE_MB = 10
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

// Extension → MIME type. Anything else is rejected (no SVG/HTML/scripts,
// which could run code in the browser when previewed).
export const ALLOWED_FILES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

export const ACCEPT_ATTR = Object.keys(ALLOWED_FILES).map((e) => `.${e}`).join(',')

export function extensionOf(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name)
  return m ? m[1].toLowerCase() : ''
}

export type FileKind = 'pdf' | 'doc' | 'slides' | 'sheet' | 'image' | 'text' | 'link' | 'none'

export function fileKind(mime: string | null | undefined, hasLink = false): FileKind {
  if (!mime) return hasLink ? 'link' : 'none'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slides'
  if (mime.includes('sheet') || mime.includes('excel') || mime === 'text/csv') return 'sheet'
  if (mime.startsWith('text/')) return 'text'
  return 'doc'
}

// Shown inline in the browser; everything else downloads.
export const PREVIEWABLE = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain', 'text/csv'])

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// File signatures for formats we can check cheaply.
export function signatureMatches(ext: string, bytes: Uint8Array) {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b)
  switch (ext) {
    case 'pdf': return starts(0x25, 0x50, 0x44, 0x46) // %PDF
    case 'png': return starts(0x89, 0x50, 0x4e, 0x47)
    case 'jpg':
    case 'jpeg': return starts(0xff, 0xd8, 0xff)
    case 'gif': return starts(0x47, 0x49, 0x46, 0x38)
    case 'webp': return starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45
    case 'docx':
    case 'pptx':
    case 'xlsx': return starts(0x50, 0x4b, 0x03, 0x04) // zip container
    case 'doc':
    case 'ppt':
    case 'xls': return starts(0xd0, 0xcf, 0x11, 0xe0) // OLE container
    default: return true // txt / csv
  }
}
