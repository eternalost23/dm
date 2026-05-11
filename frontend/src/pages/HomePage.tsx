import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Star } from 'lucide-react'
import api from '../lib/api'
import type { PopularCategory, Product } from '../types'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { fetchFavoriteProductIds, onFavoritesChanged, toggleFavoriteProduct } from '../lib/favorites'
import { getProductImage } from '../lib/productImages'
import { toAbsoluteMediaUrl } from '../lib/uploads'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU').format(Number(price))

const getSalesLabel = (count: number) =>
  count >= 1000 ? `Продано ${(count / 1000).toFixed(1)} тыс.` : `Продано ${count}`

function ProductCard({
  product,
  favoriteIds,
  onFavoriteChange,
}: {
  product: Product
  favoriteIds: Set<number>
  onFavoriteChange: () => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isFavorite = favoriteIds.has(product.id)

  const toggleFavorite = async (event: MouseEvent) => {
    event.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }

    try {
      await toggleFavoriteProduct(product.id, isFavorite)
      onFavoriteChange()
    } catch (error) {
      console.error('Не удалось обновить избранное:', error)
    }
  }

  return (
    <article className="group min-w-0">
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
          <img
            src={getProductImage(product)}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
          />
          <button
            type="button"
            className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 shadow-sm transition ${
              isFavorite ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'
            }`}
            aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            onClick={toggleFavorite}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </Link>
      <div className="mt-3">
        <div className="text-2xl font-extrabold leading-none text-slate-950">
          {formatPrice(product.price)} ₽
        </div>
        <Link
          to={`/products/${product.id}`}
          className="mt-2 line-clamp-2 block min-h-10 text-base font-semibold leading-5 text-blue-600 hover:text-blue-700"
        >
          {product.title}
        </Link>
        <div className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-400">
          <span>{getSalesLabel(product.purchases_count)}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-slate-500">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {product.rating ?? '—'}
          </span>
        </div>
        <Link to={`/products/${product.id}`} className="mt-3 block">
          <Button className="h-10 w-full rounded-md bg-blue-500 text-base font-bold hover:bg-blue-600">
            Купить
          </Button>
        </Link>
      </div>
    </article>
  )
}

export function HomePage() {
  const { user } = useAuth()
  const [salesLeaders, setSalesLeaders] = useState<Product[]>([])
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    refreshFavorites()
    return onFavoritesChanged(refreshFavorites)
  }, [user])

  const refreshFavorites = async () => {
    if (!user) {
      setFavoriteIds(new Set())
      return
    }

    try {
      setFavoriteIds(await fetchFavoriteProductIds())
    } catch (error) {
      console.error('Не удалось загрузить избранное:', error)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [leadersResponse, popularResponse] = await Promise.all([
        api.get('/products', { params: { sort: 'sales' } }),
        api.get('/categories/popular', { params: { limit: 16 } }),
      ])
      setSalesLeaders((leadersResponse.data.items || leadersResponse.data).slice(0, 10))
      setPopularCategories(popularResponse.data.items || popularResponse.data)
    } catch (error) {
      console.error('Не удалось загрузить главную:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <section className="rounded-3xl bg-white px-5 py-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-extrabold text-slate-950">Популярное</h1>
            <Link to="/search">
              <Button variant="secondary" size="sm">Все</Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {popularCategories.map((category) => (
              <Link
                key={category.id}
                to={`/search?category_id=${category.id}`}
                className="group min-w-0 text-center"
                title={`${category.root_name}: ${category.name}`}
              >
                <div className="aspect-[4/5] overflow-hidden rounded-lg bg-slate-100 ring-offset-2 transition group-hover:ring-2 group-hover:ring-blue-400">
                  {category.image_url ? (
                    <img
                      src={toAbsoluteMediaUrl(category.image_url)}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <img src="/images/sgc.jpg" alt={category.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="mt-2 line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-700">
                  {category.name}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-3xl bg-white px-5 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-slate-950">Лидеры продаж</h2>
            <Link to="/search?sort=sales">
              <Button variant="secondary" size="sm">
                Все
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-500">Загрузка...</div>
          ) : salesLeaders.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {salesLeaders.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  favoriteIds={favoriteIds}
                  onFavoriteChange={refreshFavorites}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">Товары не найдены</div>
          )}
        </section>
      </div>
    </div>
  )
}
