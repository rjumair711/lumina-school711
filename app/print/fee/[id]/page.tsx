import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import prisma from '@/lib/prisma'
import { syncOverdueFees } from '@/lib/fees'
import { FEE_STATUS_LABEL, formatMoney } from '@/lib/fee-utils'
import { requireSchoolAdminPage } from '@/lib/school-auth'
import PrintActions from './print-actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Fee Challan / Receipt' }

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ receipt?: string; print?: string }>
}

export default async function FeePrintPage({ params, searchParams }: Props) {
  const { id } = await params
  const { receipt: receiptNo, print } = await searchParams
  const { schoolId } = await requireSchoolAdminPage()
  await syncOverdueFees(schoolId)

  const fee = await prisma.fee.findFirst({
    where: { id, schoolId },
    include: {
      school: true,
      student: { include: { user: true, class: true } },
      payments: { orderBy: { paidAt: 'asc' } },
    },
  })
  if (!fee) notFound()

  const balance = Math.max(0, Math.round((fee.totalAmount - fee.paidAmount) * 100) / 100)
  const payment = receiptNo ? fee.payments.find((p) => p.receiptNo === receiptNo) : undefined
  if (receiptNo && !payment) notFound()

  // A paid voucher (or one specific payment) prints as a receipt; otherwise a challan.
  const mode: 'receipt' | 'challan' = payment || fee.status === 'PAID' ? 'receipt' : 'challan'
  const lastPayment = payment ?? fee.payments.at(-1)
  const s = fee.student
  const school = fee.school

  const header = (copy?: string) => (
    <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
      <div>
        <div className="text-lg font-bold text-slate-900">{school.name}</div>
        {school.address && <div className="text-xs text-slate-600">{school.address}</div>}
        {school.phone && <div className="text-xs text-slate-600">Phone: {school.phone}</div>}
      </div>
      <div className="text-right">
        <div className="text-sm font-bold uppercase tracking-wide text-[#FF6B35]">
          {mode === 'receipt' ? 'Fee Receipt' : 'Fee Challan'}
        </div>
        {copy && (
          <div className="mt-1 inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
            {copy}
          </div>
        )}
      </div>
    </div>
  )

  const studentGrid = (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
      <Field label="Student Name" value={s.user?.name ?? '-'} />
      <Field label="Student ID" value={s.studentId} />
      <Field label="Class / Section" value={`${s.class.name} - ${s.class.section}`} />
      <Field label="Roll No" value={s.rollNo ?? '-'} />
      <Field label="Guardian" value={s.parentName ?? '-'} />
      <Field label="Guardian Contact" value={s.parentPhone ?? '-'} />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <style>{'@page { size: A4; margin: 10mm; }'}</style>
      <PrintActions autoPrint={print === '1'} />

      {mode === 'challan' ? (
        <div className="mx-auto grid max-w-4xl gap-4 print:max-w-none print:gap-3">
          {['Bank Copy', 'School Copy', 'Student Copy'].map((copy) => (
            <section
              key={copy}
              className="break-inside-avoid rounded-lg border border-slate-300 bg-white p-5 print:rounded-none print:border-dashed print:p-4"
            >
              {header(copy)}
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
                <Field label="Challan No" value={`CH-${fee.id.slice(-8).toUpperCase()}`} />
                <Field label="Issue Date" value={format(fee.createdAt, 'dd MMM yyyy')} />
                <Field label="Due Date" value={format(fee.dueDate, 'dd MMM yyyy')} />
                <Field label="Status" value={FEE_STATUS_LABEL[fee.status] ?? fee.status} />
              </div>
              {studentGrid}
              <table className="mt-3 w-full border border-slate-300 text-xs">
                <tbody>
                  <Row label={fee.title} value={formatMoney(fee.totalAmount)} />
                  {fee.paidAmount > 0 && <Row label="Less: Already Paid" value={`- ${formatMoney(fee.paidAmount)}`} />}
                  <Row label="Payable by Due Date" value={formatMoney(balance)} strong />
                </tbody>
              </table>
              <div className="mt-6 flex justify-between text-[10px] text-slate-500">
                <span>Payable via Cash, Bank Transfer, EasyPaisa / JazzCash</span>
                <span className="border-t border-slate-400 px-6 pt-1">Authorised Signature</span>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="mx-auto max-w-2xl rounded-lg border border-slate-300 bg-white p-8 print:border-0 print:p-0">
          {header()}
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
            <Field label="Receipt No" value={lastPayment?.receiptNo ?? '-'} />
            <Field label="Payment Date" value={format(lastPayment?.paidAt ?? fee.updatedAt, 'dd MMM yyyy')} />
            <Field label="Voucher" value={fee.title} />
          </div>
          {studentGrid}

          <table className="mt-5 w-full border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border-b border-slate-300 px-3 py-2">Receipt No</th>
                <th className="border-b border-slate-300 px-3 py-2">Date</th>
                <th className="border-b border-slate-300 px-3 py-2">Method</th>
                <th className="border-b border-slate-300 px-3 py-2">Reference</th>
                <th className="border-b border-slate-300 px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(payment ? [payment] : fee.payments).map((p) => (
                <tr key={p.id}>
                  <td className="border-b border-slate-200 px-3 py-2 font-mono">{p.receiptNo}</td>
                  <td className="border-b border-slate-200 px-3 py-2">{format(p.paidAt, 'dd MMM yyyy')}</td>
                  <td className="border-b border-slate-200 px-3 py-2">{p.paymentMode}</td>
                  <td className="border-b border-slate-200 px-3 py-2">{p.referenceNo ?? '-'}</td>
                  <td className="border-b border-slate-200 px-3 py-2 text-right">{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className="ml-auto mt-4 w-72 text-xs">
            <tbody>
              <Row label="Voucher Amount" value={formatMoney(fee.totalAmount)} />
              {payment && <Row label="Paid (this receipt)" value={formatMoney(payment.amount)} />}
              <Row label="Total Paid to Date" value={formatMoney(fee.paidAmount)} />
              <Row label="Remaining Balance" value={formatMoney(balance)} strong />
            </tbody>
          </table>

          <div className="mt-4 text-center">
            <span
              className={`inline-block rounded-full px-4 py-1 text-xs font-bold uppercase ${
                balance > 0 ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {balance > 0 ? 'Partially Paid' : 'Paid in Full'}
            </span>
          </div>

          <div className="mt-10 flex justify-between text-[10px] text-slate-500">
            <span>Computer-generated receipt · {format(new Date(), 'dd MMM yyyy, hh:mm a')}</span>
            <span className="border-t border-slate-400 px-6 pt-1">Cashier Signature</span>
          </div>
        </section>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}: </span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'bg-slate-50 font-bold' : ''}>
      <td className="border-b border-slate-200 px-3 py-2">{label}</td>
      <td className="border-b border-slate-200 px-3 py-2 text-right">{value}</td>
    </tr>
  )
}
