import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Heart,
  LogOut,
  MessageSquare,
  Search,
  Shield,
  ShoppingCart,
  Store,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Category } from '../types'
import api from '../lib/api'
import { Button } from './ui/button'

export function Navigation() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [searchFocused, setSearchFocused] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.items || response.data)
    } catch (error) {
      console.error('Failed to load navigation categories:', error)
    }
  }

  const rootCategories = useMemo(
    () => categories.filter((category) => category.parent_id == null),
    [categories],
  )

  const suggestedCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return []

    return categories
      .filter((category) => {
        const text = `${category.name} ${category.slug}`.toLowerCase()
        return text.includes(normalizedQuery)
      })
      .slice(0, 9)
  }, [categories, query])

  const showSuggestions = searchFocused && query.trim().length > 0

  const handleLogout = () => {
    logout()
    navigate('/')
  }

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

  return (
    <nav className="border-b bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex min-h-16 flex-wrap items-center gap-3 py-3">
          <Link to="/" className="text-xl font-black text-white">
            Digital Market
          </Link>

          <Link to="/" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600">
            Каталог
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
                            <img src={category.image_url} alt="" className="h-full w-full object-cover" />
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

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link to="/chats">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                    <MessageSquare className="h-4 w-4" />
                    Чат
                  </Button>
                </Link>
                <Link to="/favorites">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                    <Heart className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/cart">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                    <User className="h-4 w-4" />
                  </Button>
                </Link>
                {user.role === 'seller' && (
                  <Link to="/seller">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                      <Store className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                      <Shield className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/10 hover:text-white">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
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
