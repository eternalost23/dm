import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, LoginRequest, UserCreate, Token } from '../types'
import api from '../lib/api'

interface AuthContextType {
  user: User | null
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: UserCreate) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginRequest) => {
    try {
      const formData = new URLSearchParams()
      formData.set('username', credentials.email)
      formData.set('password', credentials.password)

      const response = await api.post<Token>('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
      const { access_token } = response.data

      localStorage.setItem('token', access_token)

      // Get user info
      const userResponse = await api.get('/auth/me')
      const userData = userResponse.data

      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      throw error
    }
  }

  const register = async (userData: UserCreate) => {
    try {
      const response = await api.post<Token>('/auth/register', userData)
      const { access_token } = response.data

      localStorage.setItem('token', access_token)

      // Get user info
      const userResponse = await api.get('/auth/me')
      const userInfo = userResponse.data

      setUser(userInfo)
      localStorage.setItem('user', JSON.stringify(userInfo))
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const refreshUser = async () => {
    const userResponse = await api.get('/auth/me')
    const userData = userResponse.data
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
