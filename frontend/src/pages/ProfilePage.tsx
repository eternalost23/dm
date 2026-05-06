import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import type { Order, Favorite, Review } from '../types'
import api from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

export function ProfilePage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<number>>(new Set())
  const [reviewingOrderId, setReviewingOrderId] = useState<number | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    try {
      const favoritesResponse = await api.get('/favorites')
      setFavorites(favoritesResponse.data.items || favoritesResponse.data)

      if (user?.role !== 'buyer') {
        setOrders([])
        setReviewedProductIds(new Set())
        return
      }

      const ordersResponse = await api.get('/orders/my')
      const nextOrders: Order[] = ordersResponse.data.items || ordersResponse.data
      setOrders(nextOrders)

      const productIds = [...new Set(nextOrders.map((order) => order.product_id))]
      const reviewsResponses = await Promise.all(
        productIds.map((productId) => api.get(`/products/${productId}/reviews`))
      )
      const reviewedIds = new Set<number>()

      reviewsResponses.forEach((response, index) => {
        const productReviews: Review[] = response.data.items || response.data
        if (productReviews.some((review) => review.buyer_id === user?.id)) {
          reviewedIds.add(productIds[index])
        }
      })

      setReviewedProductIds(reviewedIds)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openReviewForm = (orderId: number) => {
    setReviewingOrderId(orderId)
    setReviewRating(5)
    setReviewComment('')
    setReviewError('')
    setReviewSuccess('')
  }

  const submitReview = async (order: Order) => {
    setSubmittingReview(true)
    setReviewError('')
    setReviewSuccess('')

    try {
      await api.post(`/products/${order.product_id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      })

      setReviewedProductIds((current) => new Set(current).add(order.product_id))
      setReviewingOrderId(null)
      setReviewComment('')
      setReviewSuccess('Review submitted successfully')
    } catch (error: any) {
      setReviewError(error.response?.data?.detail || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (!user) {
    return <div>Please log in to view your profile</div>
  }

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Profile</h1>

        {/* User Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Username</label>
                <p className="text-lg">{user.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Role</label>
                <Badge variant={user.role === 'seller' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium">Member since</label>
                <p className="text-lg">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Orders</CardTitle>
            <CardDescription>
              Your purchase history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-gray-500">No orders yet</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{order.product?.title}</h3>
                        <p className="text-sm text-gray-600">
                          Status: {order.status}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ordered: {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${order.total_price}</p>
                        <Badge
                          variant={
                            order.status === 'paid' ? 'default' :
                            order.status === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      {reviewedProductIds.has(order.product_id) ? (
                        <Badge variant="secondary">Review submitted</Badge>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={order.status !== 'paid' || user.role !== 'buyer'}
                          onClick={() => openReviewForm(order.id)}
                        >
                          Leave review
                        </Button>
                      )}
                    </div>

                    {reviewingOrderId === order.id && (
                      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                        <div className="mb-3 text-sm font-medium text-gray-700">
                          Rate this product
                        </div>
                        <div className="mb-4 flex gap-1">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <button
                              key={value}
                              type="button"
                              className="rounded p-1 text-yellow-400 transition hover:bg-yellow-100"
                              onClick={() => setReviewRating(value)}
                              aria-label={`Rate ${value} stars`}
                            >
                              <Star
                                className={`h-7 w-7 ${
                                  value <= reviewRating ? 'fill-current' : 'text-gray-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={reviewComment}
                          onChange={(event) => setReviewComment(event.target.value)}
                          placeholder="Write your review"
                          className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />

                        {reviewError && (
                          <p className="mt-2 text-sm text-red-500">{reviewError}</p>
                        )}

                        <div className="mt-3 flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setReviewingOrderId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            disabled={submittingReview}
                            onClick={() => submitReview(order)}
                          >
                            {submittingReview ? 'Submitting...' : 'Submit review'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {reviewSuccess && (
              <p className="mt-4 text-sm text-green-600">{reviewSuccess}</p>
            )}
          </CardContent>
        </Card>

        {/* Favorites */}
        <Card>
          <CardHeader>
            <CardTitle>Favorites</CardTitle>
            <CardDescription>
              Products you've saved
            </CardDescription>
          </CardHeader>
          <CardContent>
            {favorites.length === 0 ? (
              <p className="text-gray-500">No favorites yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((favorite) => (
                  <Card key={favorite.id}>
                    <CardContent className="p-4">
                      <h3 className="font-medium">{favorite.product?.title}</h3>
                      <p className="text-sm text-gray-600">
                        ${favorite.product?.price}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => window.open(`/products/${favorite.product_id}`, '_blank')}
                      >
                        View Product
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
