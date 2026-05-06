import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { Order } from '../types'
import api from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { ShoppingCart } from 'lucide-react'

export function CartPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchCart()
    } else {
      navigate('/login')
    }
  }, [user, navigate])

  const fetchCart = async () => {
    try {
      const response = await api.get('/orders/my')
      setOrders(response.data.items || response.data)
    } catch (error) {
      console.error('Failed to fetch cart:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = orders.reduce((sum, order) => sum + order.total_price, 0)

  if (!user) {
    return null // Will redirect to login
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <ShoppingCart className="w-8 h-8" />
          <h1 className="text-3xl font-bold">My Purchases</h1>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-medium mb-2">No purchases yet</h2>
              <p className="text-gray-600 mb-4">
                Buy a product to see it here
              </p>
              <Button onClick={() => navigate('/')}>
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-4 mb-8">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-lg mb-2">
                          {order.product?.title}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {order.product?.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Status: {order.status}</span>
                          <span>Product ID: {order.product_id}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold mb-4">
                          ${order.total_price}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total: ${totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
