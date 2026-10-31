'use client'

import { useState } from 'react'
import { ChevronRight, MoreHorizontal, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { conversations } from '@/lib/mock-data'

export default function CommunicationPage() {
  const [activeContact, setActiveContact] = useState('Anjali Singh')
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  
  const filteredConversations = conversations.filter((conversation) => 
    conversation.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Communication</h1>
        <p className="mt-1 text-sm text-slate-500">Chat with teachers, students, and admins.</p>
      </div>
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <div className="grid min-h-[620px] lg:grid-cols-[32%_68%]">
          <section className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r" aria-label="Conversations">
            <div className="border-b border-slate-200 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input 
                  value={query} 
                  onChange={(event) => setQuery(event.target.value)} 
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#FF6B35]" 
                  placeholder="Search conversations..." 
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {filteredConversations.map((conversation) => (
                <button 
                  key={conversation.name} 
                  onClick={() => setActiveContact(conversation.name)} 
                  className={cn('relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors', activeContact === conversation.name ? 'bg-orange-50' : 'hover:bg-slate-50')}
                >
                  <span className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#FF6B35] transition-opacity', activeContact === conversation.name ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-[#d95324]">{conversation.initials}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-slate-800">{conversation.name}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{conversation.time}</span>
                    </div>
                    <div className="mt-1 truncate text-xs text-slate-500">{conversation.preview}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section className="flex min-h-0 flex-col" aria-label="Active conversation">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-[#d95324]">
                {conversations.find((conversation) => conversation.name === activeContact)?.initials}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{activeContact}</h2>
                <p className="mt-1 text-xs text-slate-500">{conversations.find((conversation) => conversation.name === activeContact)?.role}</p>
              </div>
              <button aria-label="More conversation options" className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-50">
                <MoreHorizontal className="size-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto bg-white px-5 py-6">
              <div className="self-start">
                <p className="max-w-[min(520px,80vw)] text-sm leading-6 text-slate-700">Hi, I wanted to ask about the upcoming test. Will the revision topics be shared with the class?</p>
                <span className="mt-1 block text-[10px] text-slate-400">18:36</span>
              </div>
              <div className="max-w-[min(520px,80vw)] self-end rounded-2xl rounded-br-md bg-[#FF6B35] px-4 py-3 text-sm leading-6 text-white shadow-sm">
                Hi Anjali, yes, the revision topics will be shared today. I&apos;ll also ask the subject teacher to send the study guide.
                <span className="mt-1 block text-right text-[10px] text-white/75">18:39</span>
              </div>
              <div className="self-start">
                <p className="max-w-[min(520px,80vw)] text-sm leading-6 text-slate-700">Thank you. That will be very helpful.</p>
                <span className="mt-1 block text-[10px] text-slate-400">18:40</span>
              </div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); setMessage('') }} className="flex items-center gap-3 border-t border-slate-200 p-4">
              <input 
                value={message} 
                onChange={(event) => setMessage(event.target.value)} 
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-[#FF6B35]" 
                placeholder="Write a message..." 
                aria-label="Write a message" 
              />
              <button type="submit" disabled={!message.trim()} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[#FF6B35] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                Send <ChevronRight className="size-4" />
              </button>
            </form>
          </section>
        </div>
      </Card>
    </div>
  )
}