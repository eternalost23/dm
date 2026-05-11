import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, MessageSquare, Pencil, Star, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Order, Review } from '../types'
import api from '../lib/api'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { getProductImage } from '../lib/productImages'
import { fetchFavoriteProductIds, toggleFavoriteProduct } from '../lib/favorites'
import { toAbsoluteMediaUrl } from '../lib/uploads'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU').format(Number(price))

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value))

export function PurchasesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [reviewsByProduct, setReviewsByProduct] = useState<Map<number, Review>>(new Map())
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'buyer') {
      navigate('/profile')
      return
    }
    fetchData()
  }, [user, navigate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const ordersResponse = await api.get('/orders/my')
      const nextOrders: Order[] = ordersResponse.data.items || ordersResponse.data
      setOrders(nextOrders)
      setFavoriteIds(await fetchFavoriteProductIds())

      const ids = [...new Set(nextOrders.map((order) => order.product_id))]
      const reviewResponses = await Promise.all(ids.map((productId) => api.get(`/products/${productId}/reviews`)))
      const nextReviews = new Map<number, Review>()

      reviewResponses.forEach((response, index) => {
        const productReviews: Review[] = response.data.items || response.data
        const ownReview = productReviews.find((review) => review.buyer_id === user?.id)
        if (ownReview) nextReviews.set(ids[index], ownReview)
      })
      setReviewsByProduct(nextReviews)
    } catch (error) {
      console.error('Не удалось загрузить покупки:', error)
    } finally {
      setLoading(false)
    }
  }

  const startReview = (order: Order) => {
    const review = reviewsByProduct.get(order.product_id)
    setEditingOrderId(order.id)
    setRating(review?.rating || 5)
    setComment(review?.comment || '')
  }

  const saveReview = async (order: Order) => {
    const review = reviewsByProduct.get(order.product_id)
    const payload = { rating, comment: comment.trim() || undefined }

    if (review) {
      await api.patch(`/products/${order.product_id}/reviews/${review.id}`, payload)
    } else {
      await api.post(`/products/${order.product_id}/reviews`, payload)
    }

    setEditingOrderId(null)
    await fetchData()
  }

  const deleteReview = async (order: Order) => {
    const review = reviewsByProduct.get(order.product_id)
    if (!review) return
    await api.delete(`/products/${order.product_id}/reviews/${review.id}`)
    await fetchData()
  }

  const toggleFavorite = async (productId: number) => {
    await toggleFavoriteProduct(productId, favoriteIds.has(productId))
    setFavoriteIds(await fetchFavoriteProductIds())
  }

  const openChat = async (order: Order) => {
    try {
      const response = await api.post('/chats', {
        product_id: order.product_id,
        message: 'Здравствуйте! Вопрос по заказу.',
      })
      navigate('/chats', { state: { threadId: response.data.id } })
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        navigate('/chats')
        return
      }
      console.error('Не удалось открыть чат:', error)
    }
  }

  if (!user) return null

  return (
    <div className="bg-slate-100 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="mb-6 text-3xl font-extrabold text-slate-950">Мои покупки</h1>

        {loading ? (
          <div className="rounded-3xl bg-white py-12 text-center text-slate-500">Загрузка...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl bg-white py-12 text-center text-slate-500">Покупок пока нет.</div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const product = order.product
              const review = reviewsByProduct.get(order.product_id)
              const isFavorite = favoriteIds.has(order.product_id)
              const title = product?.title || order.product_title_snapshot || 'Товар удален'
              const sellerName = product?.seller_username || order.seller_username_snapshot || 'Продавец'
              const imageUrl = product ? getProductImage(product) : toAbsoluteMediaUrl(order.product_image_url_snapshot)

              return (
                <article key={order.id} className="rounded-3xl bg-white px-6 py-4">
                  <div className="flex items-center justify-between gap-3 border-b pb-4 text-sm font-semibold text-slate-500">
                    <div>
                      Заказ <span className="text-blue-600">№{order.id}</span> от {formatDateTime(order.created_at)}
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                      {order.status === 'paid' ? 'Оплачен' : order.status === 'pending' ? 'Ожидает' : 'Отменен'}
                    </Badge>
                  </div>

                  <div className="grid gap-4 pt-4 md:grid-cols-[120px_minmax(0,1fr)_140px]">
                    <div className="relative h-28 w-28 overflow-hidden rounded-lg bg-slate-100">
                      {imageUrl ? (
                        <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-slate-400">
                          Товар удален
                        </div>
                      )}
                      <button
                        type="button"
                        className={`absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-bl-lg bg-white/85 ${
                          isFavorite ? 'text-blue-600' : 'text-slate-300'
                        }`}
                        onClick={() => toggleFavorite(order.product_id)}
                        aria-label="Избранное"
                      >
                        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-500">
                        {sellerName}
                      </div>
                      {product ? (
                        <Link to={`/products/${product.id}`} className="mt-2 block font-extrabold uppercase text-slate-800 hover:text-blue-600">
                          {title}
                        </Link>
                      ) : (
                        <div className="mt-2 font-extrabold uppercase text-slate-400">{title}</div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="secondary" type="button" onClick={() => openChat(order)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Связаться с продавцом
                        </Button>
                        <Button variant="secondary" type="button" onClick={() => startReview(order)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {review ? 'Изменить отзыв' : 'Оставить отзыв'}
                        </Button>
                        {review && (
                          <Button variant="outline" type="button" onClick={() => deleteReview(order)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Удалить отзыв
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-2xl font-extrabold text-slate-950">
                      {formatPrice(order.total_price)} ₽
                    </div>
                  </div>

                  {editingOrderId === order.id && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <div className="mb-3 flex gap-1">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="rounded p-1 text-yellow-400 hover:bg-yellow-100"
                            onClick={() => setRating(value)}
                            aria-label={`${value} звезд`}
                          >
                            <Star className={`h-7 w-7 ${value <= rating ? 'fill-current' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder="Текст отзыва"
                        className="min-h-24 w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setEditingOrderId(null)}>
                          Отмена
                        </Button>
                        <Button type="button" onClick={() => saveReview(order)}>
                          Сохранить
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
