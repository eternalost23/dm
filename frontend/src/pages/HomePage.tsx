import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import api from '../lib/api'
import type { PopularCategory, Product } from '../types'
import { useAuth } from '../hooks/useAuth'
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

function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const addFavorite = async (event: MouseEvent) => {
    event.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }

    try {
      await api.post(`/favorites/${product.id}`)
    } catch (error: any) {
      if (error.response?.status !== 400) {
        console.error('Failed to add favorite:', error)
      }
    }
  }

  return (
    <article className="group min-w-0">
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
              No image
            </div>
          )}
          <button
            type="button"
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-slate-400 shadow-sm transition hover:text-blue-600"
            aria-label="Add to favorites"
            onClick={addFavorite}
          >
            <Heart className="h-5 w-5 fill-current" />
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
        <div className="mt-1 text-sm font-medium text-slate-400">
          {getSalesLabel(product.purchases_count)}
        </div>
        <div className="mt-1 line-clamp-1 text-xs font-medium text-slate-400">
          {getCategoryPathText(product)}
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
  const [salesLeaders, setSalesLeaders] = useState<Product[]>([])
  const [popularCategories, setPopularCategories] = useState<PopularCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

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
      console.error('Failed to fetch home data:', error)
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
                      src={category.image_url}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-900 px-3 text-sm font-bold text-white">
                      {category.name}
                    </div>
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
            <Link to="/search?sort=sales" className="text-sm font-bold text-blue-600 hover:text-blue-700">
              Все лидеры
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-slate-500">Loading...</div>
          ) : salesLeaders.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
              {salesLeaders.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-gray-500">No products found</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
