import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, LogOut, Store, Heart } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/button'

export function Navigation() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold text-primary">
              Digital Market
            </Link>
            <Link to="/products" className="text-sm hover:text-primary">
              Products
            </Link>
            <Link to="/categories" className="text-sm hover:text-primary">
              Categories
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/favorites">
                  <Button variant="ghost" size="sm">
                    <Heart className="h-4 w-4" />
                  </Button>
                </Link>

                <Link to="/cart">
                  <Button variant="ghost" size="sm">
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </Link>

                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                </Link>

                {user.role === 'seller' && (
                  <Link to="/seller">
                    <Button variant="ghost" size="sm">
                      <Store className="h-4 w-4" />
                    </Button>
                  </Link>
                )}

                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">
                    Register
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
