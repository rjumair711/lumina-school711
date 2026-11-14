// Client-safe fee helpers (no Prisma import), shared by server actions and UI.

export const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'EasyPaisa',
  'JazzCash',
  'Cheque',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const CURRENCY = 'Rs.'

export function formatMoney(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100
  return `${CURRENCY} ${rounded.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
}

// "2026-11" for the given date (local time)
export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

// "2026-11" -> "November 2026"
export function monthLabel(key: string): string {
  if (!isMonthKey(key)) return key
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export const FEE_STATUS_LABEL: Record<string, string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  OVERDUE: 'Overdue',
}

export const FEE_STATUS_STYLE: Record<string, string> = {
  PAID: 'border-0 bg-emerald-50 text-emerald-700',
  PENDING: 'border-0 bg-amber-50 text-amber-700',
  PARTIAL: 'border-0 bg-sky-50 text-sky-700',
  OVERDUE: 'border-0 bg-rose-50 text-rose-700',
}
