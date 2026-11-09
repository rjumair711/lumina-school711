import Anthropic from '@anthropic-ai/sdk'
import type { AiConfig } from './config'

// Provider-neutral streaming chat. Each adapter turns a simple
// { system, messages } request into the provider's wire format and
// calls onText for every chunk of generated text.

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ChatRequest = {
  system: string
  messages: ChatMessage[]
  maxTokens: number
}

export type FinishReason = 'stop' | 'length' | 'refusal'

export class ProviderError extends Error {
  constructor(
    message: string,
    public status?: number,
    public detail?: string
  ) {
    super(message)
  }
}

const TIMEOUT_MS = 120_000

function withTimeout(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

// Pull a readable message out of a provider error body, never echoing the key.
async function errorDetail(res: Response, apiKey: string | null) {
  let text = ''
  try {
    text = await res.text()
    const json = JSON.parse(text)
    text =
      json?.error?.message ||
      (typeof json?.error === 'string' ? json.error : '') ||
      json?.message ||
      json?.[0]?.error?.message ||
      text
  } catch {
    /* not JSON */
  }
  if (apiKey) text = text.split(apiKey).join('***')
  return String(text).replace(/\s+/g, ' ').trim().slice(0, 300)
}

// Minimal Server-Sent Events reader: yields the payload of each `data:` line.
async function* sseData(res: Response): AsyncGenerator<string> {
  if (!res.body) return
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).replace(/\r$/, '')
      buffer = buffer.slice(nl + 1)
      if (line.startsWith('data:')) yield line.slice(5).trim()
    }
  }
  if (buffer.startsWith('data:')) yield buffer.slice(5).trim()
}

async function post(url: string, headers: Record<string, string>, body: unknown, config: AiConfig, signal?: AbortSignal) {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: withTimeout(signal),
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ProviderError(`Could not reach ${new URL(url).host}.`, undefined, error instanceof Error ? error.message : undefined)
  }
  if (!res.ok) {
    throw new ProviderError(`${config.provider.name} returned an error.`, res.status, await errorDetail(res, config.apiKey))
  }
  return res
}

// ------------------------------------------------------------------
// OpenAI-compatible (OpenAI, Groq, OpenRouter, Mistral, DeepSeek, xAI,
// Ollama, LM Studio, vLLM, LiteLLM, ...)
// ------------------------------------------------------------------

async function streamOpenAICompatible(
  config: AiConfig,
  req: ChatRequest,
  onText: (t: string) => void,
  signal?: AbortSignal
): Promise<FinishReason> {
  const headers: Record<string, string> = { 'X-Title': 'Lumina School' }
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`

  // max_tokens is left to the provider default: some newer models reject it.
  const res = await post(
    `${config.baseUrl}/chat/completions`,
    headers,
    {
      model: config.model,
      stream: true,
      messages: [
        ...(req.system ? [{ role: 'system', content: req.system }] : []),
        ...req.messages,
      ],
    },
    config,
    signal
  )

  let finish: FinishReason = 'stop'
  for await (const data of sseData(res)) {
    if (data === '[DONE]') break
    let json: {
      error?: { message?: string } | string
      choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[]
    }
    try {
      json = JSON.parse(data)
    } catch {
      continue
    }
    if (json.error) {
      const msg = typeof json.error === 'string' ? json.error : json.error.message
      throw new ProviderError(`${config.provider.name} returned an error.`, undefined, msg)
    }
    const choice = json.choices?.[0]
    if (choice?.delta?.content) onText(choice.delta.content)
    if (choice?.finish_reason === 'length') finish = 'length'
    if (choice?.finish_reason === 'content_filter') finish = 'refusal'
  }
  return finish
}

// ------------------------------------------------------------------
// Google Gemini
// ------------------------------------------------------------------

async function streamGemini(
  config: AiConfig,
  req: ChatRequest,
  onText: (t: string) => void,
  signal?: AbortSignal
): Promise<FinishReason> {
  const model = config.model.replace(/^models\//, '')
  const res = await post(
    `${config.baseUrl}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    { 'x-goog-api-key': config.apiKey ?? '' },
    {
      ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
      contents: req.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { maxOutputTokens: req.maxTokens },
    },
    config,
    signal
  )

  let finish: FinishReason = 'stop'
  for await (const data of sseData(res)) {
    let json: {
      error?: { message?: string }
      promptFeedback?: { blockReason?: string }
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
    }
    try {
      json = JSON.parse(data)
    } catch {
      continue
    }
    if (json.error) throw new ProviderError('Gemini returned an error.', undefined, json.error.message)
    if (json.promptFeedback?.blockReason) return 'refusal'

    const candidate = json.candidates?.[0]
    for (const part of candidate?.content?.parts ?? []) {
      if (part.text && !part.thought) onText(part.text)
    }
    const reason = candidate?.finishReason
    if (reason === 'MAX_TOKENS') finish = 'length'
    else if (reason && ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'].includes(reason)) finish = 'refusal'
  }
  return finish
}

// ------------------------------------------------------------------
// Anthropic (official SDK)
// ------------------------------------------------------------------

async function streamAnthropic(
  config: AiConfig,
  req: ChatRequest,
  onText: (t: string) => void,
  signal?: AbortSignal
): Promise<FinishReason> {
  const client = new Anthropic({
    apiKey: config.apiKey ?? undefined,
    baseURL: config.baseUrl,
    maxRetries: 1,
    timeout: TIMEOUT_MS,
  })

  try {
    const stream = client.messages.stream(
      {
        model: config.model,
        max_tokens: req.maxTokens,
        ...(req.system ? { system: req.system } : {}),
        messages: req.messages,
      },
      { signal }
    )
    stream.on('text', (delta) => onText(delta))
    const final = await stream.finalMessage()
    if (final.stop_reason === 'max_tokens') return 'length'
    if (final.stop_reason === 'refusal') return 'refusal'
    return 'stop'
  } catch (error) {
    if (signal?.aborted) throw error
    if (error instanceof Anthropic.APIConnectionError) {
      throw new ProviderError('Could not reach Anthropic.', undefined, error.message)
    }
    if (error instanceof Anthropic.APIError) {
      throw new ProviderError('Anthropic returned an error.', error.status, error.message?.slice(0, 300))
    }
    throw error
  }
}

// ------------------------------------------------------------------

export async function streamChat(
  config: AiConfig,
  req: ChatRequest,
  onText: (t: string) => void,
  signal?: AbortSignal
): Promise<FinishReason> {
  switch (config.provider.kind) {
    case 'anthropic':
      return streamAnthropic(config, req, onText, signal)
    case 'gemini':
      return streamGemini(config, req, onText, signal)
    default:
      return streamOpenAICompatible(config, req, onText, signal)
  }
}

// Plain-language explanation for the admin.
export function describeProviderError(error: unknown, config?: AiConfig): string {
  const name = config?.provider.name ?? 'The AI provider'
  if (error instanceof ProviderError) {
    const detail = error.detail ? ` (${error.detail})` : ''
    switch (error.status) {
      case 401:
      case 403:
        return `${name} rejected the API key. Check the key in AI settings.${detail}`
      case 404:
        return `${name} could not find model "${config?.model}". Check the model name in AI settings.${detail}`
      case 402:
      case 429:
        return `${name} rate limit or quota reached. Try again shortly or check your plan.${detail}`
      case 400:
      case 422:
        return `${name} rejected the request.${detail}`
      default:
        if (error.status && error.status >= 500) return `${name} is having problems right now. Please try again.${detail}`
        return `${error.message}${detail}`
    }
  }
  return 'Something went wrong while generating a response.'
}
