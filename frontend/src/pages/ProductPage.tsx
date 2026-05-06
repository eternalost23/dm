import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import type { Product, Review } from '../types'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { Heart, ShoppingBasket, Star } from 'lucide-react'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU').format(Number(price))

const getSalesLabel = (productId: number) => {
  const fakeSales = productId * 37 + 63
  return fakeSales >= 1000
    ? `Продано ${(fakeSales / 1000).toFixed(1)} тыс.`
    : `Продано ${fakeSales}+`
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description')
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

    alert('Корзина пока не реализована: можно купить товар сразу.')
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
      alert('Purchase completed successfully!')
    } catch (error: any) {
      console.error('Failed to complete purchase:', error)
      alert(error.response?.data?.detail || 'Failed to complete purchase')
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
        <section className="rounded-3xl bg-white p-6">
          <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
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
              <h1 className="text-3xl font-extrabold uppercase leading-tight text-slate-950">
                {product.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-500">
                <span>{getSalesLabel(product.id)}</span>
                <span className="text-slate-300">•</span>
                <span className="text-blue-600">Отзывы {reviews.length}</span>
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
            <span className="rounded-lg bg-slate-100 px-3 py-1 text-slate-800">
              {reviews.length}
            </span>
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
                    {review.comment && (
                      <p className="mt-2 text-slate-700">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>

              {reviews.length === 0 && (
                <p className="mt-6 text-slate-500">No reviews yet</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
