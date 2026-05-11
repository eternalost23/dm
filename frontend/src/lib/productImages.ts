import type { Product } from '../types'
import { toAbsoluteMediaUrl } from './uploads'

export const getProductImage = (product?: Product | null) => {
  if (!product) return ''
  if (product.image_url) return toAbsoluteMediaUrl(product.image_url)

  const text = `${product.title} ${product.description || ''} ${product.category_path?.map((item) => item.name).join(' ') || ''}`.toLowerCase()

  if (text.includes('windows') || text.includes('win')) return '/images/win11.jpg'
  if (text.includes('steam') || text.includes('gift') || text.includes('игр')) return '/images/sgc.jpg'
  if (text.includes('crystal') || text.includes('software') || text.includes('софт')) return '/images/cr.jpg'

  return '/images/sgc.jpg'
}
