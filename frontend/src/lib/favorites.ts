import api from './api'
import type { Favorite } from '../types'

const FAVORITES_CHANGED = 'favorites-changed'

export const notifyFavoritesChanged = () => {
  window.dispatchEvent(new Event(FAVORITES_CHANGED))
}

export const onFavoritesChanged = (callback: () => void) => {
  window.addEventListener(FAVORITES_CHANGED, callback)
  return () => window.removeEventListener(FAVORITES_CHANGED, callback)
}

export const fetchFavoriteProductIds = async () => {
  const response = await api.get('/favorites')
  const favorites: Favorite[] = response.data.items || response.data
  return new Set(favorites.map((favorite) => favorite.product_id))
}

export const toggleFavoriteProduct = async (productId: number, isFavorite: boolean) => {
  if (isFavorite) {
    await api.delete(`/favorites/${productId}`)
  } else {
    await api.post(`/favorites/${productId}`)
  }

  notifyFavoritesChanged()
}
