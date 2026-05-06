import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check,
  CheckCheck,
  Heart,
  Home,
  MessageSquare,
  Send,
  ShoppingBasket,
  Star,
  X,
} from 'lucide-react'
import api from '../lib/api'
import type { ChatMessage, ChatThread, Product, Review } from '../types'
import { useAuth } from '../hooks/useAuth'
import { addCartItem } from '../lib/cart'
import { Button } from '../components/ui/button'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU').format(Number(price))

const getSalesLabel = (count: number) => {
  return count >= 1000
    ? `Продано ${(count / 1000).toFixed(1)} тыс.`
    : `Продано ${count}`
}

const getCategoryPathText = (product: Product) =>
  product.category_path?.map((category) => category.name).join(' / ') || ''

const formatMessageTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatThread, setChatThread] = useState<ChatThread | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      fetchProduct()
      fetchReviews()
      if (user) checkFavorite()
    }
  }, [id, user])

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`)
      setProduct(response.data)
    } catch (error) {
      console.error('Failed to fetch product:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/products/${id}/reviews`)
      setReviews(response.data.items || response.data)
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    }
  }

  const checkFavorite = async () => {
    try {
      const response = await api.get('/favorites')
      const favorites = response.data.items || response.data
      setIsFavorite(favorites.some((fav: any) => fav.product_id === parseInt(id!)))
    } catch (error) {
      console.error('Failed to check favorite:', error)
    }
  }

  const toggleFavorite = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      if (isFavorite) {
        await api.delete(`/favorites/${id}`)
      } else {
        await api.post(`/favorites/${id}`)
      }
      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const addToCart = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!product) return

    addCartItem(product)
    navigate('/cart')
  }

  const buyNow = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      await api.post('/orders', {
        product_id: parseInt(id!),
      })
      alert('Покупка завершена.')
      await fetchProduct()
    } catch (error: any) {
      console.error('Failed to complete purchase:', error)
      alert(error.response?.data?.detail || 'Не удалось купить товар')
    }
  }

  const fetchChatMessages = async (threadId: number) => {
    const response = await api.get(`/chats/${threadId}/messages`)
    setChatMessages(response.data)
  }

  const openChat = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setChatOpen(true)
    try {
      const response = await api.get(`/chats/product/${id}`)
      setChatThread(response.data)
      await fetchChatMessages(response.data.id)
    } catch (error: any) {
      if (error.response?.status === 404) {
        setChatThread(null)
        setChatMessages([])
        return
      }
      console.error('Failed to open chat:', error)
      alert(error.response?.data?.detail || 'Failed to open chat')
    }
  }

  const sendChatMessage = async (event: FormEvent) => {
    event.preventDefault()
    if (!chatText.trim()) return

    try {
      if (chatThread) {
        await api.post(`/chats/${chatThread.id}/messages`, { body: chatText.trim() })
        await fetchChatMessages(chatThread.id)
      } else {
        const response = await api.post('/chats', {
          product_id: parseInt(id!),
          message: chatText.trim(),
        })
        setChatThread(response.data)
        await fetchChatMessages(response.data.id)
      }
      setChatText('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">Product not found</div>
      </div>
    )
  }

  return (
    <div className="bg-slate-100 py-5">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-3 px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400 lg:col-span-2">
          <Link to="/" className="flex items-center gap-1 hover:text-blue-600">
            <Home className="h-4 w-4" />
            Главная
          </Link>
          {product.category_path?.map((category) => (
            <span key={category.id} className="flex items-center gap-2">
              <span>/</span>
              <Link to={`/search?category_id=${category.id}`} className="hover:text-blue-600">
                {category.name}
              </Link>
            </span>
          ))}
        </div>

        <section className="rounded-3xl bg-white p-6">
          <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                  No image
                </div>
              )}
              <button
                type="button"
                className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-bl-lg bg-slate-200/80 text-white transition hover:bg-blue-100 hover:text-blue-500"
                onClick={toggleFavorite}
                aria-label="Add to favorites"
              >
                <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current text-blue-500' : 'fill-current'}`} />
              </button>
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold uppercase leading-tight text-slate-950">{product.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                <span>{getSalesLabel(product.purchases_count)}</span>
                <span className="text-slate-300">•</span>
                <span className="text-blue-600">Отзывы {reviews.length}</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-400">
                {getCategoryPathText(product)}
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl bg-white p-5 lg:row-span-3">
          <div className="text-sm font-bold text-slate-500">Цена</div>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">
            {formatPrice(product.price)} ₽
          </div>
          <div className="mt-5 grid grid-cols-[48px_minmax(0,1fr)] gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-12 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
              onClick={addToCart}
            >
              <ShoppingBasket className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              className="h-12 rounded-lg bg-blue-500 text-base font-bold hover:bg-blue-600"
              onClick={buyNow}
            >
              Купить сейчас
            </Button>
          </div>
          <Button type="button" variant="outline" className="mt-3 h-11 w-full" onClick={openChat}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Написать продавцу
          </Button>
          <p className="mt-4 text-xs font-medium leading-5 text-slate-400">
            Нажимая на кнопку, вы соглашаетесь с правилами покупки.
          </p>
        </aside>

        <section className="rounded-2xl bg-white px-5 py-3">
          <div className="flex items-center gap-5 text-base font-bold">
            <button
              type="button"
              className={activeTab === 'description' ? 'text-blue-600' : 'text-slate-800'}
              onClick={() => setActiveTab('description')}
            >
              Описание
            </button>
            <button
              type="button"
              className={activeTab === 'reviews' ? 'text-blue-600' : 'text-slate-800'}
              onClick={() => setActiveTab('reviews')}
            >
              Отзывы
            </button>
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-slate-800">{reviews.length}</span>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6">
          {activeTab === 'description' ? (
            <>
              <h2 className="text-2xl font-extrabold text-slate-950">Описание товара</h2>
              <div className="mt-6 rounded-xl bg-slate-50 p-5 text-base leading-7 text-slate-800">
                {product.description || 'Описание пока не добавлено.'}
              </div>
            </>
          ) : (
            <div>
              <h2 className="text-2xl font-extrabold text-slate-950">Отзывы</h2>
              <div className="mt-6 space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center gap-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="text-sm font-medium text-slate-500">
                        {review.buyer?.username || `buyer #${review.buyer_id}`}
                      </span>
                    </div>
                    {review.comment && <p className="mt-2 text-slate-700">{review.comment}</p>}
                  </div>
                ))}
              </div>
              {reviews.length === 0 && <p className="mt-6 text-slate-500">No reviews yet</p>}
            </div>
          )}
        </section>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex h-[min(720px,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b p-4">
              <Link to={`/products/${product.id}`} className="h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
                {(chatThread?.product_image_url || product.image_url) ? (
                  <img src={chatThread?.product_image_url || product.image_url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.id}`} className="font-bold text-slate-950 hover:text-blue-600">
                  {chatThread?.product_title || product.title}
                </Link>
                <div className="text-sm text-slate-500">
                  {chatThread
                    ? user?.id === chatThread.seller_id
                      ? chatThread.buyer_username
                      : chatThread.seller_username
                    : 'Новое сообщение продавцу'}
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {chatMessages.map((message) => {
                const own = message.sender_id === user?.id
                return (
                  <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        own
                          ? 'rounded-br-md bg-sky-100 text-slate-900'
                          : 'rounded-bl-md bg-white text-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                        <span>{message.body}</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-sky-500">
                          {formatMessageTime(message.created_at)}
                          {own && (
                            message.is_read
                              ? <CheckCheck className="h-4 w-4" />
                              : <Check className="h-4 w-4" />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {chatMessages.length === 0 && <p className="text-sm text-slate-500">Сообщений пока нет.</p>}
            </div>
            <form className="flex gap-2 border-t p-3" onSubmit={sendChatMessage}>
              <input
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-md border border-input px-3"
                placeholder="Сообщение"
              />
              <Button className="h-11">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
