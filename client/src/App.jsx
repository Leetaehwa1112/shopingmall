import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import ScrollToTop from '@/components/common/ScrollToTop'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import Layout from '@/components/layout/Layout'

// ─── 메인(공개) 페이지: 초기 진입 가능성 높음 → eager import ───
import HomePage from '@/pages/HomePage'
import ProductsPage from '@/pages/ProductsPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import NotFoundPage from '@/pages/NotFoundPage'

// ─── 보조 페이지: 라우트 진입 시점에 lazy load ─────────────
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const OrderPage = lazy(() => import('@/pages/OrderPage'))
const OrderCompletePage = lazy(() => import('@/pages/OrderCompletePage'))
const MyPage = lazy(() => import('@/pages/MyPage'))
const MyOrdersPage = lazy(() => import('@/pages/MyOrdersPage'))
const PacksPage = lazy(() => import('@/pages/PacksPage'))
const PackDetailPage = lazy(() => import('@/pages/PackDetailPage'))
const SellPage = lazy(() => import('@/pages/SellPage'))
const DexPage = lazy(() => import('@/pages/DexPage'))
const InfoPage = lazy(() => import('@/pages/InfoPage'))
const PasswordResetPage = lazy(() => import('@/pages/PasswordResetPage'))
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'))

// ─── Admin 전체: 비-admin 사용자는 다운로드 안 함 ───────────
const AdminLayout = lazy(() => import('@/components/layout/AdminLayout'))
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'))
const AdminProductNew = lazy(() => import('@/pages/admin/AdminProductNew'))
const AdminProductEdit = lazy(() => import('@/pages/admin/AdminProductEdit'))
const AdminPacks = lazy(() => import('@/pages/admin/AdminPacks'))
const AdminPackNew = lazy(() => import('@/pages/admin/AdminPackNew'))
const AdminPackEdit = lazy(() => import('@/pages/admin/AdminPackEdit'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminAuctions = lazy(() => import('@/pages/admin/AdminAuctions'))
const AdminAuditLog = lazy(() => import('@/pages/admin/AdminAuditLog'))
const AdminAuctionReview = lazy(() => import('@/pages/admin/AdminAuctionReview'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      // 탭 포커스 시 refetch 비활성 — 페이지 복귀할 때마다 깜빡거림 방지
      refetchOnWindowFocus: false,
      // 네트워크 재연결 시 refetch도 비활성 (모바일 환경 흔들림 방지)
      refetchOnReconnect: false,
    },
  },
})

// 라우트 전환 중 폴백 — 최소·정적 (FOUC 방지)
function RouteFallback() {
  return (
    <div className="p-20 text-center text-mute font-bold">불러오는 중...</div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
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
              {/* 정적 정보 페이지 — 단일 컴포넌트가 슬러그로 분기 */}
              <Route path="info/:slug" element={<InfoPage />} />
              {/* 인증 / 비밀번호 재설정 — 토큰 링크 진입점 */}
              <Route path="reset-password" element={<PasswordResetPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
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
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
