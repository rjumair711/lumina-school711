'use client'

import { useEffect } from 'react'

export default function PrintActions({ autoPrint }: { autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint) return
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [autoPrint])

  return (
    <div className="mx-auto mb-6 flex max-w-4xl justify-end gap-3 print:hidden">
      <button
        onClick={() => window.close()}
        className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Close
      </button>
      <button
        onClick={() => window.print()}
        className="h-10 rounded-lg bg-[#FF6B35] px-5 text-sm font-semibold text-white hover:bg-[#e85a27]"
      >
        Print / Save as PDF
      </button>
    </div>
  )
}
