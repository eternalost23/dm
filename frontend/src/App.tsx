import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { Navigation } from './components/Navigation'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProductPage } from './pages/ProductPage'
import { ProfilePage } from './pages/ProfilePage'
import { SellerPage } from './pages/SellerPage'
import { CartPage } from './pages/CartPage'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/products/:id" element={<ProductPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/seller" element={<SellerPage />} />
              <Route path="/cart" element={<CartPage />} />
              {/* TODO: Add more routes for cart, profile, seller dashboard, etc. */}
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
