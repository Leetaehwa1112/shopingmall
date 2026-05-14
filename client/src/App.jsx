import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Layout from '@/components/layout/Layout'
import AdminLayout from '@/components/layout/AdminLayout'

import HomePage from '@/pages/HomePage'
import ProductsPage from '@/pages/ProductsPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import CartPage from '@/pages/CartPage'
import OrderPage from '@/pages/OrderPage'
import CheckoutPage from '@/pages/CheckoutPage'
import OrderCompletePage from '@/pages/OrderCompletePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import AdminLoginPage from '@/pages/AdminLoginPage'
import MyPage from '@/pages/MyPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PacksPage from '@/pages/PacksPage'
import PackDetailPage from '@/pages/PackDetailPage'
import SellPage from '@/pages/SellPage'

import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminProducts from '@/pages/admin/AdminProducts'
import AdminPacks from '@/pages/admin/AdminPacks'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminUsers from '@/pages/admin/AdminUsers'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="auctions" element={<ProductsPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="market" element={<ProductsPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="packs" element={<PacksPage />} />
            <Route path="packs/:id" element={<PackDetailPage />} />
            <Route path="sell" element={<SellPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="order" element={<OrderPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order-complete" element={<OrderCompletePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="mypage" element={<MyPage />} />
          <Route path="admin/login" element={<AdminLoginPage />} />
          </Route>

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="packs" element={<AdminPacks />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
