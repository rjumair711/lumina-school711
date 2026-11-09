import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'
import { MaterialInputError, parseMaterialForm } from '@/lib/materials-server'
import { PREVIEWABLE } from '@/lib/materials'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

async function admin() {
  try {
    return { admin: await requireSchoolAdmin() }
  } catch (error) {
    return { error: Response.json({ error: accessErrorMessage(error) ?? 'Unauthorized' }, { status: 401 }) }
  }
}

// Download (default) or preview (?inline=1) the stored file.
export async function GET(request: Request, { params }: Ctx) {
  const auth = await admin()
  if (auth.error) return auth.error
  const { id } = await params
  const inline = new URL(request.url).searchParams.get('inline') === '1'

  const material = await prisma.studyMaterial.findFirst({
    where: { id, schoolId: auth.admin.schoolId },
    select: { id: true, fileName: true, mimeType: true, fileUrl: true, file: { select: { data: true } } },
  })
  if (!material) return Response.json({ error: 'Not found' }, { status: 404 })

  if (!material.file) {
    if (material.fileUrl) {
      if (!inline) await prisma.studyMaterial.update({ where: { id }, data: { downloads: { increment: 1 } } })
      return Response.redirect(material.fileUrl, 302)
    }
    return Response.json({ error: 'No file attached' }, { status: 404 })
  }

  if (!inline) {
    await prisma.studyMaterial.update({ where: { id }, data: { downloads: { increment: 1 } } })
  }

  const mime = material.mimeType || 'application/octet-stream'
  const showInline = inline && PREVIEWABLE.has(mime)
  const name = material.fileName || 'download'
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')

  return new Response(new Uint8Array(material.file.data), {
    headers: {
      'Content-Type': mime === 'text/plain' || mime === 'text/csv' ? `${mime}; charset=utf-8` : mime,
      'Content-Length': String(material.file.data.length),
      'Content-Disposition': `${showInline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      // Only safe types are accepted (no HTML/SVG); a sandbox CSP is added on top,
      // except for PDFs where it would block the browser's built-in viewer.
      ...(mime === 'application/pdf'
        ? {}
        : { 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" }),
    },
  })
}

// Update metadata, replace or remove the file (multipart form).
export async function POST(request: Request, { params }: Ctx) {
  const auth = await admin()
  if (auth.error) return auth.error
  const { id } = await params

  const existing = await prisma.studyMaterial.findFirst({
    where: { id, schoolId: auth.admin.schoolId },
    select: { id: true, fileName: true },
  })
  if (!existing) return Response.json({ error: 'Material not found.' }, { status: 404 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'Upload failed. The file may be too large.' }, { status: 400 })
  }

  try {
    const parsed = await parseMaterialForm(form, auth.admin.schoolId, { hasExistingFile: Boolean(existing.fileName) })

    await prisma.$transaction(async (tx) => {
      await tx.studyMaterial.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(parsed.file
            ? { fileName: parsed.file.name, fileSize: parsed.file.bytes.length, mimeType: parsed.file.mime }
            : parsed.removeFile
              ? { fileName: null, fileSize: null, mimeType: null }
              : {}),
        },
      })

      if (parsed.file) {
        await tx.studyMaterialFile.upsert({
          where: { materialId: id },
          create: { materialId: id, data: parsed.file.bytes },
          update: { data: parsed.file.bytes, createdAt: new Date() },
        })
      } else if (parsed.removeFile) {
        await tx.studyMaterialFile.deleteMany({ where: { materialId: id } })
      }
    })

    revalidatePath('/admin/study-materials')
    return Response.json({ id })
  } catch (error) {
    if (error instanceof MaterialInputError) return Response.json({ error: error.message }, { status: 400 })
    console.error('[Materials] update failed', error)
    return Response.json({ error: 'Could not update the material.' }, { status: 500 })
  }
}
