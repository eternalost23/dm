import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { BarChart3, Boxes, FolderTree, Plus, RefreshCw, Save, Trash2, Users } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import type { AdminStats, Category, Product, User } from '../types'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { toAbsoluteMediaUrl } from '../lib/uploads'

type AdminTab = 'overview' | 'categories' | 'products' | 'users'
type AdminChartMetric =
  | 'sales'
  | 'orders'
  | 'new_users'

type AdminChartPoint = {
  period: string
  value: number
}

const emptyCategory = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
}

function AdminMetricChart({
  data,
  mode,
}: {
  data: AdminChartPoint[]
  mode: 'day' | 'month'
}) {
  const max = Math.max(...data.map((item) => item.value), 1)
  const roundedMax = Math.ceil(max / 5) * 5 || 5
  const yTicks = Array.from({ length: 6 }, (_, index) => roundedMax - (roundedMax / 5) * index)
  const xLabelStep = data.length <= 14 ? 1 : Math.ceil(data.length / 12)

  return (
    <div className="grid h-96 grid-cols-[70px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_44px]">
      <div className="relative border-r border-slate-200 pr-3">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-sm font-semibold text-slate-600">
          Значение
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
        <div className="absolute inset-x-4 bottom-0 z-10 flex h-full items-end gap-1">
          {data.map((item) => {
            const height = item.value > 0 ? `${Math.max(6, (item.value / roundedMax) * 280)}px` : 0
            const label = new Date(item.period).toLocaleDateString('ru-RU', mode === 'month'
              ? { month: 'long', year: 'numeric' }
              : { day: '2-digit', month: 'short' })

            return (
              <div key={item.period} className="group relative flex min-w-0 flex-1 justify-center">
                <div className="w-[72%] rounded-t-sm bg-blue-400 transition-colors group-hover:bg-blue-500" style={{ height }} />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 hidden w-48 -translate-x-1/2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm shadow-lg group-hover:block">
                  <div className="font-medium text-slate-800">Дата: {label}</div>
                  <div className="mt-1 text-slate-700">Значение: <b>{item.value.toLocaleString('ru-RU')}</b></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div />
      <div className="relative overflow-hidden px-4 pt-3">
        <div className="absolute inset-x-4 top-3 flex gap-1">
          {data.map((item, index) => {
            const label = new Date(item.period).toLocaleDateString('ru-RU', mode === 'month'
              ? { month: 'short' }
              : { day: '2-digit', month: 'short' })
            return (
              <div key={item.period} className="min-w-0 flex-1 text-center">
                {(index % xLabelStep === 0 || index === data.length - 1) && (
                  <span className="inline-block rotate-45 whitespace-nowrap text-xs text-slate-500">
                    {label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [chartMetric, setChartMetric] = useState<AdminChartMetric>('sales')
  const [chartMode, setChartMode] = useState<'day' | 'month'>('day')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [quickRangeDays, setQuickRangeDays] = useState<7 | 30 | 90>(7)
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [savingCategory, setSavingCategory] = useState(false)
  const [loading, setLoading] = useState(true)

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Обзор', icon: BarChart3 },
      { id: 'categories' as const, label: 'Категории', icon: FolderTree },
      { id: 'products' as const, label: 'Товары', icon: Boxes },
      { id: 'users' as const, label: 'Пользователи', icon: Users },
    ],
    [],
  )

  const chartMetrics = useMemo(
    () => [
      { id: 'sales' as const, label: 'Продажи, ₽', source: 'daily_sales' as const },
      { id: 'orders' as const, label: 'Количество заказов', source: 'daily_orders' as const },
      { id: 'new_users' as const, label: 'Новые пользователи', source: 'daily_new_users' as const },
    ],
    [],
  )

  const activeChartMetric = chartMetrics.find((item) => item.id === chartMetric) || chartMetrics[0]

  useEffect(() => {
    if (!dateFrom && !dateTo) {
      applyQuickRange(7)
      return
    }

    if (user?.role === 'admin') {
      fetchAdminData()
    }
  }, [user, dateFrom, dateTo])

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const [statsResponse, categoriesResponse, productsResponse, usersResponse] = await Promise.all([
        api.get('/admin/stats', { params }),
        api.get('/admin/categories'),
        api.get('/admin/products'),
        api.get('/admin/users'),
      ])
      setStats(statsResponse.data)
      setCategories(categoriesResponse.data)
      setProducts(productsResponse.data)
      setUsers(usersResponse.data)
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setLoading(false)
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

  const chartData = useMemo<AdminChartPoint[]>(() => {
    if (!stats) return []
    const source = stats[activeChartMetric.source]
    if (chartMode === 'day') return source

    const grouped = new Map<string, AdminChartPoint>()
    source.forEach((item) => {
      const date = new Date(item.period)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      const current = grouped.get(key)
      grouped.set(key, {
        period: key,
        value: (current?.value || 0) + item.value,
      })
    })
    return Array.from(grouped.values()).sort((a, b) => a.period.localeCompare(b.period))
  }, [stats, activeChartMetric.source, chartMode])

  const quickRangeButtonClass = (days: 7 | 30 | 90) =>
    `px-4 text-sm font-bold ${quickRangeDays === days ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-50'}`

  const createCategory = async (event: FormEvent) => {
    event.preventDefault()
    setSavingCategory(true)
    try {
      await api.post('/admin/categories', {
        name: categoryForm.name,
        slug: categoryForm.slug,
        description: categoryForm.description || null,
        image_url: categoryForm.image_url || null,
      })
      setCategoryForm(emptyCategory)
      await fetchAdminData()
    } catch (error) {
      console.error('Failed to create category:', error)
    } finally {
      setSavingCategory(false)
    }
  }

  const updateCategory = async (category: Category, data: Partial<Category>) => {
    await api.patch(`/admin/categories/${category.id}`, data)
    await fetchAdminData()
  }

  const deleteCategory = async (category: Category) => {
    if (!confirm(`Удалить категорию "${category.name}"? Если в ней есть товары, категория и товары будут скрыты.`)) return
    await api.delete(`/admin/categories/${category.id}`)
    await fetchAdminData()
  }

  const toggleProduct = async (product: Product) => {
    await api.patch(`/admin/products/${product.id}`, { is_active: !product.is_active })
    await fetchAdminData()
  }

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Удалить товар "${product.title}"? Связанные ключи, избранное и чаты будут удалены.`)) return
    await api.delete(`/admin/products/${product.id}`)
    await fetchAdminData()
  }

  const toggleUser = async (targetUser: User) => {
    await api.patch(`/admin/users/${targetUser.id}`, { is_active: !targetUser.is_active })
    await fetchAdminData()
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-center text-slate-500">Доступ только для администратора.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="text-center">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Админ-панель</h1>
          <p className="mt-1 text-slate-500">Управление маркетплейсом</p>
        </div>
        <Button variant="outline" onClick={fetchAdminData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Обновить
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant={tab === item.id ? 'default' : 'outline'}
              onClick={() => setTab(item.id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          )
        })}
      </div>

      {tab === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Пользователи', stats.users_count],
            ['Продавцы', stats.sellers_count],
            ['Категории', stats.categories_count],
            ['Товары', stats.products_count],
            ['Активные товары', stats.active_products_count],
            ['Заказы', stats.orders_count],
            ['Оплаченные заказы', stats.paid_orders_count],
            ['Отзывы', stats.reviews_count],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-950">{value}</div>
              </CardContent>
            </Card>
          ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Статистика данных</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ['Покупатели', stats.buyers_count],
                ['Продавцы', stats.sellers_count],
                ['Активные товары', stats.active_products_count],
                ['Ключи в наличии', stats.available_digital_items_count],
                ['Оплаченные заказы', stats.paid_orders_count],
                ['Избранное', stats.favorites_count],
              ].map(([label, value]) => {
                const max = Math.max(
                  stats.users_count,
                  stats.products_count,
                  stats.digital_items_count,
                  stats.orders_count,
                  stats.favorites_count,
                  1,
                )
                const width = `${Math.max(6, (Number(value) / max) * 100)}%`

                return (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm font-semibold">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>График показателей</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={chartMetric}
                  onChange={(event) => setChartMetric(event.target.value as AdminChartMetric)}
                  className="h-11 rounded-md border border-input px-3 text-sm font-bold text-slate-700"
                >
                  {chartMetrics.map((metric) => (
                    <option key={metric.id} value={metric.id}>
                      {metric.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-11 rounded-md border border-input px-3 text-sm"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-11 rounded-md border border-input px-3 text-sm"
                />
                <div className="flex h-11 overflow-hidden rounded-md border border-input">
                  <button type="button" className={quickRangeButtonClass(7)} onClick={() => applyQuickRange(7)}>7 дней</button>
                  <button type="button" className={`border-l ${quickRangeButtonClass(30)}`} onClick={() => applyQuickRange(30)}>30 дней</button>
                  <button type="button" className={`border-l ${quickRangeButtonClass(90)}`} onClick={() => applyQuickRange(90)}>90 дней</button>
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
            </CardHeader>
            <CardContent>
              <AdminMetricChart data={chartData} mode={chartMode} />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Новая категория
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createCategory}>
                <Input
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                  placeholder="Название"
                  required
                />
                <Input
                  value={categoryForm.slug}
                  onChange={(event) => setCategoryForm({ ...categoryForm, slug: event.target.value })}
                  placeholder="Slug"
                  required
                />
                <textarea
                  value={categoryForm.description}
                  onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })}
                  placeholder="Описание"
                  className="min-h-24 w-full rounded-md border border-input px-3 py-2"
                />
                <Input
                  value={categoryForm.image_url}
                  onChange={(event) => setCategoryForm({ ...categoryForm, image_url: event.target.value })}
                  placeholder="URL картинки"
                />
                <Button className="w-full" disabled={savingCategory}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingCategory ? 'Сохранение...' : 'Создать'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Image</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3 text-slate-500">{category.description || '-'}</td>
                    <td className="px-4 py-3">
                      {category.image_url ? (
                        <img src={toAbsoluteMediaUrl(category.image_url)} alt={category.name} className="h-10 w-10 rounded object-cover" />
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const description = prompt('Category description', category.description || '')
                          if (description !== null) updateCategory(category, { description })
                        }}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteCategory(category)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Purchases</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 font-medium">{product.title}</td>
                  <td className="px-4 py-3">{Number(product.price).toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3">{product.purchases_count}</td>
                  <td className="px-4 py-3">
                    <Badge variant={product.is_active ? 'default' : 'secondary'}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => toggleProduct(product)}>
                      {product.is_active ? 'Скрыть' : 'Показать'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteProduct(product)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.username}</div>
                    <div className="text-slate-500">{item.email}</div>
                  </td>
                  <td className="px-4 py-3">{item.role}</td>
                  <td className="px-4 py-3">
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.id === user.id}
                      onClick={() => toggleUser(item)}
                    >
                      {item.is_active ? 'Disable' : 'Enable'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
