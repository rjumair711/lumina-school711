'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CircleDollarSign, Receipt, Search, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { defaulters, feeRows } from '@/lib/mock-data'

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('border-slate-200/80 shadow-sm', className)}>
      <CardHeader className="px-5 pb-0 pt-5">
        <CardTitle className="text-sm font-bold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-4 pt-4">{children}</CardContent>
    </Card>
  )
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: string }) {
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

function StudentFeeView({ onReceipt, onBack }: { onReceipt: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="w-fit text-sm font-semibold text-[#FF6B35]">
        ← Back to fee status
      </button>
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Search student (name, student ID or roll no.)</label>
        <div className="relative mt-2 max-w-xl">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="h-11 w-full rounded-xl border border-slate-200 pl-10 text-sm" placeholder="Type at least 2 characters..." />
        </div>
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-orange-100 font-bold text-[#FF6B35]">AJ</div>
            <div>
              <div className="font-bold">Ansh Jain</div>
              <div className="text-xs text-slate-500">10-B • ID: STU-2026-0160 • Roll: 2</div>
            </div>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <div className="text-xs text-slate-500">Total Paid</div>
              <strong className="text-emerald-600">₹40,000</strong>
            </div>
            <div>
              <div className="text-xs text-slate-500">Balance</div>
              <strong className="text-rose-600">₹8,000</strong>
            </div>
          </div>
          <button aria-label="Clear selected student" className="text-slate-400">
            <X className="size-4" />
          </button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending / Partial Dues</CardTitle>
        </CardHeader>
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
              <tr>
                <td className="px-5 py-4">Examination Fee - Half Yearly</td>
                <td className="px-5 py-4">₹800</td>
                <td className="px-5 py-4 text-emerald-600">₹0</td>
                <td className="px-5 py-4 font-semibold text-rose-600">₹800</td>
                <td className="px-5 py-4">20 Aug 2026</td>
                <td className="px-5 py-4">
                  <Badge className="bg-orange-50 text-orange-700">Pending</Badge>
                </td>
                <td className="px-5 py-4">
                  <button onClick={onReceipt} className="rounded-lg bg-[#FF6B35] px-3 py-1.5 text-xs font-semibold text-white">
                    Collect
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-5 text-sm text-slate-500">No payments recorded yet.</CardContent>
      </Card>
      <div className="rounded-2xl border border-[#FF6B35]/30 bg-orange-50 p-5">
        <h2 className="font-bold text-slate-900">Collect Examination Fee - Half Yearly</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <input className="h-10 rounded-lg border bg-white px-3 text-sm" placeholder="Amount ₹800" />
          <select className="h-10 rounded-lg border bg-white px-3 text-sm">
            <option>Cash</option>
            <option>Online</option>
            <option>Cheque</option>
          </select>
          <button onClick={onReceipt} className="rounded-lg bg-[#FF6B35] px-5 text-sm font-semibold text-white">
            Save Payment
          </button>
        </div>
      </div>
    </div>
  )
}

function ReceiptDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="receipt-title" className="text-lg font-bold">
            Payment Receipt
          </h2>
          <button onClick={onClose} aria-label="Close receipt">
            <X className="size-5 text-slate-400" />
          </button>
        </div>
        <div className="rounded-xl border border-slate-200 p-6">
          <div className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-[#FF6B35] font-bold text-white">E</div>
            <div className="mt-2 font-bold text-[#FF6B35]">EduFlow School</div>
            <div className="text-xs text-slate-500">Fee Payment Receipt</div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {[
              ['Receipt No', 'RCP-1787164406142-0747'],
              ['Date', '20/8/2026'],
              ['Student', 'Ansh Jain'],
              ['Student ID', 'STU-2026-0160'],
              ['Class', '10-B'],
              ['Roll No', '2'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-1 font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border">
            <div className="flex justify-between bg-orange-50 px-4 py-3 text-xs font-bold">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="flex justify-between px-4 py-3 text-sm">
              <span>Examination Fee - Half Yearly</span>
              <span>₹800</span>
            </div>
            <div className="flex justify-between border-t px-4 py-3 font-bold">
              <span>Amount Paid</span>
              <span className="text-emerald-600">₹800</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-xs text-slate-500">
            <span>Mode: Cash</span>
            <span>Ref: test</span>
          </div>
          <div className="mt-5 text-center text-[10px] text-slate-400">Computer-generated receipt - No signature required</div>
        </div>
        <div className="mt-5 flex gap-3">
          <button className="flex-1 rounded-xl bg-[#FF6B35] py-3 text-sm font-semibold text-white">
            <span className="mr-2">▣</span>Print Receipt
          </button>
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FeesWorkspace() {
  const [tab, setTab] = useState('Dashboard')
  const [student, setStudent] = useState(false)
  const [receipt, setReceipt] = useState(false)

  const chartData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => ({
    month,
    value: [620, 840, 1120, 780, 1260, 980, 1420, 1180, 1340, 960, 1500, 1280][index],
  }))
  const classData = Array.from({ length: 12 }, (_, index) => ({
    name: `Class ${index + 1}`,
    value: [82, 104, 126, 110, 142, 118, 156, 132, 168, 148, 182, 160][index],
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Management</h1>
          <p className="mt-1 text-sm text-slate-500">Class-wise fee structure, collection &amp; reports</p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:border-[#FF6B35] hover:text-[#FF6B35]">
          <Activity className="size-4" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {['Dashboard', 'Collect Fee', 'Fee Structure', 'Reports', 'Concessions'].map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={cn('rounded-t-lg px-4 py-3 text-sm font-semibold text-slate-500', tab === item && 'border-b-2 border-[#FF6B35] text-[#FF6B35]')}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Dashboard' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[#FF6B35] p-5 text-white">
              <p className="text-sm text-orange-50">Total Collected (Year)</p>
              <div className="mt-2 text-2xl font-bold">₹15,39,000</div>
            </div>
            <div className="rounded-2xl bg-cyan-500 p-5 text-white">
              <p className="text-sm text-cyan-50">This Month</p>
              <div className="mt-2 text-2xl font-bold">₹15,39,000</div>
            </div>
            <div className="rounded-2xl bg-indigo-700 p-5 text-white">
              <p className="text-sm text-indigo-100">Pending Dues</p>
              <div className="mt-2 text-2xl font-bold">₹7,15,700</div>
            </div>
            <div className="rounded-2xl bg-rose-600 p-5 text-white">
              <p className="text-sm text-rose-100">Defaulters</p>
              <div className="mt-2 text-2xl font-bold">149</div>
            </div>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartCard title="Monthly Collection Trend">
              <ChartContainer config={{ value: { label: 'Value', color: '#FF6B35' } }} className="h-[270px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} stroke="#eef1f6" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${value}k`} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </ChartCard>
            <ChartCard title="Class-wise Collection">
              <ChartContainer config={{ value: { label: 'Value', color: '#6366f1' } }} className="h-[270px] w-full">
                <BarChart data={classData}>
                  <CartesianGrid vertical={false} stroke="#eef1f6" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `${value}k`} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </ChartCard>
          </div>
        </>
      ) : tab === 'Collect Fee' ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Paid Students" value="152" icon={Users} tone="bg-emerald-50" />
            <StatCard label="Pending Students" value="10" icon={Users} tone="bg-orange-50" />
            <StatCard label="Total Collected" value="₹15,39,000" icon={CircleDollarSign} tone="bg-blue-50" />
            <StatCard label="Total Pending" value="₹7,15,700" icon={CircleDollarSign} tone="bg-rose-50" />
          </div>
          {!student ? (
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Class-wise Fee Status</CardTitle>
                <div className="flex gap-2">
                  <select className="h-9 rounded-lg border px-3 text-xs">
                    <option>Class 10-A</option>
                    <option>All Classes</option>
                  </select>
                  <select className="h-9 rounded-lg border px-3 text-xs">
                    <option>All Status</option>
                    <option>Paid</option>
                    <option>Pending</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-[10px] uppercase text-slate-500">
                      <th className="px-5 py-3">Student</th>
                      <th className="px-5 py-3">Class</th>
                      <th className="px-5 py-3">Total</th>
                      <th className="px-5 py-3">Paid</th>
                      <th className="px-5 py-3">Balance</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Ansh Jain', '10-B', '₹48,000', '₹40,000', '₹8,000', 'Pending'],
                      ['Ayesha Abbasi', '10-A', '₹52,000', '₹52,000', '₹0', 'Paid'],
                    ].map(([name, cls, total, paid, balance, status]) => (
                      <tr key={name} className="border-b">
                        <td className="px-5 py-4 font-semibold">{name}</td>
                        <td className="px-5 py-4">{cls}</td>
                        <td className="px-5 py-4">{total}</td>
                        <td className="px-5 py-4 text-emerald-600">{paid}</td>
                        <td className="px-5 py-4 text-rose-600">{balance}</td>
                        <td className="px-5 py-4">
                          <Badge className={status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}>{status}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <button onClick={() => setStudent(true)} className="rounded-lg bg-[#FF6B35] px-3 py-1.5 text-xs font-semibold text-white">
                            Collect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <StudentFeeView onReceipt={() => setReceipt(true)} onBack={() => setStudent(false)} />
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-sm text-slate-500">Select Dashboard or Collect Fee to continue.</CardContent>
        </Card>
      )}
      {receipt && <ReceiptDialog onClose={() => setReceipt(false)} />}
    </div>
  )
}