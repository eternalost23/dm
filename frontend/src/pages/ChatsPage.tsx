import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, CheckCheck, MessageSquare, Paperclip, Send } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { ChatMessage, ChatThread } from '../types'
import { Button } from '../components/ui/button'
import { uploadFile, toAbsoluteMediaUrl } from '../lib/uploads'

const formatMessageTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const getMessageDateKey = (value: string) => new Date(value).toDateString()

const formatMessageDate = (value: string) => {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Сегодня'

  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера'

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function ChatsPage() {
  const { user } = useAuth()
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null)
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, activeThread])

  const fetchThreads = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const response = await api.get('/chats')
      setThreads(response.data)
      setActiveThread((current) => {
        const requestedThreadId = (location.state as { threadId?: number } | null)?.threadId
        return current || response.data.find((thread: ChatThread) => thread.id === requestedThreadId) || response.data[0] || null
      })
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
    if (!activeThread || (!message.trim() && !attachment)) return

    try {
      const uploaded = attachment ? await uploadFile(attachment) : null
      await api.post(`/chats/${activeThread.id}/messages`, {
        body: message.trim() || undefined,
        media_url: uploaded?.url,
        media_type: uploaded?.content_type,
        media_name: uploaded?.filename,
      })
      setMessage('')
      setAttachment(null)
      await fetchMessages(activeThread.id)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-center text-slate-500">Войдите, чтобы открыть чаты.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="text-center">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="bg-slate-100 py-8">
    <div className="mx-auto grid max-w-7xl gap-4 px-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-3xl bg-white">
        <div className="border-b px-4 py-3">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-950">
            <MessageSquare className="h-5 w-5" />
            Чаты
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
            <div className="px-4 py-8 text-center text-sm text-slate-500">Чатов пока нет.</div>
          )}
        </div>
      </aside>

      <section className="flex h-[calc(100vh-9rem)] min-h-[640px] flex-col overflow-hidden rounded-3xl bg-white">
        {activeThread ? (
          <>
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <Link to={`/products/${activeThread.product_id}`} className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
                {activeThread.product_image_url ? (
                  <img src={toAbsoluteMediaUrl(activeThread.product_image_url)} alt="" className="h-full w-full object-cover" />
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
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
              {messages.map((item, index) => {
                const own = item.sender_id === user.id
                const showDate = index === 0 || getMessageDateKey(item.created_at) !== getMessageDateKey(messages[index - 1].created_at)
                const displayBody = item.media_url && item.body === 'Вложение' ? '' : item.body
                return (
                  <div key={item.id}>
                    {showDate && (
                      <div className="my-4 flex items-center justify-center">
                        <span className="rounded-md border bg-white px-3 py-1 text-sm text-slate-500">
                          {formatMessageDate(item.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[75%]">
                        <div
                          className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            own
                              ? 'rounded-br-md bg-sky-100 text-slate-900'
                              : 'rounded-bl-md bg-white text-slate-800'
                          }`}
                        >
                          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                            {displayBody && <span className="whitespace-pre-wrap break-words">{displayBody}</span>}
                            {item.media_url && (
                              item.media_type?.startsWith('image/') ? (
                                <a href={toAbsoluteMediaUrl(item.media_url)} target="_blank" rel="noreferrer" className="block w-full">
                                  <img src={toAbsoluteMediaUrl(item.media_url)} alt={item.media_name || ''} className="mt-2 max-h-64 rounded-lg object-contain" />
                                </a>
                              ) : item.media_name ? (
                                <a href={toAbsoluteMediaUrl(item.media_url)} target="_blank" rel="noreferrer" className="mt-2 block font-bold text-blue-600">
                                  {item.media_name}
                                </a>
                              ) : null
                            )}
                          </div>
                        </div>
                        <div className={`mt-1 inline-flex items-center gap-1 text-xs text-slate-400 ${own ? 'float-right' : ''}`}>
                          {formatMessageTime(item.created_at)}
                          {own && (
                            item.is_read
                              ? <CheckCheck className="h-4 w-4" />
                              : <Check className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
            {attachment && (
              <div className="flex items-center justify-between gap-3 border-t bg-blue-50 px-4 py-2 text-sm text-blue-900">
                <span className="min-w-0 truncate font-semibold">{attachment.name}</span>
                <button
                  type="button"
                  className="shrink-0 rounded-md px-2 py-1 font-bold text-blue-700 hover:bg-blue-100"
                  onClick={() => setAttachment(null)}
                >
                  РЈР±СЂР°С‚СЊ
                </button>
              </div>
            )}
            <form className="flex flex-wrap gap-2 border-t p-3" onSubmit={sendMessage}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="h-11 flex-1 rounded-md border border-input px-3"
                placeholder="Сообщение"
              />
              <label className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border border-input text-slate-500 hover:bg-slate-50" title={attachment?.name || 'Прикрепить файл'}>
                <Paperclip className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.txt"
                  onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <Button className="h-11">
                <Send className="mr-2 h-4 w-4" />
                Отправить
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">Выберите чат.</div>
        )}
      </section>
    </div>
    </div>
  )
}
