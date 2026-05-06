import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import api from '../lib/api'
import type { Product, Category } from '../types'
import { Button } from '../components/ui/button'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU').format(Number(price))

const getSalesLabel = (productId: number) => {
  const fakeSales = productId * 37 + 63
  return fakeSales >= 1000
    ? `Продано ${(fakeSales / 1000).toFixed(1)} тыс.`
    : `Продано ${fakeSales}+`
}

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [selectedCategory])

  const fetchProducts = async () => {
    try {
      const params = selectedCategory ? { category_id: selectedCategory } : {}
      const response = await api.get('/products', { params })
      setProducts(response.data.items || response.data)
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.items || response.data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-3 text-3xl font-bold text-slate-950">Digital Market</h1>
        <p className="mb-6 text-slate-500">
          Discover and purchase digital products from our marketplace
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => (
          <article key={product.id} className="group min-w-0">
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
                  onClick={(event) => event.preventDefault()}
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
                {getSalesLabel(product.id)}
              </div>
              <Link to={`/products/${product.id}`} className="mt-3 block">
                <Button className="h-10 w-full rounded-md bg-blue-500 text-base font-bold hover:bg-blue-600">
                  Купить
                </Button>
              </Link>
            </div>
          </article>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No products found</p>
        </div>
      )}
    </div>
  )
}
