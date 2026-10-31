'use client'

import { useState } from 'react'
import { Receipt, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export default function AIAssistantPage() {
  const [tool, setTool] = useState('School Insights')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [subjects, setSubjects] = useState(['Subject 1'])
  
  const suggestions = ['How is overall student performance this term?', 'Which classes need attention?', 'Summarize fee collection this month?', 'Draft a parent update for attendance']
  const tools = ['School Insights', 'Report Card Comments', 'Fee Reminder Letter', 'Event Planner', 'Notice Generator']
  
  const ask = (text: string) => { 
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((current) => [...current, { role: 'user', text: trimmed }, { role: 'ai', text: 'Based on your live school data, I can help you review trends, identify students who need support, and prepare clear communications.' }])
    setQuestion('') 
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#FF6B35]" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Assistant</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">AI-powered tools built for school administrators.</p>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
        <div className="grid min-h-[650px] lg:grid-cols-[28%_72%]">
          <aside className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">AI Tools</div>
            <nav className="flex flex-col gap-2">
              {tools.map((item) => (
                <button 
                  key={item} 
                  onClick={() => setTool(item)} 
                  className={cn('rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors', tool === item ? 'bg-orange-50 text-[#FF6B35]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col">
            {tool === 'School Insights' ? (
              <>
                <div className="border-b border-slate-200 px-5 py-5">
                  <h2 className="text-lg font-bold text-slate-900">School Insights Chat</h2>
                  <p className="mt-1 text-xs text-slate-500">AI powered by your live school data</p>
                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {[['Students','162'],['Teachers','23'],['Classes','20'],['Collected','₹1,539,800'],['Pending','₹714,900']].map(([label,value]) => (
                      <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] text-slate-400">{label}</div>
                        <div className="mt-1 text-xs font-bold text-slate-800">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex min-h-[360px] flex-1 flex-col gap-4 overflow-y-auto bg-white px-5 py-6">
                  {messages.length === 0 ? (
                    <div className="m-auto max-w-lg text-center">
                      <Sparkles className="mx-auto size-8 text-[#FF6B35]" />
                      <h3 className="mt-3 text-lg font-bold text-slate-900">Ask anything about your school</h3>
                      <p className="mt-2 text-sm text-slate-500">Get quick, data-informed answers and administrative support.</p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {suggestions.map((item) => (
                          <button 
                            key={item} 
                            onClick={() => ask(item)} 
                            className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-[#d95324] hover:bg-orange-100"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div 
                        key={index} 
                        className={cn('max-w-[80%] text-sm leading-6', message.role === 'user' ? 'self-end rounded-2xl rounded-br-md bg-[#FF6B35] px-4 py-3 text-white' : 'self-start text-slate-700')}
                      >
                        {message.text}
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={(event) => { event.preventDefault(); ask(question) }} className="flex gap-2 border-t border-slate-200 p-4">
                  <input 
                    value={question} 
                    onChange={(event) => setQuestion(event.target.value)} 
                    className="h-11 min-w-0 flex-1 rounded-xl border border-orange-300 px-4 text-sm outline-none focus:border-[#FF6B35]" 
                    placeholder="Ask about your school..." 
                  />
                  <button className="rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white hover:bg-[#e95b29]">Ask</button>
                </form>
              </>
            ) : tool === 'Report Card Comments' ? (
              <div className="flex flex-col gap-5 p-5">
                <div className="flex items-center gap-2">
                  <Receipt className="size-5 text-[#FF6B35]" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Report Card Comments</h2>
                    <p className="mt-1 text-xs text-slate-500">Generate thoughtful, personalized feedback.</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[['ai-student','Student Name','Enter student name'],['ai-class','Class','Class 9-A'],['ai-term','Term / Exam','Mid Term'],['ai-attendance','Attendance %','92']].map(([id,label,placeholder]) => (
                    <label key={id} htmlFor={id} className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                      {label}
                      <input id={id} placeholder={placeholder} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none focus:border-[#FF6B35]" />
                    </label>
                  ))}
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">Student Conduct
                    <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal">
                      <option>Excellent</option><option>Good</option><option>Needs Improvement</option>
                    </select>
                  </label>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">Subject Marks *</span>
                    <button type="button" onClick={() => setSubjects((current) => [...current, `Subject ${current.length + 1}`])} className="text-xs font-semibold text-[#FF6B35]">+ Add Subject</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {subjects.map((subject, index) => (
                      <div key={`${subject}-${index}`} className="grid grid-cols-[1fr_130px] gap-2">
                        <input defaultValue={subject} className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B35]" />
                        <input placeholder="Marks" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B35]" />
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full rounded-xl bg-[#FF6B35] py-3 text-sm font-semibold text-white hover:bg-[#e95b29]">Generate Comments</button>
              </div>
            ) : (
              <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center">
                <Sparkles className="size-8 text-[#FF6B35]" />
                <h2 className="mt-4 text-lg font-bold text-slate-900">{tool}</h2>
                <p className="mt-2 max-w-md text-sm text-slate-500">Use AI to create polished school-ready content in a few clicks.</p>
                <button className="mt-5 rounded-xl bg-[#FF6B35] px-5 py-3 text-sm font-semibold text-white">Start with {tool}</button>
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  )
}
