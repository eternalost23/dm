import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Product } from '../types'
import api from '../lib/api'
import { clearCart, getCartItems, removeCartItem } from '../lib/cart'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('ru-RU').format(Number(price))

export function CartPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<Product[]>([])
  const [buying, setBuying] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    setItems(getCartItems())
  }, [user, navigate])

  const totalAmount = useMemo(
    () => items.reduce((sum, product) => sum + Number(product.price), 0),
    [items],
  )

  const removeItem = (productId: number) => {
    removeCartItem(productId)
    setItems(getCartItems())
  }

  const buyProduct = async (product: Product) => {
    setBuying(true)
    try {
      await api.post('/orders', { product_id: product.id })
      removeItem(product.id)
      alert('Покупка завершена.')
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Не удалось купить товар')
    } finally {
      setBuying(false)
    }
  }

  const buyAll = async () => {
    setBuying(true)
    try {
      for (const product of items) {
        await api.post('/orders', { product_id: product.id })
      }
      clearCart()
      setItems([])
      alert('Покупки завершены.')
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Не удалось купить все товары')
    } finally {
      setBuying(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center gap-2">
        <ShoppingCart className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Корзина</h1>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h2 className="mb-2 text-xl font-medium">Корзина пустая</h2>
            <p className="mb-4 text-gray-600">Добавьте товар, чтобы купить его позже.</p>
            <Button onClick={() => navigate('/')}>К товарам</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-8 space-y-4">
            {items.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
                    <Link to={`/products/${product.id}`} className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                          No image
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link to={`/products/${product.id}`} className="text-lg font-bold hover:text-blue-600">
                        {product.title}
                      </Link>
                      <div className="mt-2 line-clamp-1 text-sm text-slate-400">
                        {product.category_path?.map((category) => category.name).join(' / ')}
                      </div>
                      <div className="mt-3 text-2xl font-extrabold">{formatPrice(product.price)} ₽</div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <Button disabled={buying} onClick={() => buyProduct(product)}>
                        Купить
                      </Button>
                      <Button variant="outline" disabled={buying} onClick={() => removeItem(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="text-xl font-bold">Итого: {formatPrice(totalAmount)} ₽</div>
              <Button disabled={buying} onClick={buyAll}>
                Купить все
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
