'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { registerSchoolAdmin } from '@/lib/actions/auth'

type AuthMode = 'login' | 'register'


// Demo admin created by `pnpm prisma db seed` (see README).
const DEMO_ADMIN = { email: 'demo@luminaschool.app', password: 'Demo@12345' }

function HeroPanel() {
  return (
    <section className="relative hidden min-h-screen w-[40%] min-w-[420px] flex-col overflow-hidden bg-[#FF6B35] px-12 py-10 text-white lg:flex">
      <div className="absolute -right-28 -top-24 size-80 rounded-full border-[36px] border-white/10" />
      <div className="absolute -bottom-36 -left-20 size-96 rounded-full border-[46px] border-white/10" />
      <div className="relative flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/10"><GraduationCap className="size-6" /></div>
        <div><div className="text-xl font-bold tracking-tight">Lumina School</div><div className="text-xs text-white/70">School Management System</div></div>
      </div>
      <div className="relative my-auto max-w-md py-16">
        <div className="mb-5 h-1 w-12 rounded-full bg-white/70" />
        <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">Manage your school with confidence</h1>
        <p className="mt-6 max-w-sm text-base leading-7 text-white/80">A complete platform for administrators, teachers, students, and parents.</p>
      </div>
    </section>
  )
}

export default function AuthScreen({ mode = 'login' }: { mode?: AuthMode }) {
  const isRegister = mode === 'register'
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSubmitted(false)

    const formData = new FormData(event.currentTarget)

    if (isRegister) {
      const result = await registerSchoolAdmin(formData)

      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        setSubmitted(true)
        const login = await signIn("credentials", {
          email: String(formData.get("email") ?? "").trim().toLowerCase(),
          password: String(formData.get("password") ?? ""),
          redirect: false,
        })
        router.push(login?.error ? "/" : "/admin")
        router.refresh()
      }
    } else {
      const emailValue = formData.get("email") as string
      const passwordValue = formData.get("password") as string

      const res = await signIn("credentials", {
        email: emailValue,
        password: passwordValue,
        redirect: false,
      })

      if (res?.error) {
        setError("Invalid email or password")
        setLoading(false)
      } else {
        router.push("/admin")
        router.refresh()
      }
    }
  }

  return (
    <main className="flex min-h-screen bg-white text-slate-900">
      <HeroPanel />
      <section className="flex min-h-screen flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[470px]">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF6B35] lg:hidden"><GraduationCap className="size-6" /></div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{isRegister ? 'Register your school' : 'Welcome back'}</h2>
            <p className="mt-2 text-sm text-slate-500">{isRegister ? 'Create your school workspace' : 'Sign in to your school admin dashboard'}</p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isRegister && (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  School name
                  <input name="schoolName" required placeholder="Alfiah Public School" className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-100" />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Admin name
                  <input name="name" required placeholder="Your full name" className="h-12 rounded-xl border border-slate-200 px-4 text-sm font-normal outline-none focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-100" />
                </label>
              </div>
            )}
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              {isRegister ? 'Work email' : 'Email'}
              <span className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input name="email" required type="email" value={isRegister ? undefined : email} onChange={isRegister ? undefined : (event) => setEmail(event.target.value)} placeholder={isRegister ? 'admin@school.edu' : 'Enter your email'} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-normal outline-none transition focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-100" />
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              Password
              <span className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input name="password" required type={showPassword ? 'text' : 'password'} value={isRegister ? undefined : password} onChange={isRegister ? undefined : (event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-normal outline-none transition focus:border-[#FF6B35] focus:ring-4 focus:ring-orange-100" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </label>
            
            {!isRegister && (
              <>
                                <button type="submit" disabled={loading} className="h-12 rounded-xl bg-[#FF6B35] text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e95b29] disabled:opacity-50">
                  {loading ? 'Signing in...' : 'Sign in'} <span className="ml-1">→</span>
                </button>
              </>
            )}
            
            {isRegister && (
              <button type="submit" disabled={loading} className="h-12 rounded-xl bg-[#FF6B35] text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e95b29] disabled:opacity-50">
                {loading ? 'Creating account...' : 'Create school account'}
              </button>
            )}
            
            {submitted && <p role="status" className="text-center text-xs font-medium text-emerald-600">School created. Opening your dashboard…</p>}
          </form>
          
          {!isRegister && (
            <>
              <div className="my-8 flex items-center gap-4"><div className="h-px flex-1 bg-slate-200" /><span className="text-xs text-slate-400">or</span><div className="h-px flex-1 bg-slate-200" /></div>
              <button
                type="button"
                onClick={() => { setEmail(DEMO_ADMIN.email); setPassword(DEMO_ADMIN.password); setError(null) }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-[#d95324] transition hover:bg-orange-100"
              >
                <Sparkles className="size-4" /> Use demo admin account
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-500">{DEMO_ADMIN.email} · {DEMO_ADMIN.password}</p>
            </>
          )}
          
          <p className="mt-8 text-center text-sm text-slate-500">{isRegister ? 'Already have an account? ' : 'New school? '}<Link href={isRegister ? '/' : '/register'} className="font-bold text-[#FF6B35] hover:underline">{isRegister ? 'Sign in' : 'Register School'}</Link></p>
        </div>
      </section>
    </main>
  )
}