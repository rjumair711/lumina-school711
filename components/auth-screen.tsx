'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { BookOpen, Eye, EyeOff, GraduationCap, Heart, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registerSchoolAdmin } from '@/lib/actions/auth'

type Role = 'Admin' | 'Teacher' | 'Student' | 'Parent'
type AuthMode = 'login' | 'register'

const roles: { name: Role; description: string; icon: typeof ShieldCheck }[] = [
  { name: 'Admin', description: 'School administrator', icon: ShieldCheck },
  { name: 'Teacher', description: 'Manage your classes', icon: BookOpen },
  { name: 'Student', description: 'View your learning', icon: UserRound },
  { name: 'Parent', description: 'Stay connected', icon: Heart },
]

const demoCredentials: Record<Role, { email: string; password: string }> = {
  Admin: { email: 'admin@school.com', password: 'adminpassword123' },
  Teacher: { email: 'teacher@school.com', password: 'teacherpassword123' },
  Student: { email: 'student@school.com', password: 'studentpassword123' },
  Parent: { email: 'parent@school.com', password: 'parentpassword123' },
}

function HeroPanel() {
  return (
    <section className="relative hidden min-h-screen w-[40%] min-w-[420px] flex-col overflow-hidden bg-[#FF6B35] px-12 py-10 text-white lg:flex">
      <div className="absolute -right-28 -top-24 size-80 rounded-full border-[36px] border-white/10" />
      <div className="absolute -bottom-36 -left-20 size-96 rounded-full border-[46px] border-white/10" />
      <div className="relative flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full border border-white/30 bg-white/10"><GraduationCap className="size-6" /></div>
        <div><div className="text-xl font-bold tracking-tight">EduFlow</div><div className="text-xs text-white/70">School Management System</div></div>
      </div>
      <div className="relative my-auto max-w-md py-16">
        <div className="mb-5 h-1 w-12 rounded-full bg-white/70" />
        <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">Manage your school with confidence</h1>
        <p className="mt-6 max-w-sm text-base leading-7 text-white/80">A complete platform for administrators, teachers, students, and parents.</p>
      </div>
      <div className="relative grid grid-cols-3 gap-3">
        {[['2,847', 'Students'], ['184', 'Teachers'], ['12', 'Schools']].map(([value, label]) => <div key={label} className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"><div className="text-lg font-bold">{value}</div><div className="mt-0.5 text-[11px] text-white/70">{label}</div></div>)}
      </div>
    </section>
  )
}

export default function AuthScreen({ mode = 'login' }: { mode?: AuthMode }) {
  const isRegister = mode === 'register'
  const router = useRouter()
  
  const [role, setRole] = useState<Role>('Admin')
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
        router.push('/?registered=true')
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
            <p className="mt-2 text-sm text-slate-500">{isRegister ? 'Create your EduFlow school workspace' : 'Select your role and sign in'}</p>
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
                <div className="rounded-xl bg-orange-50 px-4 py-3 text-center text-xs font-medium text-[#d95324]">Signing in as {role}</div>
                <button type="submit" disabled={loading} className="h-12 rounded-xl bg-[#FF6B35] text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e95b29] disabled:opacity-50">
                  {loading ? 'Authenticating...' : `Sign in as ${role}`} <span className="ml-1">→</span>
                </button>
              </>
            )}
            
            {isRegister && (
              <button type="submit" disabled={loading} className="h-12 rounded-xl bg-[#FF6B35] text-sm font-bold text-white shadow-lg shadow-orange-200 transition hover:bg-[#e95b29] disabled:opacity-50">
                {loading ? 'Creating account...' : 'Create school account'}
              </button>
            )}
            
            {submitted && <p role="status" className="text-center text-xs font-medium text-emerald-600">{isRegister ? 'Registration request received. Welcome to EduFlow.' : `Demo sign-in submitted as ${role}.`}</p>}
          </form>
          
          {!isRegister && (
            <>
              <div className="my-8 flex items-center gap-4"><div className="h-px flex-1 bg-slate-200" /><span className="text-xs text-slate-400">or</span><div className="h-px flex-1 bg-slate-200" /></div>
              <div>
                <div className="mb-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Select role</div>
                <div className="grid grid-cols-2 gap-3">
                  {roles.map(({ name, description, icon: Icon }) => (
                    <button type="button" key={name} onClick={() => { setRole(name); setEmail(demoCredentials[name].email); setPassword(demoCredentials[name].password); setSubmitted(false) }} className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition', role === name ? 'border-[#FF6B35] bg-orange-50 ring-1 ring-[#FF6B35]' : 'border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40')}>
                      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', role === name ? 'bg-[#FF6B35] text-white' : 'bg-slate-100 text-slate-500')}><Icon className="size-4" /></span>
                      <span><span className="block text-xs font-bold text-slate-800">{name}</span><span className="mt-0.5 block text-[10px] text-slate-400">{description}</span></span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-500">Demo Mode: Click a role above to automatically fill in the test credentials.</div>
              </div>
            </>
          )}
          
          <p className="mt-8 text-center text-sm text-slate-500">{isRegister ? 'Already have an account? ' : 'New school? '}<Link href={isRegister ? '/' : '/register'} className="font-bold text-[#FF6B35] hover:underline">{isRegister ? 'Sign in' : 'Register School'}</Link></p>
        </div>
      </section>
    </main>
  )
}