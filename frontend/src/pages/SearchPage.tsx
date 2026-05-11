import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Grid2X2, Heart, Home, List, SlidersHorizontal } from 'lucide-react'
import api from '../lib/api'
import type { Category, Product } from '../types'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'
import { fetchFavoriteProductIds, onFavoritesChanged, toggleFavoriteProduct } from '../lib/favorites'
import { getProductImage } from '../lib/productImages'
import { toAbsoluteMediaUrl } from '../lib/uploads'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU').format(Number(price))

const getSalesLabel = (count: number) => {
  return count >= 1000
    ? `Продано ${(count / 1000).toFixed(1)} тыс.`
    : `Продано ${count}`
}

const getCategoryPathText = (product: Product) =>
  product.category_path?.map((category) => category.name).join(' / ') || ''

export function SearchPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const categoryId = searchParams.get('category_id')
  const sort = searchParams.get('sort')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchSearchData()
  }, [query, categoryId, sort])

  useEffect(() => {
    refreshFavorites()
    return onFavoritesChanged(refreshFavorites)
  }, [user])

  const fetchSearchData = async () => {
    setLoading(true)
    setSelectedCategoryId(null)
    try {
      const params: Record<string, string | number> = {}
      if (query) params.search = query
      if (categoryId) params.category_id = Number(categoryId)
      if (sort) params.sort = sort

      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get('/products', { params }),
        api.get('/categories'),
      ])
      setProducts(productsResponse.data.items || productsResponse.data)
      setCategories(categoriesResponse.data.items || categoriesResponse.data)
    } catch (error) {
      console.error('Failed to search products:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshFavorites = async () => {
    if (!user) {
      setFavoriteIds(new Set())
      return
    }
    setFavoriteIds(await fetchFavoriteProductIds())
  }

  const toggleFavorite = async (product: Product) => {
    if (!user) {
      navigate('/login')
      return
    }
    await toggleFavoriteProduct(product.id, favoriteIds.has(product.id))
    await refreshFavorites()
  }

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const selectedPageCategory = categoryId ? categoryById.get(Number(categoryId)) || null : null

  const mainCategory = useMemo(() => {
    if (selectedPageCategory) return selectedPageCategory
    const firstProduct = products[0]
    if (!firstProduct?.category_path?.length) return null

    const categoryFromPath = firstProduct.category_path[1] || firstProduct.category_path[0]
    return categoryById.get(categoryFromPath.id) || null
  }, [products, categoryById, selectedPageCategory])

  const rootCategory = useMemo(() => {
    if (selectedPageCategory?.parent_id) {
      let current: Category | undefined = selectedPageCategory
      while (current?.parent_id) {
        current = categoryById.get(current.parent_id)
      }
      return current || null
    }

    const firstProduct = products[0]
    if (!firstProduct?.category_path?.length) return selectedPageCategory
    return categoryById.get(firstProduct.category_path[0].id) || firstProduct.category_path[0]
  }, [products, selectedPageCategory, categoryById])

  const categoryFilters = useMemo(() => {
    if (selectedPageCategory && selectedPageCategory.parent_id == null) {
      return categories
        .filter((category) => category.parent_id === selectedPageCategory.id)
        .map((category) => ({
          id: category.id,
          name: category.name,
          count: products.filter((product) =>
            product.category_path?.some((pathItem) => pathItem.id === category.id),
          ).length,
        }))
        .filter((category) => category.count > 0)
        .sort((a, b) => b.count - a.count)
    }

    const counts = new Map<number, { id: number; name: string; count: number }>()

    products.forEach((product) => {
      const leaf = product.category_path?.[product.category_path.length - 1]
      if (!leaf) return

      const current = counts.get(leaf.id)
      counts.set(leaf.id, {
        id: leaf.id,
        name: leaf.name,
        count: (current?.count || 0) + 1,
      })
    })

    return Array.from(counts.values()).sort((a, b) => b.count - a.count)
  }, [products])

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === null) return products
    return products.filter((product) =>
      product.category_path?.some((category) => category.id === selectedCategoryId),
    )
  }, [products, selectedCategoryId])

  const bestOffers = useMemo(
    () => [...filteredProducts].sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 3),
    [filteredProducts],
  )

  const title = mainCategory?.name || (query ? `Поиск: ${query}` : 'Все товары')
  const description = mainCategory?.description ||
    (query
      ? `Результаты поиска по запросу "${query}".`
      : 'Каталог товаров от всех продавцов маркетплейса.')

  return (
    <div className="bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-blue-600">
            <Home className="h-4 w-4" />
            Главная
          </Link>
          {rootCategory && (
            <>
              <span>/</span>
              <Link to={`/search?category_id=${rootCategory.id}`} className="hover:text-blue-600">
                {rootCategory.name}
              </Link>
            </>
          )}
          {mainCategory && mainCategory.id !== rootCategory?.id && (
            <>
              <span>/</span>
              <Link to={`/search?category_id=${mainCategory.id}`} className="text-slate-600 hover:text-blue-600">
                {mainCategory.name}
              </Link>
            </>
          )}
        </div>

        <section className="rounded-3xl bg-white p-5">
          <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
            <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
              {mainCategory?.image_url || products[0]?.image_url ? (
                <img
                  src={mainCategory?.image_url ? toAbsoluteMediaUrl(mainCategory.image_url) : getProductImage(products[0])}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-900 px-4 text-center text-lg font-bold text-white">
                  {title}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold text-slate-950">{title}</h1>
              <p className="mt-2 max-w-5xl text-base leading-7 text-slate-500">{description}</p>
              <div className="mt-5 space-y-2 text-sm">
                <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                  <span className="text-slate-400">Категория</span>
                  <span className="border-b border-dashed border-slate-200 pb-1 text-slate-700">
                    {rootCategory?.name || 'Все'}{mainCategory && mainCategory.id !== rootCategory?.id ? ` / ${mainCategory.name}` : ''}
                  </span>
                </div>
                <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2">
                  <span className="text-slate-400">Найдено</span>
                  <span className="border-b border-dashed border-slate-200 pb-1 text-slate-700">
                    {products.length} товаров
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {bestOffers.length > 0 && (
          <section className="mt-3 rounded-3xl bg-white p-5">
            <h2 className="text-xl font-extrabold text-slate-950">Лучшее предложение</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {bestOffers.map((product, index) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className={`grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-lg p-2 transition hover:bg-blue-50 ${
                    index === 0 ? 'bg-blue-600 text-white hover:bg-blue-600' : ''
                  }`}
                >
                  <div className="aspect-square overflow-hidden rounded-md bg-slate-100">
                    <img src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-extrabold">{formatPrice(product.price)} ₽</div>
                    <div className="mt-1 line-clamp-2 text-sm font-bold">{product.title}</div>
                    <div className={`mt-1 line-clamp-1 text-xs ${index === 0 ? 'text-blue-100' : 'text-slate-400'}`}>
                      {getCategoryPathText(product)}
                    </div>
                    <div className={`mt-1 text-sm ${index === 0 ? 'text-blue-100' : 'text-slate-400'}`}>
                      {getSalesLabel(product.purchases_count)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-3 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl bg-white p-5">
            <h2 className="font-extrabold text-slate-800">Категории</h2>
            <div className="mt-4 space-y-3 text-sm">
              <button
                type="button"
                className={`flex w-full items-center justify-between text-left ${
                  selectedCategoryId === null ? 'font-bold text-blue-600' : 'text-slate-600'
                }`}
                onClick={() => setSelectedCategoryId(null)}
              >
                <span>Все предложения</span>
                <span>{products.length}</span>
              </button>
              {categoryFilters.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 text-left ${
                    selectedCategoryId === category.id ? 'font-bold text-blue-600' : 'text-slate-600'
                  }`}
                  onClick={() => setSelectedCategoryId(category.id)}
                >
                  <span className="line-clamp-2">{category.name}</span>
                  <span className="text-slate-400">{category.count}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-3xl bg-white p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
              <div className="text-slate-500">
                Найдено товаров: <span className="font-extrabold text-slate-950">{filteredProducts.length}</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                <SlidersHorizontal className="h-4 w-4" />
                Популярные
                <List className="h-4 w-4" />
                <Grid2X2 className="h-5 w-5 text-slate-800" />
              </div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-slate-500">Загрузка...</div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <article key={product.id} className="min-w-0">
                    <Link to={`/products/${product.id}`}>
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                        <img src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md bg-white/90 ${
                            favoriteIds.has(product.id) ? 'text-blue-600' : 'text-slate-400'
                          }`}
                          onClick={(event) => {
                            event.preventDefault()
                            toggleFavorite(product)
                          }}
                          aria-label="Избранное"
                        >
                          <Heart className={`h-5 w-5 ${favoriteIds.has(product.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </Link>
                    <div className="mt-3 text-xl font-extrabold text-slate-950">
                      {formatPrice(product.price)} ₽
                    </div>
                    <Link
                      to={`/products/${product.id}`}
                      className="mt-1 line-clamp-2 block min-h-10 font-bold leading-5 text-slate-950 hover:text-blue-600"
                    >
                      {product.title}
                    </Link>
                    <div className="mt-1 line-clamp-1 text-xs font-medium text-slate-400">
                      {getCategoryPathText(product)}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {getSalesLabel(product.purchases_count)}
                    </div>
                    <Link to={`/products/${product.id}`} className="mt-3 block">
                      <Button className="h-10 w-full rounded-md bg-blue-500 text-base font-bold hover:bg-blue-600">
                        Купить
                      </Button>
                    </Link>
                  </article>
                ))}
              </div>
            )}

            {!loading && filteredProducts.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                Ничего не найдено.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
