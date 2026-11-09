import prisma from '@/lib/prisma'
import { decryptSecret } from './crypto'
import { PROVIDER_BY_ID, type ProviderDef } from './provider-catalog'

export type AiConfig = {
  provider: ProviderDef
  model: string
  baseUrl: string
  apiKey: string | null
  source: 'school' | 'env'
}

export class AiNotConfiguredError extends Error {}

// School settings (AI Assistant → Settings) win; otherwise fall back to
// server env vars: AI_PROVIDER, AI_MODEL, AI_API_KEY, AI_BASE_URL.
export async function getAiConfig(schoolId: string): Promise<AiConfig> {
  const row = await prisma.aiSettings.findUnique({ where: { schoolId } })

  if (row && !row.enabled) {
    throw new AiNotConfiguredError('The AI assistant is turned off. Enable it in AI settings.')
  }

  if (row) {
    const provider = PROVIDER_BY_ID.get(row.provider)
    if (!provider) throw new AiNotConfiguredError('The saved AI provider is not supported. Update AI settings.')

    const apiKey = row.apiKeyCipher ? decryptSecret(row.apiKeyCipher) : null
    if (row.apiKeyCipher && !apiKey) {
      throw new AiNotConfiguredError('The saved API key could not be read (the server secret changed). Re-enter it in AI settings.')
    }
    if (provider.needsKey && !apiKey) {
      throw new AiNotConfiguredError(`Add an API key for ${provider.name} in AI settings.`)
    }

    return {
      provider,
      model: row.model,
      baseUrl: (row.baseUrl || provider.defaultBaseUrl).replace(/\/+$/, ''),
      apiKey,
      source: 'school',
    }
  }

  const envProvider = PROVIDER_BY_ID.get(process.env.AI_PROVIDER || '')
  if (envProvider && process.env.AI_MODEL) {
    return {
      provider: envProvider,
      model: process.env.AI_MODEL,
      baseUrl: (process.env.AI_BASE_URL || envProvider.defaultBaseUrl).replace(/\/+$/, ''),
      apiKey: process.env.AI_API_KEY || null,
      source: 'env',
    }
  }

  throw new AiNotConfiguredError('AI is not set up yet. Open AI settings and choose a provider, model and API key.')
}
