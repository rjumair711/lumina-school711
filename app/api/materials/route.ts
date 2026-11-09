import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'
import { MaterialInputError, parseMaterialForm } from '@/lib/materials-server'

export const dynamic = 'force-dynamic'

// Create a study material (multipart form: fields + optional file).
export async function POST(request: Request) {
  let admin
  try {
    admin = await requireSchoolAdmin()
  } catch (error) {
    return Response.json({ error: accessErrorMessage(error) ?? 'Unauthorized' }, { status: 401 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'Upload failed. The file may be too large.' }, { status: 400 })
  }

  try {
    const parsed = await parseMaterialForm(form, admin.schoolId, { hasExistingFile: false })

    const material = await prisma.studyMaterial.create({
      data: {
        ...parsed.data,
        schoolId: admin.schoolId,
        uploadedByName: admin.name,
        ...(parsed.file
          ? {
              fileName: parsed.file.name,
              fileSize: parsed.file.bytes.length,
              mimeType: parsed.file.mime,
              file: { create: { data: parsed.file.bytes } },
            }
          : {}),
      },
      select: { id: true },
    })

    revalidatePath('/admin/study-materials')
    return Response.json({ id: material.id }, { status: 201 })
  } catch (error) {
    if (error instanceof MaterialInputError) return Response.json({ error: error.message }, { status: 400 })
    console.error('[Materials] create failed', error)
    return Response.json({ error: 'Could not save the material.' }, { status: 500 })
  }
}
