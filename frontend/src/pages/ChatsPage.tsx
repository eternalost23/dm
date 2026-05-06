import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, CheckCheck, MessageSquare, Send } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { ChatMessage, ChatThread } from '../types'
import { Button } from '../components/ui/button'

const formatMessageTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export function ChatsPage() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchThreads()
    }
  }, [user])

  useEffect(() => {
    if (activeThread) {
      fetchMessages(activeThread.id)
    }
  }, [activeThread])

  const fetchThreads = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await api.get('/chats')
      setThreads(response.data)
      setActiveThread((current) => current || response.data[0] || null)
    } catch (error) {
      console.error('Failed to load chats:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchMessages = async (threadId: number) => {
    try {
      const response = await api.get(`/chats/${threadId}/messages`)
      setMessages(response.data)
      await fetchThreads(true)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeThread || !message.trim()) return

    try {
      await api.post(`/chats/${activeThread.id}/messages`, { body: message.trim() })
      setMessage('')
      await fetchMessages(activeThread.id)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-center text-slate-500">Login is required to view chats.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-lg border">
        <div className="border-b px-4 py-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-950">
            <MessageSquare className="h-5 w-5" />
            Chats
          </h1>
        </div>
        <div className="divide-y">
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={`w-full px-4 py-3 text-left transition ${
                activeThread?.id === thread.id ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
              onClick={() => setActiveThread(thread)}
            >
              <div className="font-medium text-slate-950">{thread.product_title}</div>
              <div className="mt-1 text-sm text-slate-500">
                {user.id === thread.seller_id ? thread.buyer_username : thread.seller_username}
              </div>
            </button>
          ))}
          {threads.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No chats yet.</div>
          )}
        </div>
      </aside>

      <section className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border">
        {activeThread ? (
          <>
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <Link to={`/products/${activeThread.product_id}`} className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
                {activeThread.product_image_url ? (
                  <img src={activeThread.product_image_url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </Link>
              <div className="min-w-0">
                <Link to={`/products/${activeThread.product_id}`} className="font-semibold text-slate-950 hover:text-blue-600">
                  {activeThread.product_title}
                </Link>
                <div className="text-sm text-slate-500">
                  {user.id === activeThread.seller_id
                    ? activeThread.buyer_username
                    : activeThread.seller_username}
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
              {messages.map((item) => {
                const own = item.sender_id === user.id
                return (
                  <div key={item.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        own
                          ? 'rounded-br-md bg-sky-100 text-slate-900'
                          : 'rounded-bl-md bg-white text-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                        <span>{item.body}</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-sky-500">
                          {formatMessageTime(item.created_at)}
                          {own && (
                            item.is_read
                              ? <CheckCheck className="h-4 w-4" />
                              : <Check className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <form className="flex gap-2 border-t p-3" onSubmit={sendMessage}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="h-11 flex-1 rounded-md border border-input px-3"
                placeholder="Message"
              />
              <Button className="h-11">
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">Select a chat.</div>
        )}
      </section>
    </div>
  )
}
