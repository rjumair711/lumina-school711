'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, PlugZap, Save, Settings2, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  getAiSettingsView,
  removeAiSettings,
  saveAiSettings,
  testAiConnection,
  type AiSettingsView,
} from '@/app/actions/ai-settings'
import { PROVIDERS, PROVIDER_BY_ID } from '@/lib/ai/provider-catalog'
import { inputClass, labelClass, primaryButton, secondaryButton } from '../tests-exams/forms'

type TestState = { ok: true; reply: string; ms: number } | { ok: false; error: string } | null

export function AiSettingsPanel({ onSaved }: { onSaved: () => void }) {
  const [view, setView] = useState<AiSettingsView | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [test, setTest] = useState<TestState>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [testing, startTesting] = useTransition()
  const [saving, startSaving] = useTransition()

  const apply = (v: AiSettingsView) => {
    setView(v)
    if (v.provider) setProvider(v.provider)
    setModel(v.model)
    setBaseUrl(v.baseUrl)
    setEnabled(v.enabled || v.source === 'none')
    setApiKey('')
  }

  useEffect(() => {
    getAiSettingsView().then((res) => {
      if (res.success) apply(res.settings)
      else setLoadError(res.error)
    })
  }, [])

  const def = PROVIDER_BY_ID.get(provider) ?? PROVIDERS[0]
  // A saved key is only reused for the same provider.
  const keySaved = Boolean(view?.source === 'school' && view.hasKey && view.provider === provider)
  const input = { provider, model, baseUrl, apiKey, enabled }

  const runTest = () =>
    startTesting(async () => {
      setTest(null)
      const res = await testAiConnection(input)
      setTest(res.success ? { ok: true, reply: res.reply, ms: res.ms } : { ok: false, error: res.error })
    })

  const save = () =>
    startSaving(async () => {
      const res = await saveAiSettings(input)
      if (res.success) {
        apply(res.settings)
        toast.success('AI settings saved')
        onSaved()
      } else toast.error(res.error)
    })

  const remove = () =>
    startSaving(async () => {
      const res = await removeAiSettings()
      if (res.success) {
        apply(res.settings)
        setConfirmRemove(false)
        setTest(null)
        toast.success('AI settings removed')
        onSaved()
      } else toast.error(res.error)
    })

  if (loadError) return <div className="p-5 text-sm text-rose-700">{loadError}</div>
  if (!view) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" /> Loading settings…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
          <Settings2 className="size-5 text-[#FF6B35]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">AI settings</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Use any AI provider and model with your own API key. Settings apply to everyone in this school.
          </p>
        </div>
      </div>

      {view.source === 'env' && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
          Currently using the server&apos;s environment settings ({PROVIDER_BY_ID.get(view.provider)?.name} · {view.model}). Saving here overrides them for this school.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="flex flex-col gap-5"
        >
          <div className={labelClass}>
            Provider
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROVIDERS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => {
                    setProvider(p.id)
                    setTest(null)
                    if (p.id !== provider) {
                      setBaseUrl(p.customBaseUrl ? p.defaultBaseUrl : '')
                      if (view.provider !== p.id) setModel('')
                      else setModel(view.model)
                    }
                  }}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition',
                    provider === p.id
                      ? 'border-[#FF6B35] bg-orange-50 text-[#d95324] ring-2 ring-orange-100'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <label className={labelClass}>
            Model *
            <input
              value={model}
              onChange={(e) => setModel(e.target.value.trim())}
              required
              maxLength={200}
              placeholder={def.modelPlaceholder}
              className={cn(inputClass, 'font-mono')}
              spellCheck={false}
              autoComplete="off"
            />
            <span className="font-normal text-slate-400">Type the exact model ID from your provider. Any model they offer works.</span>
          </label>

          {def.customBaseUrl && (
            <label className={labelClass}>
              Base URL *
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
                placeholder="https://your-server.example.com/v1"
                className={cn(inputClass, 'font-mono')}
                spellCheck={false}
              />
              <span className="font-normal text-slate-400">
                The address before <code>/chat/completions</code>. For Ollama on this machine: http://localhost:11434/v1
              </span>
            </label>
          )}

          <label className={labelClass}>
            API key {def.needsKey ? '*' : '(optional)'}
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={keySaved ? `Saved key ending in ${view.keyHint}. Leave blank to keep it` : 'Paste your API key'}
                className={cn(inputClass, 'pr-10 font-mono')}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                aria-label={showKey ? 'Hide key' : 'Show key'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <span className="font-normal text-slate-400">{def.keyHelp}</span>
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 accent-[#FF6B35]" />
            AI assistant enabled for this school
          </label>

          {test && (
            <div
              className={cn(
                'flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs',
                test.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-700'
              )}
            >
              {test.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
              <div className="min-w-0">
                {test.ok ? (
                  <>
                    <b>Connected</b> in {(test.ms / 1000).toFixed(1)}s. The model replied: “{test.reply}”
                  </>
                ) : (
                  test.error
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={secondaryButton} onClick={runTest} disabled={testing || !model}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
              Test connection
            </button>
            <button type="submit" className={primaryButton} disabled={saving || !model}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save settings
            </button>
            {view.source === 'school' &&
              (confirmRemove ? (
                <span className="ml-auto flex items-center gap-2 text-xs text-rose-700">
                  Remove provider and key?
                  <button type="button" onClick={remove} className="font-semibold underline">Yes, remove</button>
                  <button type="button" onClick={() => setConfirmRemove(false)} className="text-slate-500 underline">Cancel</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmRemove(true)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600">
                  <Trash2 className="size-3.5" /> Remove
                </button>
              ))}
          </div>
        </form>

        <aside className="flex flex-col gap-3 text-xs text-slate-600">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-slate-800"><ShieldCheck className="size-4 text-emerald-600" /> How your key is protected</div>
            <ul className="ml-4 list-disc space-y-1 text-slate-500">
              <li>Encrypted (AES-256) before it is stored.</li>
              <li>Never sent back to the browser. Only the last 4 characters are shown.</li>
              <li>Only administrators can change it.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center gap-2 font-bold text-slate-800"><KeyRound className="size-4 text-[#FF6B35]" /> Current</div>
            {view.source === 'none' ? (
              <p className="text-slate-500">Not set up yet.</p>
            ) : (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-slate-400">Provider</dt><dd className="font-semibold">{PROVIDER_BY_ID.get(view.provider)?.name ?? view.provider}</dd>
                <dt className="text-slate-400">Model</dt><dd className="break-all font-mono">{view.model}</dd>
                <dt className="text-slate-400">Key</dt><dd>{view.hasKey ? (view.keyHint ? `•••• ${view.keyHint}` : 'Set') : 'None'}</dd>
                <dt className="text-slate-400">Status</dt><dd>{view.enabled ? 'Enabled' : 'Disabled'}</dd>
                {view.updatedLabel && (<><dt className="text-slate-400">Updated</dt><dd>{view.updatedLabel}</dd></>)}
              </dl>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
