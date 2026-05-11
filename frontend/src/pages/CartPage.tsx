import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Product } from '../types'
import api from '../lib/api'
import { clearCart, getCartItems, removeCartItem } from '../lib/cart'
import { Button } from '../components/ui/button'
import { getProductImage } from '../lib/productImages'

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
    <div className="bg-slate-100 py-8">
      <div className="mx-auto max-w-7xl px-4">
      <div className="mb-6 flex items-center gap-2">
        <ShoppingCart className="h-7 w-7" />
        <h1 className="text-3xl font-extrabold text-slate-950">Корзина</h1>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white py-12 text-center">
            <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h2 className="mb-2 text-xl font-medium">Корзина пустая</h2>
            <p className="mb-4 text-gray-600">Добавьте товар, чтобы купить его позже.</p>
            <Button onClick={() => navigate('/')}>К товарам</Button>
        </div>
      ) : (
        <>
          <div className="mb-4 space-y-3">
            {items.map((product) => (
              <article key={product.id} className="rounded-3xl bg-white px-6 py-4">
                  <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)_180px]">
                    <Link to={`/products/${product.id}`} className="h-28 w-28 overflow-hidden rounded-lg bg-slate-100">
                      <img src={getProductImage(product)} alt={product.title} className="h-full w-full object-cover" />
                    </Link>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-500">{product.seller_username || 'Продавец'}</div>
                      <Link to={`/products/${product.id}`} className="mt-2 block font-extrabold uppercase text-slate-800 hover:text-blue-600">
                        {product.title}
                      </Link>
                      <div className="mt-3 text-2xl font-extrabold">{formatPrice(product.price)} ₽</div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button disabled={buying} onClick={() => buyProduct(product)}>
                        Купить
                      </Button>
                      <Button variant="outline" disabled={buying} onClick={() => removeItem(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5">
              <div className="text-xl font-bold">Итого: {formatPrice(totalAmount)} ₽</div>
              <Button disabled={buying} onClick={buyAll}>
                Купить все
              </Button>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
