import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { loadCredentials } from './utils/storage'
import { BarChart2, Package, ShoppingBag, Tag } from 'lucide-react'

import Login from './pages/Login'
import Inventory from './pages/Inventory'
import ProductForm from './pages/ProductForm'
import Properties from './pages/Properties'
import NewProperty from './pages/NewProperty'
import ProductSaved from './pages/ProductSaved'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import PrintLabels from './pages/PrintLabels'
import CouponsAndShipping from './pages/CouponsAndShipping'
import { config } from './config'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false
        return failureCount < 2
      },
    },
  },
})

const NAVBAR_ROUTES = ['/inventory', '/dashboard', '/orders', '/coupons']

function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname

  const showNav = NAVBAR_ROUTES.some((r) => path.startsWith(r))
  if (!showNav) return null

  const items = [
    { label: 'Inventário', icon: Package, route: '/inventory' },
    { label: 'Pedidos', icon: ShoppingBag, route: '/orders' },
    { label: 'Dashboard', icon: BarChart2, route: '/dashboard' },
    { label: 'Cupons', icon: Tag, route: '/coupons' },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e4e4e7] max-w-mobile mx-auto">
      <div className="flex">
        {items.map((item) => {
          const active = path.startsWith(item.route)
          return (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-16 transition-colors relative ${
                active ? 'text-primary' : 'text-[#a1a1aa]'
              }`}
            >
              <item.icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[11px] font-medium">{item.label}</span>
              {active && (
                <span className="absolute bottom-0 w-10 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const [auth, setAuth] = useState(null)

  useEffect(() => {
    loadCredentials().then((creds) => setAuth(!!creds))
  }, [])

  if (auth === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return auth ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#fafafa]">
          <div className="max-w-mobile mx-auto min-h-screen bg-white shadow-sm">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/print" element={<ProtectedRoute><PrintLabels /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/coupons" element={<ProtectedRoute><CouponsAndShipping /></ProtectedRoute>} />
              <Route path="/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
              <Route path="/products/:id/edit" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
              <Route path="/products/:id/saved" element={<ProtectedRoute><ProductSaved /></ProtectedRoute>} />
              <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
              <Route path="/properties/new" element={<ProtectedRoute><NewProperty /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/inventory" replace />} />
              <Route path="*" element={<Navigate to="/inventory" replace />} />
            </Routes>
            <BottomNav />
          </div>
        </div>
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { fontSize: '14px', maxWidth: '360px' },
          success: { style: { background: config.colors.primary, color: '#fff' } },
          error: { style: { background: '#ef4444', color: '#fff' } },
        }}
      />
    </QueryClientProvider>
  )
}
