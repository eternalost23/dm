import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../hooks/useAuth'
import type { Product, Category } from '../types'
import api from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Plus, Edit, Trash2, FolderPlus } from 'lucide-react'

const productSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  category_id: z.number().min(1, 'Please select a category'),
  image_url: z.string().url().optional().or(z.literal('')),
})

type ProductForm = z.infer<typeof productSchema>

export function SellerPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    parent_id: '',
    description: '',
    image_url: '',
  })

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
  }, [user])

  const fetchData = async () => {
    try {
      const [productsResponse, categoriesResponse] = await Promise.all([
        api.get('/seller/products'),
        api.get('/categories')
      ])

      setProducts(productsResponse.data.items || productsResponse.data)
      setCategories(categoriesResponse.data.items || categoriesResponse.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ProductForm) => {
    try {
      const productData = {
        ...data,
        image_url: data.image_url || undefined,
      }

      if (editingProduct) {
        await api.patch(`/seller/products/${editingProduct.id}`, productData)
      } else {
        await api.post('/seller/products', productData)
      }

      await fetchData()
      setShowForm(false)
      setEditingProduct(null)
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
    setValue('image_url', product.image_url || '')
    setShowForm(true)
  }

  const handleDelete = async (productId: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
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

  if (!user || user.role !== 'seller') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500">Access denied. Seller account required.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Seller Dashboard</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Add/Edit Product Form */}
      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  {...register('title')}
                  placeholder="Product Title"
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
                  placeholder="Product Description"
                  className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md"
                />
              </div>

              <div>
                <Input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="Price"
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
                    <option value="">Select Category</option>
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
                    Create category
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      value={newCategory.name}
                      onChange={(event) => setNewCategory({ ...newCategory, name: event.target.value })}
                      placeholder="Category name"
                    />
                    <Input
                      value={newCategory.slug}
                      onChange={(event) => setNewCategory({ ...newCategory, slug: event.target.value })}
                      placeholder="Slug, e.g. rdr-steam-keys"
                    />
                    <select
                      value={newCategory.parent_id}
                      onChange={(event) => setNewCategory({ ...newCategory, parent_id: event.target.value })}
                      className="rounded-md border border-input px-3 py-2"
                    >
                      <option value="">No parent</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {getCategoryLabel(category)}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={newCategory.image_url}
                      onChange={(event) => setNewCategory({ ...newCategory, image_url: event.target.value })}
                      placeholder="Image URL"
                    />
                    <textarea
                      value={newCategory.description}
                      onChange={(event) => setNewCategory({ ...newCategory, description: event.target.value })}
                      placeholder="Description"
                      className="min-h-20 rounded-md border border-input px-3 py-2 md:col-span-2"
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      disabled={!newCategory.name || !newCategory.slug}
                      onClick={handleCreateCategory}
                    >
                      Create and select
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Input
                  {...register('image_url')}
                  placeholder="Image URL (optional)"
                  className={errors.image_url ? 'border-red-500' : ''}
                />
                {errors.image_url && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.image_url.message}
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : (editingProduct ? 'Update' : 'Create')}
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
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>My Products</CardTitle>
          <CardDescription>
            Manage your digital products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-gray-500">No products yet. Add your first product!</p>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{product.title}</h3>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {product.description}
                      </p>
                      <p className="text-lg font-bold">${product.price}</p>
                      <p className="text-sm text-gray-500">
                        Category: {product.category?.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleProductStatus(product)}
                      >
                        {product.is_active ? 'Deactivate' : 'Activate'}
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
