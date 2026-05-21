import { NavLink, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import Icon from '@/components/common/Icon'

// 모바일 전용 하단 고정 탭바 — 엄지 동선 우선
// lg(>=1024) 이상에선 Header의 인라인 nav를 사용
const TABS = [
  { to: '/',         label: '홈',     icon: 'home',     match: (p) => p === '/' },
  { to: '/auctions', label: '경매',   icon: 'gavel',    match: (p) => p.startsWith('/auctions') },
  { to: '/packs',    label: '카드팩', icon: 'layers',   match: (p) => p.startsWith('/packs') },
  { to: '/cart',     label: '카트',   icon: 'cart',     match: (p) => p === '/cart', badge: 'cart' },
  { to: 'me',        label: '마이',   icon: 'user',     match: (p) => ['/mypage','/my-orders','/login','/register'].some(x => p.startsWith(x)) },
]

export default function MobileTabBar() {
  const loc = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const cartCount = useCartStore((s) => (s.items || []).reduce((sum, i) => sum + (i.qty || 1), 0))

  // 어드민/로그인 풀스크린 페이지에선 숨김
  if (loc.pathname.startsWith('/admin')) return null

  return (
    <nav
      aria-label="모바일 메인 메뉴"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-paper border-t-2 border-ink"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5 max-w-md mx-auto">
        {TABS.map((tab) => {
          const active = tab.match(loc.pathname)
          const to = tab.to === 'me'
            ? (isAuthenticated ? '/mypage' : '/login')
            : tab.to
          const showBadge = tab.badge === 'cart' && cartCount > 0
          return (
            <li key={tab.label}>
              <NavLink
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 h-[56px] text-[11px] font-bold transition-colors ${
                  active ? 'text-dex' : 'text-mute hover:text-ink active:text-ink'
                }`}
              >
                <span className="relative">
                  <Icon name={tab.icon} size={22} strokeWidth={active ? 2.4 : 1.8} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-dex text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-paper px-1">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
                <span className="tracking-tight">{tab.label}</span>
                {active && (
                  <span aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-dex rounded-b-full" />
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
