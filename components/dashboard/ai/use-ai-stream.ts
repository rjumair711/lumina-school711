'use client'

import { useCallback, useRef, useState } from 'react'

const ERROR_MARK = '\u001eERROR:'

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error'

// Streams text from POST /api/ai into state.
export function useAiStream() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<StreamStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setStatus((s) => (s === 'streaming' ? 'done' : s))
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setText('')
    setError(null)
    setStatus('idle')
  }, [])

  // Resolves with the final text ('' on failure).
  const run = useCallback(async (body: unknown, onDelta?: (full: string) => void): Promise<string> => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setText('')
    setError(null)
    setStatus('streaming')

    let full = ''
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `Request failed (${res.status}).`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })

        const markAt = full.indexOf(ERROR_MARK)
        if (markAt !== -1) {
          const message = full.slice(markAt + ERROR_MARK.length).trim()
          full = full.slice(0, markAt)
          setText(full)
          throw new Error(message || 'The AI could not complete this request.')
        }

        setText(full)
        onDelta?.(full)
      }

      setStatus('done')
      return full
    } catch (err) {
      if (controller.signal.aborted) {
        return full
      }
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
      return ''
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [])

  return { text, status, error, run, stop, reset, setText }
}
