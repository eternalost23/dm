import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Favorite } from '../types'
import api from '../lib/api'
import { Button } from '../components/ui/button'
import { getProductImage } from '../lib/productImages'
import { notifyFavoritesChanged } from '../lib/favorites'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU').format(Number(price))

export function FavoritesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchFavorites()
  }, [user, navigate])

  const fetchFavorites = async () => {
    try {
      const response = await api.get('/favorites')
      setFavorites(response.data.items || response.data)
    } catch (error) {
      console.error('Failed to load favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFavorite = async (productId: number) => {
    await api.delete(`/favorites/${productId}`)
    notifyFavoritesChanged()
    await fetchFavorites()
  }

  if (!user) return null

  return (
    <div className="bg-slate-100 py-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-6 flex items-center gap-2">
          <Heart className="h-7 w-7" />
          <h1 className="text-3xl font-extrabold text-slate-950">Избранное</h1>
        </div>

      {loading ? (
        <div className="rounded-3xl bg-white py-12 text-center text-slate-500">Загрузка...</div>
      ) : favorites.length === 0 ? (
        <div className="rounded-3xl bg-white py-12 text-center text-slate-500">
          В избранном пока ничего нет.
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((favorite) => {
            const product = favorite.product
            if (!product) return null

            return (
              <article key={favorite.id} className="rounded-3xl bg-white px-6 py-4">
                <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)_160px]">
                  <Link to={`/products/${product.id}`} className="h-28 w-28 overflow-hidden rounded-lg bg-slate-100">
                    <img src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover" />
                  </Link>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-500">{product.seller_username || 'Продавец'}</div>
                    <Link to={`/products/${product.id}`} className="mt-2 block font-extrabold uppercase text-slate-800 hover:text-blue-600">
                      {product.title}
                    </Link>
                    <div className="mt-3 text-2xl font-extrabold">{formatPrice(product.price)} ₽</div>
                  </div>
                  <div className="flex items-center justify-end">
                    <Button variant="outline" onClick={() => removeFavorite(product.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Убрать
                    </Button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
