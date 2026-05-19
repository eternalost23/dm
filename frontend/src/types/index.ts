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
  description?: string | null
  image_url?: string | null
  is_archived: boolean
}

export interface PopularCategory extends Category {
  root_id: number
  root_name: string
  sales_count: number
  products_count: number
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
  purchases_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  category_path: Array<{
    id: number
    name: string
    slug: string
  }>
  category?: Category
  seller?: User
  seller_username?: string | null
  seller_rating?: number | null
  rating?: number | null
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
  purchases_count?: number
  is_active?: boolean
}

export interface DigitalItem {
  id: number
  product_id: number
  content: string
  is_sold: boolean
  created_at: string
}

export interface AdminStats {
  users_count: number
  sellers_count: number
  buyers_count: number
  categories_count: number
  products_count: number
  active_products_count: number
  digital_items_count: number
  available_digital_items_count: number
  orders_count: number
  paid_orders_count: number
  reviews_count: number
  favorites_count: number
  daily_sales: Array<{ period: string; value: number }>
  daily_new_users: Array<{ period: string; value: number }>
  daily_orders: Array<{ period: string; value: number }>
  weekly_sales: Array<{ period: string; value: number }>
  weekly_new_users: Array<{ period: string; value: number }>
  weekly_orders: Array<{ period: string; value: number }>
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
  product_title_snapshot?: string | null
  product_image_url_snapshot?: string | null
  seller_username_snapshot?: string | null
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

export interface ChatMessage {
  id: number
  thread_id: number
  sender_id: number
  body: string
  media_url?: string | null
  media_type?: string | null
  media_name?: string | null
  created_at: string
  is_read: boolean
}

export interface ChatThread {
  id: number
  buyer_id: number
  seller_id: number
  product_id: number
  product_image_url?: string | null
  created_at: string
  updated_at: string
  product_title: string
  buyer_username: string
  seller_username: string
  last_message?: ChatMessage | null
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
