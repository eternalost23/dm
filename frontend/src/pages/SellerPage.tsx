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
import { Plus, Edit, Trash2 } from 'lucide-react'

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
                <select
                  {...register('category_id', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-input rounded-md"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.category_id.message}
                  </p>
                )}
              </div>

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
