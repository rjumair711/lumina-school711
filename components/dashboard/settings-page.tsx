'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  const inputClass =
    'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#FF6B35] focus:ring-2 focus:ring-orange-100'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your school configuration and preferences.</p>
        </div>
        <button className="h-10 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white hover:bg-[#e95b29]">
          Save Changes
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardContent className="flex gap-1 p-3 xl:flex-col">
            <button className="rounded-xl bg-orange-50 px-4 py-3 text-left text-sm font-semibold text-[#FF6B35]">
              General
            </button>
            <button className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-50">
              Notifications
            </button>
            <button className="rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-50">
              Appearance
            </button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">School Information</CardTitle>
              <p className="text-xs text-slate-500">Update your school details shown across EduFlow.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                  School Name
                  <input className={inputClass} defaultValue="Alfiah International School" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                  School Email
                  <input className={inputClass} defaultValue="admin@alfiah.edu.in" type="email" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                  Phone Number
                  <input className={inputClass} defaultValue="+91 98765 43210" />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                  Academic Year
                  <select className={inputClass} defaultValue="2026-27">
                    <option>2026-27</option>
                    <option>2025-26</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 sm:col-span-2">
                  Address
                  <textarea
                    className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FF6B35]"
                    defaultValue="12 Knowledge Park, New Delhi"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
                <span>
                  <span className="block font-semibold">Email notifications</span>
                  <span className="text-xs text-slate-500">Receive updates about school activity.</span>
                </span>
                <input type="checkbox" defaultChecked className="size-4 accent-[#FF6B35]" />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm text-slate-700">
                <span>
                  <span className="block font-semibold">Weekly summary</span>
                  <span className="text-xs text-slate-500">Get a weekly performance summary.</span>
                </span>
                <input type="checkbox" defaultChecked className="size-4 accent-[#FF6B35]" />
              </label>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}