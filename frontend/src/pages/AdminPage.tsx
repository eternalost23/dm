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

type AdminTab = 'overview' | 'categories' | 'products' | 'users'

const emptyCategory = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
}

export function AdminPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [categoryForm, setCategoryForm] = useState(emptyCategory)
  const [savingCategory, setSavingCategory] = useState(false)
  const [loading, setLoading] = useState(true)

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
      { id: 'categories' as const, label: 'Categories', icon: FolderTree },
      { id: 'products' as const, label: 'Products', icon: Boxes },
      { id: 'users' as const, label: 'Users', icon: Users },
    ],
    [],
  )

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData()
    }
  }, [user])

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      const [statsResponse, categoriesResponse, productsResponse, usersResponse] = await Promise.all([
        api.get('/admin/stats'),
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
    if (!confirm(`Delete category "${category.name}"?`)) return
    await api.delete(`/admin/categories/${category.id}`)
    await fetchAdminData()
  }

  const toggleProduct = async (product: Product) => {
    await api.patch(`/admin/products/${product.id}`, { is_active: !product.is_active })
    await fetchAdminData()
  }

  const toggleUser = async (targetUser: User) => {
    await api.patch(`/admin/users/${targetUser.id}`, { is_active: !targetUser.is_active })
    await fetchAdminData()
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <p className="text-center text-slate-500">Admin access required.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">Admin</h1>
          <p className="mt-1 text-slate-500">Marketplace management console</p>
        </div>
        <Button variant="outline" onClick={fetchAdminData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Users', stats.users_count],
            ['Sellers', stats.sellers_count],
            ['Categories', stats.categories_count],
            ['Products', stats.products_count],
            ['Active products', stats.active_products_count],
            ['Orders', stats.orders_count],
            ['Paid orders', stats.paid_orders_count],
            ['Reviews', stats.reviews_count],
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
      )}

      {tab === 'categories' && (
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                New Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createCategory}>
                <Input
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })}
                  placeholder="Name"
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
                  placeholder="Description"
                  className="min-h-24 w-full rounded-md border border-input px-3 py-2"
                />
                <Input
                  value={categoryForm.image_url}
                  onChange={(event) => setCategoryForm({ ...categoryForm, image_url: event.target.value })}
                  placeholder="Image URL"
                />
                <Button className="w-full" disabled={savingCategory}>
                  <Save className="mr-2 h-4 w-4" />
                  {savingCategory ? 'Saving...' : 'Create'}
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
                        <img src={category.image_url} alt={category.name} className="h-10 w-10 rounded object-cover" />
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
                      {product.is_active ? 'Deactivate' : 'Activate'}
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
