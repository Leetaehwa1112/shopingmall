import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import ScrollToTop from '@/components/common/ScrollToTop'
import Layout from '@/components/layout/Layout'
import AdminLayout from '@/components/layout/AdminLayout'

import HomePage from '@/pages/HomePage'
import ProductsPage from '@/pages/ProductsPage'
import ProductDetailPage from '@/pages/ProductDetailPage'
import CartPage from '@/pages/CartPage'
import OrderPage from '@/pages/OrderPage'
import OrderCompletePage from '@/pages/OrderCompletePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import MyPage from '@/pages/MyPage'
import MyOrdersPage from '@/pages/MyOrdersPage'
import NotFoundPage from '@/pages/NotFoundPage'
import PacksPage from '@/pages/PacksPage'
import PackDetailPage from '@/pages/PackDetailPage'
import SellPage from '@/pages/SellPage'
import DexPage from '@/pages/DexPage'

import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminProducts from '@/pages/admin/AdminProducts'
import AdminProductNew from '@/pages/admin/AdminProductNew'
import AdminPacks from '@/pages/admin/AdminPacks'
import AdminPackNew from '@/pages/admin/AdminPackNew'
import AdminOrders from '@/pages/admin/AdminOrders'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminAuctions from '@/pages/admin/AdminAuctions'
import AdminProductEdit from '@/pages/admin/AdminProductEdit'
import AdminPackEdit from '@/pages/admin/AdminPackEdit'
import AdminAuditLog from '@/pages/admin/AdminAuditLog'
import AdminAuctionReview from '@/pages/admin/AdminAuctionReview'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="auctions" element={<ProductsPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="dex" element={<DexPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="packs" element={<PacksPage />} />
            <Route path="packs/:id" element={<PackDetailPage />} />
            <Route path="sell" element={<SellPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="order" element={<OrderPage />} />
            <Route path="order-complete" element={<OrderCompletePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="my-orders" element={<MyOrdersPage />} />
          </Route>

          {/* admin 로그인은 Layout(일반 헤더/푸터) 밖에서 풀스크린 */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductNew />} />
            <Route path="products/:id/edit" element={<AdminProductEdit />} />
            <Route path="packs" element={<AdminPacks />} />
            <Route path="packs/new" element={<AdminPackNew />} />
            <Route path="packs/:id/edit" element={<AdminPackEdit />} />
            <Route path="auctions" element={<AdminAuctions />} />
            <Route path="auctions/review" element={<AdminAuctionReview />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit" element={<AdminAuditLog />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
