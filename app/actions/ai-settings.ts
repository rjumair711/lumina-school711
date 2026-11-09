'use server'

import { revalidatePath } from 'next/cache'
import { formatDistanceToNowStrict } from 'date-fns'
import prisma from '@/lib/prisma'
import { accessErrorMessage, requireSchoolAdmin } from '@/lib/school-auth'
import { decryptSecret, encryptSecret } from '@/lib/ai/crypto'
import { PROVIDER_BY_ID } from '@/lib/ai/provider-catalog'
import { describeProviderError, streamChat } from '@/lib/ai/providers'
import type { AiConfig } from '@/lib/ai/config'

export type AiSettingsView = {
  source: 'school' | 'env' | 'none'
  provider: string
  model: string
  baseUrl: string
  hasKey: boolean
  keyHint: string | null
  enabled: boolean
  updatedLabel: string | null
}

export type AiSettingsInput = {
  provider: string
  model: string
  baseUrl?: string
  // Blank keeps the stored key (same provider only).
  apiKey?: string
  enabled?: boolean
}

type Result<T = object> = ({ success: true } & T) | { success: false; error: string; unauthorized?: boolean }

class InputError extends Error {}

function fail(error: unknown): { success: false; error: string; unauthorized?: boolean } {
  const access = accessErrorMessage(error)
  if (access) return { success: false, error: access, unauthorized: true }
  if (error instanceof InputError) return { success: false, error: error.message }
  console.error('[AI settings]', error)
  return { success: false, error: 'Unable to update AI settings.' }
}

export async function getAiSettingsView(): Promise<Result<{ settings: AiSettingsView }>> {
  try {
    const { schoolId } = await requireSchoolAdmin()
    return { success: true, settings: await loadView(schoolId) }
  } catch (error) {
    return fail(error)
  }
}

async function loadView(schoolId: string): Promise<AiSettingsView> {
  const row = await prisma.aiSettings.findUnique({ where: { schoolId } })
  if (row) {
    return {
      source: 'school',
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl ?? '',
      hasKey: Boolean(row.apiKeyCipher),
      keyHint: row.apiKeyHint,
      enabled: row.enabled,
      updatedLabel: `${formatDistanceToNowStrict(row.updatedAt, { addSuffix: true })}${row.updatedByName ? ` by ${row.updatedByName}` : ''}`,
    }
  }
  if (process.env.AI_PROVIDER && process.env.AI_MODEL && PROVIDER_BY_ID.has(process.env.AI_PROVIDER)) {
    return {
      source: 'env',
      provider: process.env.AI_PROVIDER,
      model: process.env.AI_MODEL,
      baseUrl: process.env.AI_BASE_URL ?? '',
      hasKey: Boolean(process.env.AI_API_KEY),
      keyHint: null,
      enabled: true,
      updatedLabel: 'Set in server environment',
    }
  }
  return { source: 'none', provider: '', model: '', baseUrl: '', hasKey: false, keyHint: null, enabled: false, updatedLabel: null }
}

// Validates the form and resolves which key to use.
async function resolve(schoolId: string, input: AiSettingsInput) {
  const provider = PROVIDER_BY_ID.get(input?.provider)
  if (!provider) throw new InputError('Choose an AI provider.')

  const model = typeof input.model === 'string' ? input.model.trim() : ''
  if (!model || model.length > 200 || /\s/.test(model)) {
    throw new InputError('Enter the model name exactly as your provider lists it (no spaces).')
  }

  let baseUrl: string | null = null
  if (provider.customBaseUrl) {
    const raw = (input.baseUrl ?? '').trim() || provider.defaultBaseUrl
    try {
      const url = new URL(raw)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
      baseUrl = url.toString().replace(/\/+$/, '')
    } catch {
      throw new InputError('Enter a valid base URL, e.g. https://your-server/v1')
    }
  }

  const existing = await prisma.aiSettings.findUnique({ where: { schoolId } })
  const typedKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : ''
  if (typedKey.length > 500) throw new InputError('API key is too long.')

  let apiKey: string | null = typedKey || null
  // Reuse the stored key only for the same provider.
  if (!apiKey && existing?.apiKeyCipher && existing.provider === provider.id) {
    apiKey = decryptSecret(existing.apiKeyCipher)
    if (!apiKey) throw new InputError('The stored key can no longer be read. Please enter it again.')
  }
  if (provider.needsKey && !apiKey) throw new InputError(`Enter your ${provider.name} API key.`)

  return { provider, model, baseUrl, apiKey, typedKey: Boolean(typedKey), existing }
}

export async function saveAiSettings(input: AiSettingsInput): Promise<Result<{ settings: AiSettingsView }>> {
  try {
    const admin = await requireSchoolAdmin()
    const r = await resolve(admin.schoolId, input)

    const keyData = r.apiKey
      ? r.typedKey || r.existing?.provider !== r.provider.id
        ? { apiKeyCipher: encryptSecret(r.apiKey), apiKeyHint: r.apiKey.slice(-4) }
        : {}
      : { apiKeyCipher: null, apiKeyHint: null }

    const data = {
      provider: r.provider.id,
      model: r.model,
      baseUrl: r.baseUrl,
      enabled: input.enabled !== false,
      updatedByName: admin.name,
      ...keyData,
    }

    await prisma.aiSettings.upsert({
      where: { schoolId: admin.schoolId },
      create: { schoolId: admin.schoolId, ...data },
      update: data,
    })

    revalidatePath('/admin/ai-assistant')
    return { success: true, settings: await loadView(admin.schoolId) }
  } catch (error) {
    return fail(error)
  }
}

export async function removeAiSettings(): Promise<Result<{ settings: AiSettingsView }>> {
  try {
    const admin = await requireSchoolAdmin()
    await prisma.aiSettings.deleteMany({ where: { schoolId: admin.schoolId } })
    revalidatePath('/admin/ai-assistant')
    return { success: true, settings: await loadView(admin.schoolId) }
  } catch (error) {
    return fail(error)
  }
}

// Sends a tiny prompt with the (possibly unsaved) settings.
export async function testAiConnection(input: AiSettingsInput): Promise<Result<{ reply: string; ms: number }>> {
  let config: AiConfig | undefined
  try {
    const admin = await requireSchoolAdmin()
    const r = await resolve(admin.schoolId, input)
    config = {
      provider: r.provider,
      model: r.model,
      baseUrl: (r.baseUrl || r.provider.defaultBaseUrl).replace(/\/+$/, ''),
      apiKey: r.apiKey,
      source: 'school',
    }

    const started = Date.now()
    let reply = ''
    await streamChat(
      config,
      {
        system: 'You are a connection test. Reply with a short greeting.',
        messages: [{ role: 'user', content: 'Say hello in five words or fewer.' }],
        maxTokens: 200,
      },
      (t) => {
        reply += t
      }
    )
    return { success: true, reply: reply.trim().slice(0, 200) || '(empty reply)', ms: Date.now() - started }
  } catch (error) {
    if (error instanceof InputError || accessErrorMessage(error)) return fail(error)
    return { success: false, error: describeProviderError(error, config) }
  }
}
