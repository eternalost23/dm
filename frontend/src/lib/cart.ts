import type { Product } from '../types'

const CART_KEY = 'cart_items'
const CART_CHANGED_EVENT = 'cart-changed'

export function getCartItems(): Product[] {
  const rawItems = localStorage.getItem(CART_KEY)
  if (!rawItems) return []

  try {
    return JSON.parse(rawItems)
  } catch {
    return []
  }
}

function setCartItems(items: Product[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(CART_CHANGED_EVENT))
}

export function addCartItem(product: Product) {
  const items = getCartItems()
  if (items.some((item) => item.id === product.id)) return
  setCartItems([...items, product])
}

export function removeCartItem(productId: number) {
  setCartItems(getCartItems().filter((item) => item.id !== productId))
}

export function clearCart() {
  setCartItems([])
}

export { CART_CHANGED_EVENT }
