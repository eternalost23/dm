import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Favorite } from '../types'
import api from '../lib/api'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'

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
    await fetchFavorites()
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center gap-2">
        <Heart className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Избранное</h1>
      </div>

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : favorites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            В избранном пока ничего нет.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {favorites.map((favorite) => {
            const product = favorite.product
            if (!product) return null

            return (
              <article key={favorite.id} className="min-w-0">
                <Link to={`/products/${product.id}`} className="block">
                  <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                        No image
                      </div>
                    )}
                  </div>
                </Link>
                <div className="mt-3 text-xl font-extrabold">{formatPrice(product.price)} ₽</div>
                <Link to={`/products/${product.id}`} className="mt-1 line-clamp-2 block font-bold hover:text-blue-600">
                  {product.title}
                </Link>
                <Button className="mt-3 w-full" variant="outline" onClick={() => removeFavorite(product.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Убрать
                </Button>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
