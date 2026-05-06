// User types
export interface User {
  id: number
  email: string
  username: string
  role: 'buyer' | 'seller' | 'admin'
  is_active: boolean
  created_at: string
}

export interface UserCreate {
  email: string
  username: string
  password: string
  role?: 'buyer' | 'seller' | 'admin'
}

export interface UserUpdate {
  email?: string
  username?: string
  password?: string
  role?: 'buyer' | 'seller' | 'admin'
  is_active?: boolean
}

// Auth types
export interface LoginRequest {
  email: string
  password: string
}

export interface Token {
  access_token: string
  token_type: string
}

// Category types
export interface Category {
  id: number
  name: string
  slug: string
  parent_id?: number | null
}

// Product types
export interface Product {
  id: number
  seller_id: number
  category_id: number
  title: string
  description?: string
  price: number
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
  seller?: User
}

export interface ProductCreate {
  category_id: number
  title: string
  description?: string
  price: number
  image_url?: string
}

export interface ProductUpdate {
  category_id?: number
  title?: string
  description?: string
  price?: number
  image_url?: string
  is_active?: boolean
}

// Order types
export interface Order {
  id: number
  buyer_id: number
  product_id: number
  digital_item_id?: number | null
  total_price: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
  product?: Product
  buyer?: User
  digital_item_content?: string | null
}

export interface OrderCreate {
  product_id: number
}

// Review types
export interface Review {
  id: number
  buyer_id: number
  product_id: number
  rating: number
  comment?: string
  created_at: string
  buyer?: User
}

export interface ReviewCreate {
  rating: number
  comment?: string
}

// Favorite types
export interface Favorite {
  id: number
  user_id: number
  product_id: number
  created_at: string
  product?: Product
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}
