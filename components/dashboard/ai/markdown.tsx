'use client'

import { Fragment, type ReactNode } from 'react'

// Minimal, safe Markdown renderer for AI answers (no HTML injection).
// Supports headings, bullet/numbered lists, tables, bold, italic and code.

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g
  let last = 0
  let i = 0
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0
    if (at > last) parts.push(text.slice(last, at))
    const token = match[0]
    const key = `${keyPrefix}-${i++}`
    if (token.startsWith('**')) parts.push(<strong key={key} className="font-semibold text-slate-900">{token.slice(2, -2)}</strong>)
    else if (token.startsWith('`')) parts.push(<code key={key} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em]">{token.slice(1, -1)}</code>)
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>)
    last = at + token.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line)
const isDivider = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)
const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      i++
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      blocks.push(
        <p key={key++} className={level <= 2 ? 'mt-1 text-[15px] font-bold text-slate-900' : 'mt-1 text-sm font-bold text-slate-800'}>
          {inline(heading[2], `h${key}`)}
        </p>
      )
      i++
      continue
    }

    if (isTableRow(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const header = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]))
      blocks.push(
        <div key={key++} className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50">
              <tr>{header.map((h, j) => <th key={j} className="px-3 py-2 font-semibold text-slate-700">{inline(h, `th${key}${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-t border-slate-100">
                  {r.map((c, ci) => <td key={ci} className="px-3 py-2 text-slate-600">{inline(c, `td${key}${ri}${ci}`)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ''))
      blocks.push(
        <ul key={key++} className="ml-4 list-disc space-y-1 marker:text-[#FF6B35]">
          {items.map((it, j) => <li key={j}>{inline(it, `li${key}${j}`)}</li>)}
        </ul>
      )
      continue
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''))
      blocks.push(
        <ol key={key++} className="ml-5 list-decimal space-y-1 marker:font-semibold marker:text-slate-400">
          {items.map((it, j) => <li key={j}>{inline(it, `ol${key}${j}`)}</li>)}
        </ol>
      )
      continue
    }

    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !isTableRow(lines[i])
    ) {
      para.push(lines[i++])
    }
    blocks.push(
      <p key={key++}>
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(p, `p${key}${j}`)}
          </Fragment>
        ))}
      </p>
    )
  }

  return <div className="flex flex-col gap-2.5 text-sm leading-6 text-slate-700">{blocks}</div>
}
