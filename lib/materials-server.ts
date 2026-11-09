import prisma from '@/lib/prisma'
import {
  ALLOWED_FILES,
  MATERIAL_TYPES,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  extensionOf,
  signatureMatches,
} from '@/lib/materials'

export class MaterialInputError extends Error {}

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim()

export type ParsedMaterial = {
  data: {
    title: string
    type: string
    description: string | null
    classId: string
    subjectId: string
    teacherId: string | null
    isPublished: boolean
    fileUrl: string | null
  }
  file: { name: string; mime: string; bytes: Uint8Array<ArrayBuffer> } | null
  removeFile: boolean
}

// Validates an upload/edit form. Every id is checked against the school.
export async function parseMaterialForm(
  form: FormData,
  schoolId: string,
  opts: { hasExistingFile: boolean }
): Promise<ParsedMaterial> {
  const title = text(form, 'title')
  if (!title || title.length > 200) throw new MaterialInputError('Title must be 1–200 characters.')

  const type = text(form, 'type')
  if (!(MATERIAL_TYPES as readonly string[]).includes(type)) throw new MaterialInputError('Choose a material type.')

  const description = text(form, 'description')
  if (description.length > 2000) throw new MaterialInputError('Description is too long (max 2000 characters).')

  const classId = text(form, 'classId')
  const subjectId = text(form, 'subjectId')
  const teacherIdRaw = text(form, 'teacherId')

  const [cls, assignment, teacher] = await Promise.all([
    prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } }),
    prisma.classSubjectAssignment.findFirst({
      where: { schoolId, classId, subjectId, subject: { schoolId } },
      select: { teacherId: true },
    }),
    teacherIdRaw && teacherIdRaw !== 'none'
      ? prisma.teacher.findFirst({ where: { id: teacherIdRaw, schoolId }, select: { id: true } })
      : Promise.resolve(null),
  ])

  if (!cls) throw new MaterialInputError('Class not found in your school.')
  if (!assignment) {
    throw new MaterialInputError('This subject is not assigned to the class. Assign it on the Subject & Class page first.')
  }
  if (teacherIdRaw && teacherIdRaw !== 'none' && !teacher) throw new MaterialInputError('Teacher not found in your school.')

  // Link
  let fileUrl: string | null = null
  const link = text(form, 'link')
  if (link) {
    try {
      const url = new URL(link)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error()
      fileUrl = url.toString()
    } catch {
      throw new MaterialInputError('Enter a valid link starting with https://')
    }
    if (fileUrl.length > 2000) throw new MaterialInputError('Link is too long.')
  }

  // File
  let file: ParsedMaterial['file'] = null
  const entry = form.get('file')
  if (entry && typeof entry !== 'string' && entry.size > 0) {
    if (entry.size > MAX_FILE_BYTES) throw new MaterialInputError(`Files can be at most ${MAX_FILE_MB} MB.`)
    const name = entry.name.replace(/[\\/\r\n"]/g, '_').slice(0, 200) || 'file'
    const ext = extensionOf(name)
    const mime = ALLOWED_FILES[ext]
    if (!mime) throw new MaterialInputError('This file type is not allowed. Use PDF, Word, PowerPoint, Excel, text or image files.')
    const bytes = new Uint8Array(await entry.arrayBuffer())
    if (!signatureMatches(ext, bytes)) {
      throw new MaterialInputError(`The file does not look like a real .${ext} file.`)
    }
    file = { name, mime, bytes }
  }

  const removeFile = text(form, 'removeFile') === '1'
  const willHaveFile = Boolean(file) || (opts.hasExistingFile && !removeFile)
  if (!willHaveFile && !fileUrl) throw new MaterialInputError('Upload a file or add a link.')

  return {
    data: {
      title,
      type,
      description: description || null,
      classId,
      subjectId,
      // '' = use the teacher assigned to this subject; 'none' = no teacher credited.
      teacherId: teacherIdRaw === 'none' ? null : teacher?.id ?? assignment.teacherId ?? null,
      isPublished: text(form, 'published') !== '0',
      fileUrl,
    },
    file,
    removeFile,
  }
}
