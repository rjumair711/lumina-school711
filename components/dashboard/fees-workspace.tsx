'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import { CircleDollarSign, Printer, Search, Users, X, CalendarPlus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createClassFeeAction, generateMonthlyVouchersAction, recordFeePaymentAction } from '@/app/actions/fees'
import {
  FEE_STATUS_LABEL,
  FEE_STATUS_STYLE,
  PAYMENT_METHODS,
  formatMoney,
  monthKey,
  monthLabel,
} from '@/lib/fee-utils'

type PaymentData = { receiptNo: string; amount: number; paymentMode: string; referenceNo?: string | null; paidAt: Date }
type FeeData = {
  id: string; title: string; month: string | null; totalAmount: number; paidAmount: number; dueDate: Date; status: string;
  payments: PaymentData[]
}
type StudentData = {
  id: string; studentId: string; rollNo: string | null; classId: string; monthlyFee: number;
  parentName: string | null; parentPhone: string | null;
  user: { name: string | null } | null;
  class: { id: string; name: string; section: string };
  fees: FeeData[]
}
type ClassItem = { id: string; name: string; section: string }
type Metrics = {
  currentMonth: string
  monthExpected: number
  monthCollected: number
  monthPending: number
  monthVouchers: number
  monthPaidVouchers: number
  totalCollected: number
  thisMonthCollected: number
  totalPending: number
  defaultersCount: number
}
type Charts = {
  trend: { key: string; value: number }[]
  byClass: { name: string; collected: number; pending: number }[]
}
type ReceiptInfo = {
  receiptNo: string; amount: number; mode: string; ref: string | null; paidAt: string; remaining: number;
  fee: FeeData; student: StudentData
}

const TABS = ['Dashboard', 'Fee Records', 'Collect Fee', 'Generate Vouchers'] as const
const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
const todayStr = () => format(new Date(), 'yyyy-MM-dd')

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof Users; tone: string }) {
  return (
    <Card className={cn('border-0 shadow-sm', tone)}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-[26px] font-bold tracking-tight text-slate-900">{value}</div>
        </div>
        <div className="flex size-11 items-center justify-center rounded-full bg-white/80 text-indigo-600 shadow-sm">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={FEE_STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-700'}>{FEE_STATUS_LABEL[status] ?? status}</Badge>
}

function printUrl(feeId: string, receiptNo?: string) {
  return `/print/fee/${feeId}?print=1${receiptNo ? `&receipt=${encodeURIComponent(receiptNo)}` : ''}`
}

function ReceiptDialog({ receipt, schoolName, onClose }: { receipt: ReceiptInfo; schoolName: string; onClose: () => void }) {
  const { student, fee } = receipt
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div role="dialog" className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Payment Receipt</h2>
          <button onClick={onClose} aria-label="Close"><X className="size-5 text-slate-400" /></button>
        </div>
        <div className="rounded-xl border border-slate-200 p-6">
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#FF6B35] font-bold text-white">{schoolName.charAt(0).toUpperCase() || 'S'}</div>
            <div className="mt-2 font-bold text-[#FF6B35]">{schoolName}</div>
            <div className="text-xs text-slate-500">Fee Payment Receipt</div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-xs text-slate-500">Receipt No</div><div className="font-semibold">{receipt.receiptNo}</div></div>
            <div><div className="text-xs text-slate-500">Payment Date</div><div className="font-semibold">{format(new Date(receipt.paidAt), 'dd MMM yyyy')}</div></div>
            <div><div className="text-xs text-slate-500">Student</div><div className="font-semibold">{student.user?.name}</div></div>
            <div><div className="text-xs text-slate-500">Student ID</div><div className="font-semibold">{student.studentId}</div></div>
            <div><div className="text-xs text-slate-500">Class</div><div className="font-semibold">{student.class.name}-{student.class.section}</div></div>
            <div><div className="text-xs text-slate-500">Roll No</div><div className="font-semibold">{student.rollNo || '-'}</div></div>
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border">
            <div className="flex justify-between bg-orange-50 px-4 py-3 text-xs font-bold"><span>Description</span><span>Amount</span></div>
            <div className="flex justify-between px-4 py-3 text-sm"><span>{fee.title}</span><span>{formatMoney(fee.totalAmount)}</span></div>
            <div className="flex justify-between border-t px-4 py-3 font-bold"><span>Amount Paid</span><span className="text-emerald-600">{formatMoney(receipt.amount)}</span></div>
            <div className="flex justify-between border-t px-4 py-3 text-sm font-semibold"><span>Remaining Balance</span><span className={receipt.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}>{formatMoney(receipt.remaining)}</span></div>
          </div>
          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <span>Method: {receipt.mode}</span>
            <span>Ref: {receipt.ref || 'N/A'}</span>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <a href={printUrl(fee.id, receipt.receiptNo)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: 'flex-1 bg-[#FF6B35] hover:bg-[#e85a27]' })}><Printer className="mr-2 size-4" />Print Receipt</a>
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function FeesWorkspace({ schoolName, classes, students, metrics, charts }: { schoolName: string, classes: ClassItem[], students: StudentData[], metrics: Metrics, charts: Charts }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Dashboard')

  // Collect Fee State (ids, so the view refreshes with server data after a payment)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null)

  // Fee Records filters
  const [recSearch, setRecSearch] = useState('')
  const [recClass, setRecClass] = useState('all')
  const [recStatus, setRecStatus] = useState('all')
  const [recMonth, setRecMonth] = useState('all')

  // Payment Form State
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState<string>(PAYMENT_METHODS[0])
  const [payRef, setPayRef] = useState('')
  const [payDate, setPayDate] = useState(todayStr)
  const [isPaying, setIsPaying] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptInfo | null>(null)

  // Generate forms state
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingMonthly, setIsGeneratingMonthly] = useState(false)

  const activeStudent = students.find((s) => s.id === activeStudentId) ?? null
  const selectedFee = activeStudent?.fees.find((f) => f.id === selectedFeeId) ?? null

  // Filter students logic
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(s => {
      const matchesSearch = !q || s.user?.name?.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || (s.rollNo ?? '').toLowerCase().includes(q)
      const matchesClass = classFilter === 'all' || s.class.id === classFilter
      return matchesSearch && matchesClass
    })
  }, [students, search, classFilter])

  // All vouchers flattened for the Fee Records tab
  const allRecords = useMemo(
    () => students.flatMap((s) => s.fees.map((f) => ({ student: s, fee: f }))).sort((a, b) => +new Date(b.fee.dueDate) - +new Date(a.fee.dueDate)),
    [students]
  )
  const recordMonths = useMemo(
    () => [...new Set(allRecords.map((r) => r.fee.month).filter((m): m is string => Boolean(m)))].sort().reverse(),
    [allRecords]
  )
  const filteredRecords = useMemo(() => {
    const q = recSearch.trim().toLowerCase()
    return allRecords.filter(({ student: s, fee: f }) => {
      if (recClass !== 'all' && s.classId !== recClass) return false
      if (recMonth !== 'all' && f.month !== recMonth) return false
      if (recStatus === 'paid' && f.status !== 'PAID') return false
      if (recStatus === 'unpaid' && f.status === 'PAID') return false
      if (!['all', 'paid', 'unpaid'].includes(recStatus) && f.status !== recStatus) return false
      if (q && !(s.user?.name?.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q) || (s.rollNo ?? '').toLowerCase().includes(q) || f.title.toLowerCase().includes(q))) return false
      return true
    })
  }, [allRecords, recSearch, recClass, recStatus, recMonth])
  const recTotals = filteredRecords.reduce(
    (acc, { fee }) => ({ total: acc.total + fee.totalAmount, paid: acc.paid + fee.paidAmount }),
    { total: 0, paid: 0 }
  )

  // Aggregate stats for collect tab
  const totalPaidStudents = students.filter(s => s.fees.length > 0 && s.fees.every(f => f.status === 'PAID')).length
  const totalPendingStudents = students.filter(s => s.fees.some(f => f.status !== 'PAID')).length

  const openCollect = (studentId: string, feeId: string | null = null) => {
    setTab('Collect Fee')
    setActiveStudentId(studentId)
    selectFee(studentId, feeId)
  }

  const selectFee = (studentId: string, feeId: string | null) => {
    setSelectedFeeId(feeId)
    const fee = students.find((s) => s.id === studentId)?.fees.find((f) => f.id === feeId)
    setPayAmount(fee ? String(Math.round((fee.totalAmount - fee.paidAmount) * 100) / 100) : '')
    setPayRef('')
    setPayDate(todayStr())
  }

  const handleCreateStructure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setIsGenerating(true)
    const res = await createClassFeeAction(new FormData(form))
    setIsGenerating(false)
    if (res.success) {
      toast.success(`Fee assigned to ${res.count} students`)
      form.reset()
    } else {
      toast.error(res.error)
    }
  }

  const handleGenerateMonthly = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsGeneratingMonthly(true)
    const res = await generateMonthlyVouchersAction(new FormData(e.currentTarget))
    setIsGeneratingMonthly(false)
    if (res.success) {
      const parts = [`${res.created} voucher${res.created === 1 ? '' : 's'} generated`]
      if (res.alreadyExisted) parts.push(`${res.alreadyExisted} already existed`)
      if (res.noFee) parts.push(`${res.noFee} skipped (no monthly fee set)`)
      toast.success(parts.join(' · '))
    } else {
      toast.error(res.error)
    }
  }

  const handlePaymentSubmit = async () => {
    if (!selectedFee || !activeStudent || !payAmount) return
    setIsPaying(true)
    const formData = new FormData()
    formData.append('feeId', selectedFee.id)
    formData.append('amount', payAmount)
    formData.append('paymentMode', payMode)
    formData.append('referenceNo', payRef)
    formData.append('paidAt', payDate)

    const res = await recordFeePaymentAction(formData)
    setIsPaying(false)
    if (res.success) {
      toast.success(res.remaining > 0 ? `Partial payment recorded. Remaining: ${formatMoney(res.remaining)}` : 'Payment recorded. Voucher is fully paid.')
      setReceiptData({
        receiptNo: res.receiptNo, amount: res.amount, mode: res.paymentMode, ref: res.referenceNo,
        paidAt: res.paidAt, remaining: res.remaining, fee: selectedFee, student: activeStudent,
      })
      setSelectedFeeId(null)
      setPayAmount('')
      setPayRef('')
    } else {
      toast.error(res.error)
    }
  }

  // Calculate totals for active student
  const activeStudentTotal = activeStudent?.fees.reduce((acc, curr) => acc + curr.totalAmount, 0) || 0
  const activeStudentPaid = activeStudent?.fees.reduce((acc, curr) => acc + curr.paidAmount, 0) || 0
  const activeStudentBalance = activeStudentTotal - activeStudentPaid
  const selectedBalance = selectedFee ? Math.round((selectedFee.totalAmount - selectedFee.paidAmount) * 100) / 100 : 0
  const remainingAfter = Math.max(0, selectedBalance - (Number(payAmount) || 0))

  const trendData = charts.trend.map((t) => ({ month: monthLabel(t.key).slice(0, 3), value: t.value }))
  const kFormat = (value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))
  const collectionRate = metrics.monthExpected > 0 ? Math.round((metrics.monthCollected / metrics.monthExpected) * 100) : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Management</h1>
          <p className="mt-1 text-sm text-slate-500">Monthly vouchers, fee collection, receipts & reports</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {TABS.map((item) => (
          <button key={item} onClick={() => { setTab(item); setActiveStudentId(null); setSelectedFeeId(null); }} className={cn('rounded-t-lg px-4 py-3 text-sm font-semibold text-slate-500 transition-colors', tab === item && 'border-b-2 border-[#FF6B35] text-[#FF6B35]')}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'Dashboard' && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-700">{monthLabel(metrics.currentMonth)}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-indigo-700 p-5 text-white">
                <p className="text-sm text-indigo-100">Total Expected (This Month)</p>
                <div className="mt-2 text-2xl font-bold">{formatMoney(metrics.monthExpected)}</div>
                <p className="mt-1 text-xs text-indigo-200">{metrics.monthVouchers} vouchers</p>
              </div>
              <div className="rounded-2xl bg-emerald-600 p-5 text-white">
                <p className="text-sm text-emerald-50">Total Collected (This Month)</p>
                <div className="mt-2 text-2xl font-bold">{formatMoney(metrics.monthCollected)}</div>
                <p className="mt-1 text-xs text-emerald-100">{collectionRate}% collected · {metrics.monthPaidVouchers} paid</p>
              </div>
              <div className="rounded-2xl bg-[#FF6B35] p-5 text-white">
                <p className="text-sm text-orange-50">Pending Amount (This Month)</p>
                <div className="mt-2 text-2xl font-bold">{formatMoney(metrics.monthPending)}</div>
                <p className="mt-1 text-xs text-orange-100">{metrics.monthVouchers - metrics.monthPaidVouchers} unpaid vouchers</p>
              </div>
              <div className="rounded-2xl bg-rose-600 p-5 text-white">
                <p className="text-sm text-rose-100">Defaulters</p>
                <div className="mt-2 text-2xl font-bold">{metrics.defaultersCount}</div>
                <p className="mt-1 text-xs text-rose-100">Students with overdue dues</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Collected (All Time)" value={formatMoney(metrics.totalCollected)} icon={CircleDollarSign} tone="bg-blue-50" />
            <StatCard label="Received This Month (All Vouchers)" value={formatMoney(metrics.thisMonthCollected)} icon={CircleDollarSign} tone="bg-cyan-50" />
            <StatCard label="Total Outstanding (All Time)" value={formatMoney(metrics.totalPending)} icon={CircleDollarSign} tone="bg-rose-50" />
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="border-slate-200/80 shadow-sm"><CardHeader className="px-5 pb-0 pt-5"><CardTitle className="text-sm font-bold text-slate-800">Monthly Collection (Last 12 Months)</CardTitle></CardHeader><CardContent className="px-3 pb-4 pt-4"><ChartContainer config={{ value: { label: 'Collected', color: '#FF6B35' } }} className="h-[270px] w-full"><BarChart data={trendData}><CartesianGrid vertical={false} stroke="#eef1f6" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={kFormat} /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="value" fill="#FF6B35" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent></Card>
            <Card className="border-slate-200/80 shadow-sm"><CardHeader className="px-5 pb-0 pt-5"><CardTitle className="text-sm font-bold text-slate-800">Class-wise Collected vs Pending</CardTitle></CardHeader><CardContent className="px-3 pb-4 pt-4"><ChartContainer config={{ collected: { label: 'Collected', color: '#10b981' }, pending: { label: 'Pending', color: '#f43f5e' } }} className="h-[270px] w-full"><BarChart data={charts.byClass}><CartesianGrid vertical={false} stroke="#eef1f6" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={kFormat} /><Tooltip content={<ChartTooltipContent />} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="collected" name="Collected" stackId="a" fill="#10b981" /><Bar dataKey="pending" name="Pending" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent></Card>
          </div>
        </div>
      )}

      {tab === 'Fee Records' && (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Search name, ID, roll or voucher..." value={recSearch} onChange={(e) => setRecSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select aria-label="Class / Section" value={recClass} onChange={(e) => setRecClass(e.target.value)} className={selectClass}>
                <option value="all">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>Class {c.name} - {c.section}</option>)}
              </select>
              <select aria-label="Payment status" value={recStatus} onChange={(e) => setRecStatus(e.target.value)} className={selectClass}>
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid (all)</option>
                <option value="PENDING">— Pending</option>
                <option value="PARTIAL">— Partial</option>
                <option value="OVERDUE">— Overdue</option>
              </select>
              <select aria-label="Month" value={recMonth} onChange={(e) => setRecMonth(e.target.value)} className={selectClass}>
                <option value="all">All Months</option>
                {recordMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </div>
          </CardHeader>
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-b bg-slate-50/60 px-5 py-3 text-xs text-slate-600">
            <span><strong>{filteredRecords.length}</strong> vouchers</span>
            <span>Billed: <strong>{formatMoney(recTotals.total)}</strong></span>
            <span>Collected: <strong className="text-emerald-600">{formatMoney(recTotals.paid)}</strong></span>
            <span>Balance: <strong className="text-rose-600">{formatMoney(recTotals.total - recTotals.paid)}</strong></span>
          </div>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-[10px] uppercase text-slate-500">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Voucher</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-500">No fee records match these filters.</td></tr>
                ) : filteredRecords.map(({ student: s, fee: f }) => (
                  <tr key={f.id} className="border-b transition-colors hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{s.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{s.studentId}{s.rollNo ? ` · Roll ${s.rollNo}` : ''}</div>
                    </td>
                    <td className="px-5 py-3">{s.class.name}-{s.class.section}</td>
                    <td className="px-5 py-3">{f.title}</td>
                    <td className="px-5 py-3">{format(new Date(f.dueDate), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-3 font-medium">{formatMoney(f.totalAmount)}</td>
                    <td className="px-5 py-3 text-emerald-600">{formatMoney(f.paidAmount)}</td>
                    <td className="px-5 py-3 font-semibold text-rose-600">{formatMoney(f.totalAmount - f.paidAmount)}</td>
                    <td className="px-5 py-3"><StatusBadge status={f.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {f.status !== 'PAID' && (
                          <Button size="sm" onClick={() => openCollect(s.id, f.id)} className="h-8 bg-[#FF6B35] px-3 text-xs hover:bg-[#e85a27]">Collect</Button>
                        )}
                        <a href={printUrl(f.id)} target="_blank" rel="noopener noreferrer" title={f.status === 'PAID' ? 'Print receipt' : 'Print challan'} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-8 px-3 text-xs' })}>
                            <Printer className="mr-1 size-3.5" />{f.status === 'PAID' ? 'Receipt' : 'Challan'}
                          </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === 'Generate Vouchers' && (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarPlus className="size-5 text-[#FF6B35]" />Generate Monthly Vouchers</CardTitle>
              <p className="text-sm text-muted-foreground">Creates one voucher per student for the selected month using each student&apos;s monthly fee. Students who already have a voucher for that month are skipped.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerateMonthly} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Month</label>
                    <Input name="month" type="month" required defaultValue={monthKey()} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Day of Month</label>
                    <Input name="dueDay" type="number" min={1} max={28} required defaultValue={10} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class / Section</label>
                  <select name="classId" defaultValue="all" className={selectClass}>
                    <option value="all">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>)}
                  </select>
                </div>
                <Button type="submit" disabled={isGeneratingMonthly} className="w-full bg-[#FF6B35] hover:bg-[#e85a27]">
                  {isGeneratingMonthly ? 'Generating Vouchers...' : 'Generate Monthly Vouchers'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="size-5 text-indigo-600" />One-off Fee (Class Batch)</CardTitle>
              <p className="text-sm text-muted-foreground">Assign an extra fee (e.g. admission, exam or annual charges) with the same amount to every student in a class.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStructure} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fee Title</label>
                  <Input name="title" required placeholder="e.g. Annual Exam Fee" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Amount (Rs.)</label>
                    <Input name="amount" type="number" min={1} required placeholder="5000" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <Input name="dueDate" type="date" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Class</label>
                  <select name="classId" required className={selectClass}>
                    <option value="">Select class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>)}
                  </select>
                </div>
                <Button type="submit" disabled={isGenerating} variant="outline" className="w-full">
                  {isGenerating ? 'Generating Invoices...' : 'Assign Fee to Class'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'Collect Fee' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Fully Paid Students" value={totalPaidStudents} icon={Users} tone="bg-emerald-50" />
            <StatCard label="Pending Students" value={totalPendingStudents} icon={Users} tone="bg-orange-50" />
            <StatCard label="Total Collected" value={formatMoney(metrics.totalCollected)} icon={CircleDollarSign} tone="bg-blue-50" />
            <StatCard label="Total Pending" value={formatMoney(metrics.totalPending)} icon={CircleDollarSign} tone="bg-rose-50" />
          </div>

          {!activeStudent ? (
            <Card className="overflow-hidden shadow-sm border-slate-200">
              <CardHeader className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-9" placeholder="Search name, ID or roll no..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="h-10 rounded-md border px-3 text-sm focus:outline-none">
                    <option value="all">All Classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
                  </select>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-[10px] uppercase text-slate-500">
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3">Total Due</th>
                      <th className="px-5 py-3">Paid</th>
                      <th className="px-5 py-3">Balance</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                       <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-500">No students found.</td></tr>
                    ) : filteredStudents.map((s) => {
                      const total = s.fees.reduce((sum, f) => sum + f.totalAmount, 0)
                      const paid = s.fees.reduce((sum, f) => sum + f.paidAmount, 0)
                      const balance = total - paid
                      const status = total === 0 ? 'No Dues' : balance <= 0.005 ? 'Paid' : 'Pending'

                      return (
                        <tr key={s.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">{s.user?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{s.studentId}</div>
                          </td>
                          <td className="px-5 py-4">{s.class.name}-{s.class.section}</td>
                          <td className="px-5 py-4 font-medium">{formatMoney(total)}</td>
                          <td className="px-5 py-4 font-medium text-emerald-600">{formatMoney(paid)}</td>
                          <td className="px-5 py-4 font-semibold text-rose-600">{formatMoney(balance)}</td>
                          <td className="px-5 py-4">
                            <Badge className={status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : status === 'No Dues' ? 'bg-slate-100 text-slate-700' : 'bg-orange-50 text-orange-700'}>{status}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <Button onClick={() => openCollect(s.id)} size="sm" className="bg-[#FF6B35] hover:bg-[#e85a27] h-8 text-xs px-4">View / Collect</Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-5">
              <button onClick={() => { setActiveStudentId(null); setSelectedFeeId(null); }} className="w-fit text-sm font-semibold text-[#FF6B35]">← Back to roster</button>

              <Card>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-full bg-orange-100 font-bold text-[#FF6B35] text-xl">
                      {activeStudent.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{activeStudent.user?.name}</div>
                      <div className="text-sm text-slate-500">{activeStudent.class.name}-{activeStudent.class.section} • ID: {activeStudent.studentId} • Roll: {activeStudent.rollNo || '-'}</div>
                      <div className="text-xs text-slate-400">Monthly fee: {formatMoney(activeStudent.monthlyFee)}{activeStudent.parentPhone ? ` • Guardian: ${activeStudent.parentName ?? ''} ${activeStudent.parentPhone}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex gap-8 text-sm bg-slate-50 p-4 rounded-xl border">
                    <div><div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Paid</div><strong className="text-emerald-600 text-lg">{formatMoney(activeStudentPaid)}</strong></div>
                    <div><div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Outstanding Balance</div><strong className="text-rose-600 text-lg">{formatMoney(activeStudentBalance)}</strong></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Vouchers & Dues</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead>
                      <tr className="border-y bg-slate-50 text-[10px] uppercase text-slate-500">
                        <th className="px-5 py-3">Title</th>
                        <th className="px-5 py-3">Total</th>
                        <th className="px-5 py-3">Paid</th>
                        <th className="px-5 py-3">Balance</th>
                        <th className="px-5 py-3">Due Date</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudent.fees.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-6 text-center text-slate-500">No fees assigned.</td></tr>
                      ) : activeStudent.fees.map(f => {
                        const balance = f.totalAmount - f.paidAmount
                        return (
                          <tr key={f.id} className="border-b align-top">
                            <td className="px-5 py-4">
                              <div className="font-medium">{f.title}</div>
                              {f.payments.length > 0 && (
                                <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                                  {f.payments.map((p) => (
                                    <li key={p.receiptNo}>
                                      <a href={printUrl(f.id, p.receiptNo)} target="_blank" rel="noopener noreferrer" className="hover:text-[#FF6B35] hover:underline">
                                        {p.receiptNo}
                                      </a> · {formatMoney(p.amount)} · {p.paymentMode} · {format(new Date(p.paidAt), 'dd MMM yyyy')}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td className="px-5 py-4">{formatMoney(f.totalAmount)}</td>
                            <td className="px-5 py-4 text-emerald-600">{formatMoney(f.paidAmount)}</td>
                            <td className="px-5 py-4 font-semibold text-rose-600">{formatMoney(balance)}</td>
                            <td className="px-5 py-4">{format(new Date(f.dueDate), 'dd MMM yyyy')}</td>
                            <td className="px-5 py-4"><StatusBadge status={f.status} /></td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                {f.status !== 'PAID' ? (
                                  <Button onClick={() => selectFee(activeStudent.id, f.id)} size="sm" variant={selectedFee?.id === f.id ? 'default' : 'outline'} className={selectedFee?.id === f.id ? 'bg-[#FF6B35]' : ''}>
                                    {selectedFee?.id === f.id ? 'Selected' : 'Collect'}
                                  </Button>
                                ) : (
                                  <span className="px-2 py-1.5 text-xs font-semibold text-emerald-600">Cleared</span>
                                )}
                                <a href={printUrl(f.id)} target="_blank" rel="noopener noreferrer" title={f.status === 'PAID' ? 'Print receipt' : 'Print challan'} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Printer className="size-4" /></a>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {selectedFee && (
                <div className="rounded-2xl border border-[#FF6B35]/30 bg-orange-50 p-6 animate-in slide-in-from-bottom-2">
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                    <h2 className="font-bold text-slate-900">Collect: {selectedFee.title}</h2>
                    <span className="text-sm font-semibold text-rose-600">Balance: {formatMoney(selectedBalance)}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Amount to Pay (Rs.)</label>
                      <Input type="number" min={1} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} max={selectedBalance} className="bg-white border-orange-200" placeholder="Enter amount" />
                      <p className="text-[11px] text-slate-500">
                        {Number(payAmount) > 0 && Number(payAmount) < selectedBalance
                          ? `Partial payment · remaining after: ${formatMoney(remainingAfter)}`
                          : 'Enter less than the balance for a partial payment'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Payment Method</label>
                      <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="flex h-10 w-full rounded-md border border-orange-200 bg-white px-3 py-2 text-sm focus:outline-none">
                        {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Payment Date</label>
                      <Input type="date" value={payDate} max={todayStr()} onChange={(e) => setPayDate(e.target.value)} className="bg-white border-orange-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Reference / Txn ID (Optional)</label>
                      <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="bg-white border-orange-200" placeholder={payMode === 'Cash' ? 'Not required' : 'e.g. TID / slip number'} />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handlePaymentSubmit} disabled={isPaying || !payAmount || Number(payAmount) <= 0} className="bg-[#FF6B35] hover:bg-[#e85a27] h-10 px-8">
                      {isPaying ? 'Processing...' : 'Save Payment'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {receiptData && (
        <ReceiptDialog receipt={receiptData} schoolName={schoolName} onClose={() => setReceiptData(null)} />
      )}
    </div>
  )
}
