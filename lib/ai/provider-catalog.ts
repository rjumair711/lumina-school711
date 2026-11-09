// AI providers the assistant can talk to. Safe to import on the client.
// "openai-compatible" covers any service exposing POST /chat/completions.

export type ProviderKind = 'openai-compatible' | 'anthropic' | 'gemini'

export type ProviderDef = {
  id: string
  name: string
  kind: ProviderKind
  defaultBaseUrl: string
  needsKey: boolean
  // Base URL is editable (self-hosted / custom gateways).
  customBaseUrl: boolean
  modelPlaceholder: string
  keyHelp: string
}

export const PROVIDERS: ProviderDef[] = [
  { id: 'openai', name: 'OpenAI', kind: 'openai-compatible', defaultBaseUrl: 'https://api.openai.com/v1', needsKey: true, customBaseUrl: false, modelPlaceholder: 'Model name from platform.openai.com', keyHelp: 'platform.openai.com → API keys' },
  { id: 'anthropic', name: 'Anthropic (Claude)', kind: 'anthropic', defaultBaseUrl: 'https://api.anthropic.com', needsKey: true, customBaseUrl: false, modelPlaceholder: 'Model ID from docs.anthropic.com', keyHelp: 'console.anthropic.com → API keys' },
  { id: 'gemini', name: 'Google Gemini', kind: 'gemini', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta', needsKey: true, customBaseUrl: false, modelPlaceholder: 'Model name from ai.google.dev', keyHelp: 'aistudio.google.com → Get API key' },
  { id: 'groq', name: 'Groq', kind: 'openai-compatible', defaultBaseUrl: 'https://api.groq.com/openai/v1', needsKey: true, customBaseUrl: false, modelPlaceholder: 'Model name from console.groq.com', keyHelp: 'console.groq.com → API keys' },
  { id: 'openrouter', name: 'OpenRouter', kind: 'openai-compatible', defaultBaseUrl: 'https://openrouter.ai/api/v1', needsKey: true, customBaseUrl: false, modelPlaceholder: 'e.g. provider/model-name', keyHelp: 'openrouter.ai → Keys' },
  { id: 'mistral', name: 'Mistral', kind: 'openai-compatible', defaultBaseUrl: 'https://api.mistral.ai/v1', needsKey: true, customBaseUrl: false, modelPlaceholder: 'Model name from console.mistral.ai', keyHelp: 'console.mistral.ai → API keys' },
  { id: 'deepseek', name: 'DeepSeek', kind: 'openai-compatible', defaultBaseUrl: 'https://api.deepseek.com/v1', needsKey: true, customBaseUrl: false, modelPlaceholder: 'Model name from platform.deepseek.com', keyHelp: 'platform.deepseek.com → API keys' },
  { id: 'xai', name: 'xAI (Grok)', kind: 'openai-compatible', defaultBaseUrl: 'https://api.x.ai/v1', needsKey: true, customBaseUrl: false, modelPlaceholder: 'Model name from console.x.ai', keyHelp: 'console.x.ai → API keys' },
  { id: 'ollama', name: 'Ollama (local)', kind: 'openai-compatible', defaultBaseUrl: 'http://localhost:11434/v1', needsKey: false, customBaseUrl: true, modelPlaceholder: 'A model you have pulled, e.g. from `ollama list`', keyHelp: 'No key needed for a local Ollama server' },
  { id: 'custom', name: 'Custom (OpenAI-compatible)', kind: 'openai-compatible', defaultBaseUrl: '', needsKey: false, customBaseUrl: true, modelPlaceholder: 'Model name your endpoint expects', keyHelp: 'Any service with an OpenAI-style /chat/completions endpoint' },
]

export const PROVIDER_BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]))
