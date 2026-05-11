import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Headset, Heart, MessageSquare, Package, Search, Shield, ShoppingCart, Store, User, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Category, Favorite, Order } from '../types'
import api from '../lib/api'
import { Button } from './ui/button'
import { toAbsoluteMediaUrl } from '../lib/uploads'
import { CART_CHANGED_EVENT, getCartItems } from '../lib/cart'

type NavAction = {
  to: string
  label: string
  icon: typeof MessageSquare
  count?: number
}

export function Navigation() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [searchFocused, setSearchFocused] = useState(false)
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [ordersCount, setOrdersCount] = useState(0)
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    refreshCounters()
    const refreshCart = () => setCartCount(getCartItems().length)
    window.addEventListener('storage', refreshCart)
    window.addEventListener(CART_CHANGED_EVENT, refreshCart)
    window.addEventListener('favorites-changed', refreshCounters)
    return () => {
      window.removeEventListener('storage', refreshCart)
      window.removeEventListener(CART_CHANGED_EVENT, refreshCart)
      window.removeEventListener('favorites-changed', refreshCounters)
    }
  }, [user])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.items || response.data)
    } catch (error) {
      console.error('Не удалось загрузить категории:', error)
    }
  }

  const refreshCounters = async () => {
    setCartCount(getCartItems().length)
    if (!user || user.role !== 'buyer') {
      setFavoritesCount(0)
      setOrdersCount(0)
      return
    }

    try {
      const [favoritesResponse, ordersResponse] = await Promise.all([
        api.get('/favorites'),
        api.get('/orders/my'),
      ])
      const favorites: Favorite[] = favoritesResponse.data.items || favoritesResponse.data
      const orders: Order[] = ordersResponse.data.items || ordersResponse.data
      setFavoritesCount(favorites.length)
      setOrdersCount(orders.length)
    } catch {
      setFavoritesCount(0)
      setOrdersCount(0)
    }
  }

  const suggestedCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    return categories
      .filter((category) => `${category.name} ${category.slug}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 9)
  }, [categories, query])

  const rootCategories = useMemo(
    () => categories.filter((category) => category.parent_id == null),
    [categories],
  )

  const showSuggestions = searchFocused && query.trim().length > 0

  const goToSearch = () => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    setSearchFocused(false)
    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`)
  }

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    goToSearch()
  }

  const openCategory = (categoryId: number) => {
    setQuery('')
    setSearchFocused(false)
    navigate(`/search?category_id=${categoryId}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const openSupportChat = async () => {
    try {
      const response = await api.post('/chats/support')
      navigate('/chats', { state: { threadId: response.data.id } })
    } catch (error) {
      console.error('Не удалось открыть чат поддержки:', error)
    }
  }

  const buyerActions: NavAction[] = [
    { to: '/chats', label: 'Чаты', icon: MessageSquare },
    { to: '/purchases', label: 'Покупки', icon: Package, count: ordersCount },
    { to: '/favorites', label: 'Избранное', icon: Heart, count: favoritesCount },
    { to: '/cart', label: 'Корзина', icon: ShoppingCart, count: cartCount },
  ]

  const sellerActions: NavAction[] = [
    { to: '/chats', label: 'Чаты', icon: MessageSquare },
    { to: '/seller', label: 'Мои товары', icon: Store },
    { to: '/seller?tab=sales', label: 'Продажи', icon: BarChart3 },
    { to: '/profile', label: 'Профиль', icon: User },
  ]

  const adminActions: NavAction[] = [
    { to: '/chats', label: 'Чаты', icon: MessageSquare },
    { to: '/admin', label: 'Админ', icon: Shield },
    { to: '/profile', label: 'Профиль', icon: User },
  ]

  const actions = user?.role === 'buyer'
    ? buyerActions
    : user?.role === 'seller'
      ? sellerActions
      : user?.role === 'admin'
        ? adminActions
        : []

  return (
    <nav className="border-b bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex min-h-16 flex-wrap items-center gap-3 py-3">
          <Link to="/" className="text-xl font-black text-white">
            Digital Market
          </Link>

          <form className="relative min-w-[260px] flex-1" onSubmit={handleSearch}>
            <div className="flex h-11 items-center rounded-lg bg-white px-3 text-slate-900 ring-2 ring-transparent focus-within:ring-blue-500">
              <input
                value={query}
                onFocus={() => setSearchFocused(true)}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Поиск по товарам"
              />
              {query && (
                <button
                  type="button"
                  className="mr-2 text-slate-300 hover:text-slate-500"
                  onClick={() => setQuery('')}
                  aria-label="Очистить поиск"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500 text-white hover:bg-orange-600"
                aria-label="Искать"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>

            {showSuggestions && (
              <div
                className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border bg-white text-slate-900 shadow-xl"
                onMouseDown={(event) => event.preventDefault()}
              >
                <div className="max-h-[520px] overflow-y-auto p-4">
                  <h2 className="mb-3 text-lg font-extrabold">Категории</h2>
                  <div className="space-y-2">
                    {suggestedCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
                        onClick={() => openCategory(category.id)}
                      >
                        <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md border bg-slate-100">
                          {category.image_url ? (
                            <img src={toAbsoluteMediaUrl(category.image_url)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-slate-400">
                              {category.name.slice(0, 2)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 font-bold text-slate-700">{category.name}</div>
                        <span className="text-slate-300">›</span>
                      </button>
                    ))}
                    {suggestedCategories.length === 0 && (
                      <div className="py-8 text-center text-sm text-slate-500">Категории не найдены</div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="m-4 mt-0 h-11 w-[calc(100%-2rem)] rounded-lg bg-slate-100 text-sm font-bold hover:bg-slate-200"
                  onClick={goToSearch}
                >
                  Показать все результаты
                </button>
              </div>
            )}
          </form>

          <div className="group/nav relative ml-auto flex items-center gap-2">
            {user ? (
              <>
                {actions.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link key={item.to} to={item.to}>
                      <Button variant="ghost" size="sm" className="relative h-12 w-24 flex-col gap-1 rounded-md bg-slate-900 px-2 text-white hover:bg-slate-800 hover:text-white">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-bold">{item.label}</span>
                        {!!item.count && (
                          <span className="absolute right-2 top-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white">
                            {item.count}
                          </span>
                        )}
                      </Button>
                    </Link>
                  )
                })}
                <div className="pointer-events-none absolute right-0 top-full z-50 hidden w-80 rounded-2xl bg-white p-3 text-slate-800 shadow-2xl group-hover/nav:block group-hover/nav:pointer-events-auto">
                  <div className="flex items-center gap-3 border-b px-2 pb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-extrabold">{user.username}</div>
                      <div className="truncate text-sm text-slate-500">{user.email}</div>
                    </div>
                  </div>
                  {user.role !== 'admin' && (
                    <button
                      type="button"
                      className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-50 font-bold text-blue-700 hover:bg-blue-100"
                      onClick={openSupportChat}
                    >
                      <Headset className="h-4 w-4" />
                      Написать в поддержку
                    </button>
                  )}
                  <button
                    type="button"
                    className="mt-2 h-11 w-full rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                    onClick={handleLogout}
                  >
                    Выйти
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                    Войти
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Регистрация</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-5 border-t border-white/10 py-2 text-sm font-bold text-slate-300">
          {rootCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="hover:text-white"
              onClick={() => openCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
