'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CircleDollarSign, Search, Users, X, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createClassFeeAction, recordFeePaymentAction } from '@/app/actions/fees'

type FeeData = {
  id: string; title: string; totalAmount: number; paidAmount: number; dueDate: Date; status: string;
  payments: { receiptNo: string; amount: number; paymentMode: string; paidAt: Date }[]
}
type StudentData = {
  id: string; studentId: string; rollNo: string | null;
  user: { name: string | null } | null;
  class: { id: string; name: string; section: string };
  fees: FeeData[]
}

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

function ReceiptDialog({ receipt, student, fee, onClose }: { receipt: any, student: StudentData, fee: FeeData, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div role="dialog" className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Payment Receipt</h2>
          <button onClick={onClose}><X className="size-5 text-slate-400" /></button>
        </div>
        <div className="rounded-xl border border-slate-200 p-6">
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#FF6B35] font-bold text-white">E</div>
            <div className="mt-2 font-bold text-[#FF6B35]">EduFlow School</div>
            <div className="text-xs text-slate-500">Fee Payment Receipt</div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-xs text-slate-500">Receipt No</div><div className="font-semibold">{receipt.receiptNo}</div></div>
            <div><div className="text-xs text-slate-500">Date</div><div className="font-semibold">{format(new Date(), 'dd MMM yyyy')}</div></div>
            <div><div className="text-xs text-slate-500">Student</div><div className="font-semibold">{student.user?.name}</div></div>
            <div><div className="text-xs text-slate-500">Student ID</div><div className="font-semibold">{student.studentId}</div></div>
            <div><div className="text-xs text-slate-500">Class</div><div className="font-semibold">{student.class.name}-{student.class.section}</div></div>
            <div><div className="text-xs text-slate-500">Roll No</div><div className="font-semibold">{student.rollNo || '-'}</div></div>
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border">
            <div className="flex justify-between bg-orange-50 px-4 py-3 text-xs font-bold"><span>Description</span><span>Amount</span></div>
            <div className="flex justify-between px-4 py-3 text-sm"><span>{fee.title}</span><span>₹{receipt.amount}</span></div>
            <div className="flex justify-between border-t px-4 py-3 font-bold"><span>Amount Paid</span><span className="text-emerald-600">₹{receipt.amount}</span></div>
          </div>
          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <span>Mode: {receipt.mode}</span>
            <span>Ref: {receipt.ref || 'N/A'}</span>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <Button className="flex-1 bg-[#FF6B35] hover:bg-[#e85a27]" onClick={() => window.print()}>Print Receipt</Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

export default function FeesWorkspace({ classes, students, metrics }: { classes: any[], students: StudentData[], metrics: any }) {
  const [tab, setTab] = useState('Dashboard')
  
  // Collect Fee State
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [activeStudent, setActiveStudent] = useState<StudentData | null>(null)
  
  // Payment Form State
  const [selectedFee, setSelectedFee] = useState<FeeData | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState('Cash')
  const [payRef, setPayRef] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  // Fee Structure Form State
  const [isGenerating, setIsGenerating] = useState(false)

  // Filter students logic
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.user?.name?.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase())
      const matchesClass = classFilter === 'all' || s.class.id === classFilter
      return matchesSearch && matchesClass
    })
  }, [students, search, classFilter])

  // Aggregate stats for collect tab
  const totalPaidStudents = students.filter(s => s.fees.length > 0 && s.fees.every(f => f.status === 'PAID')).length
  const totalPendingStudents = students.filter(s => s.fees.some(f => f.status !== 'PAID')).length

  const handleCreateStructure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsGenerating(true)
    const formData = new FormData(e.currentTarget)
    const res = await createClassFeeAction(formData)
    setIsGenerating(false)
    if (res.success) {
      toast.success('Fee structure applied to class successfully')
      e.currentTarget.reset()
    } else {
      toast.error(res.error)
    }
  }

  const handlePaymentSubmit = async () => {
    if (!selectedFee || !payAmount) return
    setIsPaying(true)
    const formData = new FormData()
    formData.append('feeId', selectedFee.id)
    formData.append('amount', payAmount)
    formData.append('paymentMode', payMode)
    formData.append('referenceNo', payRef)
    
    const res = await recordFeePaymentAction(formData)
    setIsPaying(false)
    if (res.success) {
      toast.success('Payment recorded successfully')
      setReceiptData({ receiptNo: res.receiptNo, amount: payAmount, mode: payMode, ref: payRef })
      setSelectedFee(null)
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

  // Mock charts for dashboard
  const chartData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => ({
    month, value: [620, 840, 1120, 780, 1260, 980, 1420, 1180, 1340, 960, 1500, 1280][index],
  }))
  const classData = classes.map((c) => ({ name: `${c.name}-${c.section}`, value: Math.floor(Math.random() * 50 + 50) }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Management</h1>
          <p className="mt-1 text-sm text-slate-500">Class-wise fee structure, collection & reports</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {['Dashboard', 'Collect Fee', 'Fee Structure'].map((item) => (
          <button key={item} onClick={() => { setTab(item); setActiveStudent(null); setSelectedFee(null); }} className={cn('rounded-t-lg px-4 py-3 text-sm font-semibold text-slate-500 transition-colors', tab === item && 'border-b-2 border-[#FF6B35] text-[#FF6B35]')}>
            {item}
          </button>
        ))}
      </div>

      {tab === 'Dashboard' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#FF6B35] p-5 text-white">
              <p className="text-sm text-orange-50">Total Collected (YTD)</p>
              <div className="mt-2 text-2xl font-bold">₹{metrics.totalCollected.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl bg-cyan-500 p-5 text-white">
              <p className="text-sm text-cyan-50">This Month</p>
              <div className="mt-2 text-2xl font-bold">₹{metrics.thisMonthCollected.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl bg-indigo-700 p-5 text-white">
              <p className="text-sm text-indigo-100">Total Pending Dues</p>
              <div className="mt-2 text-2xl font-bold">₹{metrics.totalPending.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl bg-rose-600 p-5 text-white">
              <p className="text-sm text-rose-100">Defaulters</p>
              <div className="mt-2 text-2xl font-bold">{metrics.defaultersCount}</div>
            </div>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <Card className="border-slate-200/80 shadow-sm"><CardHeader className="px-5 pb-0 pt-5"><CardTitle className="text-sm font-bold text-slate-800">Monthly Collection Trend</CardTitle></CardHeader><CardContent className="px-3 pb-4 pt-4"><ChartContainer config={{ value: { label: 'Value', color: '#FF6B35' } }} className="h-[270px] w-full"><BarChart data={chartData}><CartesianGrid vertical={false} stroke="#eef1f6" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${value}k`} /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="value" fill="#FF6B35" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent></Card>
            <Card className="border-slate-200/80 shadow-sm"><CardHeader className="px-5 pb-0 pt-5"><CardTitle className="text-sm font-bold text-slate-800">Class Activity Estimate</CardTitle></CardHeader><CardContent className="px-3 pb-4 pt-4"><ChartContainer config={{ value: { label: 'Value', color: '#6366f1' } }} className="h-[270px] w-full"><BarChart data={classData}><CartesianGrid vertical={false} stroke="#eef1f6" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${value}k`} /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ChartContainer></CardContent></Card>
          </div>
        </div>
      )}

      {tab === 'Fee Structure' && (
        <Card className="max-w-xl shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Assign New Fee Batch</CardTitle>
            <p className="text-sm text-muted-foreground">Generate pending invoices for all students in a specific class.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStructure} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Fee Title</label>
                <Input name="title" required placeholder="e.g. Tuition Fee - Term 1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Total Amount (₹)</label>
                  <Input name="amount" type="number" required placeholder="5000" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>
                  <Input name="dueDate" type="date" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Class</label>
                <select name="classId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <option value="">Select class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>)}
                </select>
              </div>
              <Button type="submit" disabled={isGenerating} className="w-full bg-[#FF6B35] hover:bg-[#e85a27]">
                {isGenerating ? 'Generating Invoices...' : 'Generate Fee Invoices'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === 'Collect Fee' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Fully Paid Students" value={totalPaidStudents} icon={Users} tone="bg-emerald-50" />
            <StatCard label="Pending Students" value={totalPendingStudents} icon={Users} tone="bg-orange-50" />
            <StatCard label="Total Collected" value={`₹${metrics.totalCollected.toLocaleString()}`} icon={CircleDollarSign} tone="bg-blue-50" />
            <StatCard label="Total Pending" value={`₹${metrics.totalPending.toLocaleString()}`} icon={CircleDollarSign} tone="bg-rose-50" />
          </div>

          {!activeStudent ? (
            <Card className="overflow-hidden shadow-sm border-slate-200">
              <CardHeader className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-9" placeholder="Search student name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                      const status = total === 0 ? 'No Dues' : balance === 0 ? 'Paid' : 'Pending'
                      
                      return (
                        <tr key={s.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">{s.user?.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-500">{s.studentId}</div>
                          </td>
                          <td className="px-5 py-4">{s.class.name}-{s.class.section}</td>
                          <td className="px-5 py-4 font-medium">₹{total.toLocaleString()}</td>
                          <td className="px-5 py-4 font-medium text-emerald-600">₹{paid.toLocaleString()}</td>
                          <td className="px-5 py-4 font-semibold text-rose-600">₹{balance.toLocaleString()}</td>
                          <td className="px-5 py-4">
                            <Badge className={status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : status === 'No Dues' ? 'bg-slate-100 text-slate-700' : 'bg-orange-50 text-orange-700'}>{status}</Badge>
                          </td>
                          <td className="px-5 py-4">
                            <Button onClick={() => setActiveStudent(s)} size="sm" className="bg-[#FF6B35] hover:bg-[#e85a27] h-8 text-xs px-4">View / Collect</Button>
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
              <button onClick={() => { setActiveStudent(null); setSelectedFee(null); }} className="w-fit text-sm font-semibold text-[#FF6B35]">← Back to roster</button>
              
              <Card>
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex size-14 items-center justify-center rounded-full bg-orange-100 font-bold text-[#FF6B35] text-xl">
                      {activeStudent.user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="font-bold text-lg">{activeStudent.user?.name}</div>
                      <div className="text-sm text-slate-500">{activeStudent.class.name}-{activeStudent.class.section} • ID: {activeStudent.studentId} • Roll: {activeStudent.rollNo || '-'}</div>
                    </div>
                  </div>
                  <div className="flex gap-8 text-sm bg-slate-50 p-4 rounded-xl border">
                    <div><div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Paid</div><strong className="text-emerald-600 text-lg">₹{activeStudentPaid.toLocaleString()}</strong></div>
                    <div><div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Outstanding Balance</div><strong className="text-rose-600 text-lg">₹{activeStudentBalance.toLocaleString()}</strong></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Invoices & Dues</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full min-w-[700px] text-left text-sm">
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
                          <tr key={f.id} className="border-b">
                            <td className="px-5 py-4 font-medium">{f.title}</td>
                            <td className="px-5 py-4">₹{f.totalAmount}</td>
                            <td className="px-5 py-4 text-emerald-600">₹{f.paidAmount}</td>
                            <td className="px-5 py-4 font-semibold text-rose-600">₹{balance}</td>
                            <td className="px-5 py-4">{format(new Date(f.dueDate), 'dd MMM yyyy')}</td>
                            <td className="px-5 py-4">
                              <Badge variant="outline" className={f.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}>{f.status}</Badge>
                            </td>
                            <td className="px-5 py-4">
                              {f.status !== 'PAID' ? (
                                <Button onClick={() => setSelectedFee(f)} size="sm" variant={selectedFee?.id === f.id ? 'default' : 'outline'} className={selectedFee?.id === f.id ? 'bg-[#FF6B35]' : ''}>
                                  {selectedFee?.id === f.id ? 'Selected' : 'Collect'}
                                </Button>
                              ) : (
                                <span className="text-xs text-emerald-600 font-semibold px-2">Cleared</span>
                              )}
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
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-slate-900">Collect: {selectedFee.title}</h2>
                    <span className="text-sm font-semibold text-rose-600">Balance: ₹{selectedFee.totalAmount - selectedFee.paidAmount}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-xs font-semibold text-slate-700">Amount to Pay (₹)</label>
                      <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} max={selectedFee.totalAmount - selectedFee.paidAmount} className="bg-white border-orange-200" placeholder="Enter amount" />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[150px]">
                      <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
                      <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className="flex h-10 w-full rounded-md border border-orange-200 bg-white px-3 py-2 text-sm focus:outline-none">
                        <option>Cash</option><option>Online</option><option>Cheque</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-xs font-semibold text-slate-700">Reference / Txn No (Optional)</label>
                      <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="bg-white border-orange-200" placeholder="e.g. UPI Txn ID" />
                    </div>
                    <Button onClick={handlePaymentSubmit} disabled={isPaying || !payAmount} className="bg-[#FF6B35] hover:bg-[#e85a27] h-10 px-8">
                      {isPaying ? 'Processing...' : 'Save Payment'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {receiptData && activeStudent && selectedFee && (
        <ReceiptDialog receipt={receiptData} student={activeStudent} fee={selectedFee} onClose={() => setReceiptData(null)} />
      )}
    </div>
  )
}