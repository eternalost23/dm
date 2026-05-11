import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Save, Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Product } from '../types'
import api from '../lib/api'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

const roleLabel = {
  buyer: 'Покупатель',
  seller: 'Продавец',
  admin: 'Администратор',
}

type SellerStats = {
  revenue: number
  sales_count: number
  active_products_count: number
  available_keys_count: number
  average_rating: number | null
  reviews_count: number
  orders_count: number
  products_count: number
}

export function ProfilePage() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(user?.email || '')
  const [username, setUsername] = useState(user?.username || '')
  const [password, setPassword] = useState('')
  const [sellerProducts, setSellerProducts] = useState<Product[]>([])
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEmail(user?.email || '')
    setUsername(user?.username || '')
    if (user?.role === 'seller') fetchSellerData()
  }, [user, dateFrom, dateTo])

  const fetchSellerData = async () => {
    try {
      const params: Record<string, string> = {}
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const [productsResponse, statsResponse] = await Promise.all([
        api.get('/seller/products'),
        api.get('/seller/stats', { params }),
      ])
      setSellerProducts(productsResponse.data.items || productsResponse.data)
      setSellerStats(statsResponse.data)
    } catch (error) {
      console.error('Не удалось загрузить статистику продавца:', error)
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.patch('/users/me', {
        email,
        username,
        password: password || undefined,
      })
      setPassword('')
      await refreshUser()
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Не удалось сохранить профиль')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!user) {
    return <div className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-500">Войдите, чтобы открыть профиль.</div>
  }

  return (
    <div className="bg-slate-100 py-8">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-3xl bg-white p-6">
          <h1 className="text-3xl font-extrabold text-slate-950">Профиль</h1>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-500">Имя пользователя</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-500">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:border-blue-500"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-sm font-bold text-slate-500">Новый пароль</span>
              <input
                value={password}
                type="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Оставьте пустым, если пароль менять не нужно"
                className="mt-2 h-11 w-full rounded-md border border-input px-3 outline-none focus:border-blue-500"
              />
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" disabled={saving} onClick={saveProfile}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button type="button" variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </div>

          {user.role === 'seller' && (
            <div className="mt-8 border-t pt-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-950">Статистика продавца</h2>
                  <p className="mt-1 text-sm text-slate-500">Основные показатели по продажам и товарам</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-10 rounded-md border border-input px-3 text-sm"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-10 rounded-md border border-input px-3 text-sm"
                  />
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ['Общая выручка', `${Number(sellerStats?.revenue || 0).toLocaleString('ru-RU')} ₽`],
                  ['Продаж', sellerStats?.sales_count || 0],
                  ['Активных товаров', sellerStats?.active_products_count ?? sellerProducts.length],
                  ['Остаток ключей', sellerStats?.available_keys_count || 0],
                  ['Заказов', sellerStats?.orders_count || 0],
                  ['Отзывов', sellerStats?.reviews_count || 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-sm font-bold text-slate-500">{label}</div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-950">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-slate-100 bg-white p-4">
                <div className="text-sm font-bold text-slate-500">Средний рейтинг</div>
                <div className="mt-2 inline-flex items-center gap-2 text-3xl font-extrabold text-slate-950">
                  <Star className="h-7 w-7 fill-yellow-400 text-yellow-400" />
                  {sellerStats?.average_rating ?? 'Нет оценок'}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="self-start rounded-3xl bg-white p-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-extrabold text-blue-600">
              {username.slice(0, 1).toUpperCase() || user.email.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate font-extrabold text-slate-950">{username || user.email}</div>
              <div className="truncate text-sm text-slate-500">{user.email}</div>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <div className="text-sm font-bold text-slate-500">Роль</div>
            <Badge className="mt-2">{roleLabel[user.role]}</Badge>
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 p-4">
            <div className="text-sm font-bold text-slate-500">Дата регистрации</div>
            <div className="mt-1 text-lg font-extrabold text-slate-950">
              {new Date(user.created_at).toLocaleDateString('ru-RU')}
            </div>
          </div>

          {false && user?.role === 'seller' && (
            <div className="mt-6 space-y-3 border-t pt-5">
              <h2 className="font-extrabold text-slate-950">Статистика продавца</h2>
              <div className="grid gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-10 rounded-md border border-input px-3 text-sm"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-10 rounded-md border border-input px-3 text-sm"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Общая выручка</span>
                <span className="font-bold">{Number(sellerStats?.revenue || 0).toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Количество продаж</span>
                <span className="font-bold">{sellerStats?.sales_count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Активных товаров</span>
                <span className="font-bold">{sellerStats?.active_products_count ?? sellerProducts.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Остаток ключей</span>
                <span className="font-bold">{sellerStats?.available_keys_count || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Средний рейтинг</span>
                <span className="inline-flex items-center gap-1 font-bold">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {sellerStats?.average_rating ?? 'Нет оценок'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Отзывы</span>
                <span className="font-bold">{sellerStats?.reviews_count || 0}</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
