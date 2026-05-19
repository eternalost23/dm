import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import type { Product, Category, DigitalItem } from '../types'
import api from '../lib/api'
import { uploadFile } from '../lib/uploads'
import { getProductImage } from '../lib/productImages'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Plus, Edit, Trash2, FolderPlus, Paperclip, KeyRound, X } from 'lucide-react'

type SellerOrder = {
  id: number
  buyer_id: number
  product_id: number
  digital_item_id?: number | null
  status: 'pending' | 'paid' | 'cancelled'
  total_price: number
  created_at: string
  product_title?: string | null
  product_title_snapshot?: string | null
  buyer_email: string
}

type ChartPoint = {
  period: string
  label: string
  fullLabel: string
  value: number
  count: number
}

const productSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  category_id: z.number().min(1, 'Please select a category'),
  image_url: z.string().optional(),
})

type ProductForm = z.infer<typeof productSchema>

export function SellerPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'sales' ? 'sales' : 'products'
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [quickRangeDays, setQuickRangeDays] = useState<7 | 30 | 90 | null>(7)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [chartMode, setChartMode] = useState<'day' | 'month'>('day')
  const [hoveredChartPoint, setHoveredChartPoint] = useState<ChartPoint | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    parent_id: '',
    description: '',
    image_url: '',
  })
  const [keyManagerProduct, setKeyManagerProduct] = useState<Product | null>(null)
  const [productKeys, setProductKeys] = useState<DigitalItem[]>([])
  const [keyText, setKeyText] = useState('')
  const [keysLoading, setKeysLoading] = useState(false)
  const [keysSaving, setKeysSaving] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  })

  useEffect(() => {
    if (user?.role === 'seller') {
      fetchData()
    }
  }, [user, dateFrom, dateTo])

  useEffect(() => {
    if (!dateFrom && !dateTo) {
      applyQuickRange(7)
    }
  }, [dateFrom, dateTo])

  const fetchData = async () => {
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get('/seller/products'),
        api.get('/categories')
      ])

      setProducts(productsResponse.data.items || productsResponse.data)
      setCategories(categoriesResponse.data.items || categoriesResponse.data)
      if (user?.role === 'seller') {
        const params: Record<string, string> = {}
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
        const [ordersResponse] = await Promise.all([
          api.get('/seller/orders', { params }),
        ])
        setOrders(ordersResponse.data.items || ordersResponse.data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ProductForm) => {
    try {
      const uploadedImage = selectedImage ? await uploadFile(selectedImage) : null
      const productData = {
        ...data,
        image_url: uploadedImage?.url || data.image_url || undefined,
      }

      if (editingProduct) {
        await api.patch(`/seller/products/${editingProduct.id}`, productData)
      } else {
        await api.post('/seller/products', productData)
      }

      await fetchData()
      setShowForm(false)
      setEditingProduct(null)
      setSelectedImage(null)
      reset()
    } catch (error) {
      console.error('Failed to save product:', error)
    }
  }

  const getCategoryLabel = (category: Category) => {
    const categoryById = new Map(categories.map((item) => [item.id, item]))
    const names = [category.name]
    let parentId = category.parent_id

    while (parentId) {
      const parent = categoryById.get(parentId)
      if (!parent) break
      names.unshift(parent.name)
      parentId = parent.parent_id
    }

    return names.join(' / ')
  }

  const handleCreateCategory = async () => {
    try {
      const response = await api.post('/seller/categories', {
        name: newCategory.name,
        slug: newCategory.slug,
        parent_id: newCategory.parent_id ? Number(newCategory.parent_id) : null,
        description: newCategory.description || null,
        image_url: newCategory.image_url || null,
      })

      const createdCategory = response.data
      await fetchData()
      setValue('category_id', createdCategory.id)
      setNewCategory({
        name: '',
        slug: '',
        parent_id: '',
        description: '',
        image_url: '',
      })
      setShowCategoryForm(false)
    } catch (error: any) {
      console.error('Failed to create category:', error)
      alert(error.response?.data?.detail || 'Failed to create category')
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setValue('title', product.title)
    setValue('description', product.description || '')
    setValue('price', product.price)
    setValue('category_id', product.category_id)
    setShowForm(true)
  }

  const handleDelete = async (productId: number) => {
    if (confirm('Удалить товар? Связанные ключи, избранное и чаты по товару тоже будут удалены.')) {
      try {
        await api.delete(`/seller/products/${productId}`)
        await fetchData()
      } catch (error) {
        console.error('Failed to delete product:', error)
      }
    }
  }

  const toggleProductStatus = async (product: Product) => {
    try {
      await api.patch(`/seller/products/${product.id}`, {
        is_active: !product.is_active
      })
      await fetchData()
    } catch (error) {
      console.error('Failed to toggle product status:', error)
    }
  }

  const loadProductKeys = async (product: Product) => {
    setKeyManagerProduct(product)
    setKeyText('')
    setKeyError(null)
    setKeysLoading(true)

    try {
      const response = await api.get(`/seller/products/${product.id}/items`)
      setProductKeys(response.data.items || response.data)
    } catch (error: any) {
      console.error('Failed to load product keys:', error)
      setProductKeys([])
      setKeyError(error.response?.data?.detail || 'Не удалось загрузить ключи')
    } finally {
      setKeysLoading(false)
    }
  }

  const closeKeyManager = () => {
    setKeyManagerProduct(null)
    setProductKeys([])
    setKeyText('')
    setKeyError(null)
  }

  const addProductKeys = async (event: FormEvent) => {
    event.preventDefault()
    if (!keyManagerProduct) return

    const keys = Array.from(
      new Set(keyText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)),
    )

    if (keys.length === 0) {
      setKeyError('Введите хотя бы один ключ.')
      return
    }

    setKeysSaving(true)
    setKeyError(null)

    try {
      await Promise.all(
        keys.map((content) => api.post(`/seller/products/${keyManagerProduct.id}/items`, { content })),
      )
      const response = await api.get(`/seller/products/${keyManagerProduct.id}/items`)
      setProductKeys(response.data.items || response.data)
      setKeyText('')
    } catch (error: any) {
      console.error('Failed to add product keys:', error)
      setKeyError(error.response?.data?.detail || 'Не удалось добавить ключи')
    } finally {
      setKeysSaving(false)
    }
  }

  const applyQuickRange = (days: 7 | 30 | 90) => {
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - days + 1)
    setQuickRangeDays(days)
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(to.toISOString().slice(0, 10))
  }

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const createdAt = new Date(order.created_at)
    if (selectedProductId && order.product_id !== Number(selectedProductId)) return false
    if (dateFrom && createdAt < new Date(`${dateFrom}T00:00:00`)) return false
    if (dateTo && createdAt > new Date(`${dateTo}T23:59:59`)) return false
    return true
  }), [orders, selectedProductId, dateFrom, dateTo])

  const paidFilteredOrders = useMemo(
    () => filteredOrders.filter((order) => order.status === 'paid'),
    [filteredOrders],
  )

  const salesRevenue = useMemo(
    () => paidFilteredOrders.reduce((sum, order) => sum + Number(order.total_price || 0), 0),
    [paidFilteredOrders],
  )

  const chartPoints = useMemo<ChartPoint[]>(() => {
    const points = new Map<string, ChartPoint>()
    const ruDate = new Intl.DateTimeFormat('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const ruMonth = new Intl.DateTimeFormat('ru-RU', {
      month: 'long',
      year: 'numeric',
    })

    const buildPoint = (date: Date, value = 0, count = 0): ChartPoint => ({
      period: chartMode === 'month'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().slice(0, 10),
      label: chartMode === 'month'
        ? date.toLocaleDateString('ru-RU', { month: 'short' })
        : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      fullLabel: chartMode === 'month' ? ruMonth.format(date) : ruDate.format(date),
      value,
      count,
    })

    const today = dateTo ? new Date(`${dateTo}T00:00:00`) : new Date()
    today.setHours(0, 0, 0, 0)
    const startDate = new Date(today)
    const rangeDays = dateFrom && dateTo
      ? Math.max(1, Math.round((today.getTime() - new Date(`${dateFrom}T00:00:00`).getTime()) / 86400000) + 1)
      : (quickRangeDays || 7)
    startDate.setDate(today.getDate() - rangeDays + 1)
    startDate.setHours(0, 0, 0, 0)

    const cursor = new Date(startDate > today ? today : startDate)
    while (cursor <= today) {
      const emptyPoint = buildPoint(cursor)
      points.set(emptyPoint.period, emptyPoint)
      if (chartMode === 'month') {
        cursor.setMonth(cursor.getMonth() + 1, 1)
      } else {
        cursor.setDate(cursor.getDate() + 1)
      }
    }

    paidFilteredOrders.forEach((order) => {
      const date = new Date(order.created_at)
      const key = chartMode === 'month'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().slice(0, 10)
      const current = points.get(key)
      const value = Number(order.total_price || 0)
      const basePoint = current || buildPoint(date)

      points.set(key, {
        ...basePoint,
        value: (current?.value || 0) + value,
        count: (current?.count || 0) + 1,
      })
    })

    return Array.from(points.values()).sort((a, b) => a.period.localeCompare(b.period))
  }, [paidFilteredOrders, chartMode, dateFrom, dateTo, quickRangeDays])

  const chartMax = Math.max(...chartPoints.map((point) => point.value), 1)
  const roundedChartMax = Math.ceil(chartMax / 5) * 5 || 5
  const yTicks = Array.from({ length: 6 }, (_, index) => roundedChartMax - (roundedChartMax / 5) * index)
  const xLabelStep = chartPoints.length <= 7 ? 1 : chartPoints.length <= 30 ? 2 : Math.ceil(chartPoints.length / 12)
  const selectedProductsCount = selectedProductId ? 1 : products.length
  const quickRangeButtonClass = (days: 7 | 30 | 90) =>
    `border-l px-4 text-sm font-bold ${
      quickRangeDays === days ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-50'
    }`
  const availableKeysCount = productKeys.filter((item) => !item.is_sold).length
  const soldKeysCount = productKeys.length - availableKeysCount

  if (!user || user.role !== 'seller') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500">Доступ только для продавца.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="bg-slate-100 py-8">
      <div className="container mx-auto px-4">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-slate-950">Рабочее место продавца</h1>
        {activeTab === 'products' && (
          <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить товар
          </Button>
        )}
      </div>

      {/* Add/Edit Product Form */}
      {activeTab === 'products' && showForm && (
        <Card className="mb-8 rounded-3xl">
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Редактировать товар' : 'Новый товар'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  {...register('title')}
                  placeholder="Название товара"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <textarea
                  {...register('description')}
                  placeholder="Описание товара"
                  className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md"
                />
              </div>

              <div>
                <Input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="Цена, ₽"
                  className={errors.price ? 'border-red-500' : ''}
                />
                {errors.price && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.price.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex gap-2">
                  <select
                    {...register('category_id', { valueAsNumber: true })}
                    className="min-w-0 flex-1 rounded-md border border-input px-3 py-2"
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {getCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCategoryForm(!showCategoryForm)}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.category_id && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.category_id.message}
                  </p>
                )}
              </div>

              {showCategoryForm && (
                <div className="rounded-lg border bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-700">
                    Создать категорию
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={newCategory.name}
                      onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
                      placeholder="Название категории"
                    />
                    <Input
                      value={newCategory.slug}
                      onChange={(event) => setNewCategory({ ...newCategory, slug: event.target.value })}
                      placeholder="Slug, например rdr-steam-keys"
                    />
                    <select
                      value={newCategory.parent_id}
                      onChange={(event) => setNewCategory({ ...newCategory, parent_id: event.target.value })}
                      className="rounded-md border border-input px-3 py-2"
                    >
                      <option value="">Без родителя</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {getCategoryLabel(category)}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={newCategory.image_url}
                      onChange={(event) => setNewCategory({ ...newCategory, image_url: event.target.value })}
                      placeholder="URL картинки"
                    />
                    <textarea
                      value={newCategory.description}
                      onChange={(event) => setNewCategory({ ...newCategory, description: event.target.value })}
                      placeholder="Описание"
                      className="min-h-20 rounded-md border border-input px-3 py-2 md:col-span-2"
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      disabled={!newCategory.name || !newCategory.slug}
                      onClick={handleCreateCategory}
                    >
                      Создать и выбрать
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <label className="flex h-11 cursor-pointer items-center gap-3 rounded-md border border-input px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  <Paperclip className="h-5 w-5 text-slate-400" />
                  {selectedImage?.name || 'Прикрепить картинку'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => setSelectedImage(event.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  Картинка загружается с компьютера. При редактировании без выбора файла останется текущая.
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Сохранение...' : (editingProduct ? 'Обновить' : 'Создать')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingProduct(null)
                    reset()
                  }}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'sales' && (
        <section className="space-y-4">
          <div className="rounded-3xl bg-white p-6">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[180px] flex-1">
                <span className="text-sm font-bold text-slate-500">товары</span>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-input px-3 text-slate-700"
                >
                  <option value="">все товары</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm font-bold text-slate-500">период с</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value)
                    setQuickRangeDays(null)
                  }}
                  className="mt-2 h-11 rounded-md border border-input px-3"
                />
              </label>
              <label>
                <span className="text-sm font-bold text-slate-500">по</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value)
                    setQuickRangeDays(null)
                  }}
                  className="mt-2 h-11 rounded-md border border-input px-3"
                />
              </label>
              <div className="flex h-11 rounded-md border border-input">
                <button type="button" className={`px-4 text-sm font-bold ${quickRangeDays === 7 ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => applyQuickRange(7)}>7 дней</button>
                <button type="button" className={quickRangeButtonClass(30)} onClick={() => applyQuickRange(30)}>30 дней</button>
                <button type="button" className={quickRangeButtonClass(90)} onClick={() => applyQuickRange(90)}>90 дней</button>
              </div>
              <div className="flex h-11 items-center gap-4 rounded-md border border-input px-4 text-sm font-bold text-slate-600">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" checked={chartMode === 'day'} onChange={() => setChartMode('day')} />
                  по дням
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="radio" checked={chartMode === 'month'} onChange={() => setChartMode('month')} />
                  по месяцам
                </label>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Продаж за период', paidFilteredOrders.length],
                ['Выручка', `${salesRevenue.toLocaleString('ru-RU')} ₽`],
                ['Всего заказов', filteredOrders.length],
                ['Товаров', selectedProductsCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <div className="text-sm font-bold text-slate-500">{label}</div>
                  <div className="mt-2 text-2xl font-extrabold text-slate-950">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6">
            <h2 className="text-xl font-extrabold text-slate-950">График продаж</h2>
            <div className="mt-5 grid h-96 grid-cols-[70px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_44px]">
              <div className="relative border-r border-slate-200 pr-3">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-sm font-semibold text-slate-600">
                  Цена, ₽
                </div>
              </div>
              <div className="relative border-b border-slate-200">
                {yTicks.map((tick, index) => (
                  <div
                    key={tick}
                    className="absolute left-0 right-0 border-t border-slate-100"
                    style={{ top: `${(index / (yTicks.length - 1)) * 100}%` }}
                  >
                    <span className="absolute -left-16 -top-2 w-12 text-right text-xs text-slate-500">
                      {tick.toLocaleString('ru-RU')}
                    </span>
                  </div>
                ))}
                <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-4 bottom-0 z-10 flex h-full items-end gap-1">
                    {chartPoints.map((point) => (
                      <div
                        key={point.period}
                        className="group relative flex min-w-0 flex-1 justify-center"
                        onMouseEnter={() => setHoveredChartPoint(point)}
                        onMouseLeave={() => setHoveredChartPoint(null)}
                      >
                        <div
                          className="w-[72%] rounded-t-sm bg-blue-400 transition-colors group-hover:bg-blue-500"
                          style={{ height: point.value > 0 ? `${Math.max(6, (point.value / roundedChartMax) * 280)}px` : 0 }}
                        />
                        {hoveredChartPoint?.period === point.period && (
                          <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 w-56 -translate-x-1/2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm shadow-lg">
                            <div className="font-medium text-slate-800">Дата: {point.fullLabel}</div>
                            <div className="mt-1 flex items-center gap-2 text-slate-700">
                              <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                              <span>Цена: <b>{point.value.toLocaleString('ru-RU')} ₽</b></span>
                            </div>
                            <div className="text-xs text-slate-500">Продаж: {point.count}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div />
              <div className="relative overflow-hidden px-4 pt-3">
                <div className="absolute inset-x-4 top-3 flex gap-1">
                {chartPoints.map((point, index) => (
                  <div key={point.period} className="min-w-0 flex-1 text-center">
                    {(index % xLabelStep === 0 || index === chartPoints.length - 1) && (
                      <span className="inline-block rotate-45 whitespace-nowrap text-xs text-slate-500">
                        {point.label}
                      </span>
                    )}
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6">
            <div className="mb-4 font-extrabold text-slate-950">продаж за период: {filteredOrders.length}</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b text-slate-600">
                  <tr>
                    <th className="px-3 py-3">ID заказа</th>
                    <th className="px-3 py-3">Дата</th>
                    <th className="px-3 py-3">Название</th>
                    <th className="px-3 py-3">Покупатель</th>
                    <th className="px-3 py-3">Статус</th>
                    <th className="px-3 py-3 text-right">Оплачено</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium">{order.id}</td>
                      <td className="px-3 py-3">{new Date(order.created_at).toLocaleString('ru-RU')}</td>
                      <td className="px-3 py-3">
                        <Link to={`/products/${order.product_id}`} className="font-medium text-blue-600 hover:text-blue-700">
                          {order.product_title || order.product_title_snapshot || `Товар #${order.product_id}`}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-blue-600">{order.buyer_email}</td>
                      <td className="px-3 py-3">{order.status}</td>
                      <td className="px-3 py-3 text-right font-bold">{Number(order.total_price).toLocaleString('ru-RU')} ₽</td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-slate-500">Заказов пока нет.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Products List */}
      {activeTab === 'products' && (
      <section className="rounded-3xl bg-white p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-slate-950">Мои товары</h2>
          <p className="mt-1 text-sm text-slate-500">Управление цифровыми товарами</p>
        </div>
        {keyManagerProduct && (
          <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-lg font-extrabold text-slate-950">
                  <KeyRound className="h-5 w-5 text-blue-600" />
                  Ключи: {keyManagerProduct.title}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <Badge variant="secondary">в наличии: {availableKeysCount}</Badge>
                  <Badge variant="outline">продано: {soldKeysCount}</Badge>
                  <Badge variant="outline">всего: {productKeys.length}</Badge>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeKeyManager}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]" onSubmit={addProductKeys}>
              <textarea
                value={keyText}
                onChange={(event) => setKeyText(event.target.value)}
                placeholder="Один ключ на строку"
                className="min-h-28 rounded-md border border-input bg-white px-3 py-2 font-mono text-sm"
              />
              <Button type="submit" disabled={keysSaving || keysLoading} className="h-11 self-start">
                <KeyRound className="mr-2 h-4 w-4" />
                {keysSaving ? 'Добавление...' : 'Добавить'}
              </Button>
            </form>

            {keyError && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {keyError}
              </div>
            )}

            <div className="mt-4 max-h-72 overflow-y-auto rounded-md border bg-white">
              {keysLoading ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">Загрузка ключей...</div>
              ) : productKeys.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">Ключей для этого товара пока нет.</div>
              ) : (
                <div className="divide-y">
                  {productKeys.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <code className="break-all text-sm font-semibold text-slate-800">{item.content}</code>
                      <Badge variant={item.is_sold ? 'secondary' : 'default'}>
                        {item.is_sold ? 'продан' : 'в наличии'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
          {products.length === 0 ? (
            <p className="text-gray-500">Товаров пока нет.</p>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <article key={product.id} className="relative rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40">
                  <Link to={`/products/${product.id}`} className="absolute inset-0 rounded-3xl" aria-label={product.title} />
                  <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)_220px]">
                    <img src={getProductImage(product)} alt="" className="h-28 w-28 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="font-extrabold uppercase text-slate-800">{product.title}</h3>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Активен' : 'Скрыт'}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-gray-600">
                        {product.description}
                      </p>
                      <p className="mt-3 text-2xl font-extrabold">{Number(product.price).toLocaleString('ru-RU')} ₽</p>
                      <p className="text-sm text-gray-500">
                        Категория: {product.category?.name || product.category_path?.map((item) => item.name).join(' / ')}
                      </p>
                    </div>
                    <div className="relative z-10 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          loadProductKeys(product)
                        }}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Ключи
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleProductStatus(product)}
                      >
                        {product.is_active ? 'Скрыть' : 'Показать'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
      </section>
      )}
      </div>
    </div>
  )
}
