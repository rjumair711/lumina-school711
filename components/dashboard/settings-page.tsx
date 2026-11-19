'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateAdminAccountAction, updateSchoolProfileAction } from '@/app/actions/settings'

type SchoolProfile = { name: string; email: string; phone: string; address: string }
type AdminAccount = { name: string; email: string }

const inputClass =
  'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50 disabled:text-slate-500'
const labelClass = 'flex flex-col gap-1.5 text-xs font-semibold text-slate-700'

const tabs = [
  { id: 'school', label: 'School Profile', icon: Building2 },
  { id: 'account', label: 'My Account', icon: KeyRound },
] as const

export default function SettingsPage({ school, admin }: { school: SchoolProfile; admin: AdminAccount }) {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('school')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const submit = (action: (fd: FormData) => Promise<{ success: boolean; error?: string }>, success: string) =>
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const form = event.currentTarget
      const formData = new FormData(form)
      startTransition(async () => {
        const res = await action(formData)
        if (res.success) {
          toast.success(success)
          form.querySelectorAll<HTMLInputElement>('input[type=password]').forEach((i) => (i.value = ''))
          router.refresh()
        } else {
          toast.error(res.error || 'Something went wrong.')
        }
      })
    }

  const SaveButton = ({ label }: { label: string }) => (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white hover:bg-[#e95b29] disabled:opacity-60"
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </button>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your school profile and your administrator account.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardContent className="flex gap-1 p-3 xl:flex-col" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm ${
                  tab === id ? 'bg-orange-50 font-semibold text-[#FF6B35]' : 'font-medium text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </CardContent>
        </Card>

        {tab === 'school' ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">School Information</CardTitle>
              <p className="text-xs text-slate-500">Shown in the header and printed on fee challans and receipts.</p>
            </CardHeader>
            <CardContent>
              <form key="school" onSubmit={submit(updateSchoolProfileAction, 'School details saved.')} className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    School Name *
                    <input name="name" required maxLength={120} className={inputClass} defaultValue={school.name} />
                  </label>
                  <label className={labelClass}>
                    School Email
                    <input name="email" type="email" className={inputClass} defaultValue={school.email} />
                  </label>
                  <label className={labelClass}>
                    Phone Number
                    <input name="phone" className={inputClass} defaultValue={school.phone} />
                  </label>
                  <label className={`${labelClass} sm:col-span-2`}>
                    Address
                    <textarea
                      name="address"
                      className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100"
                      defaultValue={school.address}
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <SaveButton label="Save Changes" />
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">My Account</CardTitle>
              <p className="text-xs text-slate-500">Leave the password fields empty to keep your current password.</p>
            </CardHeader>
            <CardContent>
              <form key="account" onSubmit={submit(updateAdminAccountAction, 'Account updated.')} className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    Full Name *
                    <input name="name" required className={inputClass} defaultValue={admin.name} />
                  </label>
                  <label className={labelClass}>
                    Login Email
                    <input className={inputClass} value={admin.email} disabled readOnly />
                  </label>
                  <label className={labelClass}>
                    Current Password
                    <input name="currentPassword" type="password" autoComplete="current-password" className={inputClass} />
                  </label>
                  <span className="hidden sm:block" />
                  <label className={labelClass}>
                    New Password
                    <input name="newPassword" type="password" minLength={8} autoComplete="new-password" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Confirm New Password
                    <input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" className={inputClass} />
                  </label>
                </div>
                <div className="flex justify-end">
                  <SaveButton label="Update Account" />
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
