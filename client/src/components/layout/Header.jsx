import { Link, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'

export default function Header() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore()
  const cartCount = useCartStore((s) => s.items.length)
  const navigate = useNavigate()

  const linkCls = ({ isActive }) =>
    `text-sm font-bold tracking-wide transition-colors ${
      isActive ? 'text-dex' : 'text-ink/75 hover:text-ink'
    }`

  return (
    <header className="sticky top-0 z-50 bg-paper border-b border-line">
      {/* Top trust ribbon — slim */}
      <div className="bg-ink text-paper">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between text-[11px] font-medium">
          <div className="flex gap-5">
            <span className="inline-flex items-center gap-1.5">
              <span className="led led-blue" style={{ width: 6, height: 6 }} />
              100% 정품 보증
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span className="led led-yellow" style={{ width: 6, height: 6 }} />
              PSA · BGS · CGC 인증
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <span className="led led-green" style={{ width: 6, height: 6 }} />
              보안 배송 + 보험
            </span>
          </div>
          <div className="hidden md:flex gap-4 items-center">
            <span className="font-mono text-gold">1588-0420</span>
            <span className="text-paper/30">|</span>
            <span className="text-paper/50">EN</span>
            <span>KR</span>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3 group">
          <Pokeball size={36} className="group-hover:rotate-12 transition-transform" />
          <div className="leading-none">
            <div className="font-display font-bold text-2xl tracking-tight text-ink">
              Poké<span className="text-dex">vault</span>
            </div>
            <div className="pixel-label text-mute mt-1.5">AUCTION · MARKET</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <NavLink to="/auctions" className={linkCls}>
            <span className="inline-flex items-center gap-1.5">
              <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} />
              경매
            </span>
          </NavLink>
          <NavLink to="/products" className={linkCls}>희귀카드</NavLink>
          <NavLink to="/packs" className={linkCls}>카드팩</NavLink>
          <NavLink to="/market" className={linkCls}>시세</NavLink>
          {isAdmin && <NavLink to="/admin" className={linkCls}>관리자</NavLink>}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/sell" className="hidden sm:inline-flex btn btn-secondary btn-sm">
            <Icon name="plus" size={12} strokeWidth={2.5} /> 경매 등록
          </Link>
          <Link to="/cart"
            className="relative w-10 h-10 rounded-full bg-bone-2 hover:bg-line flex items-center justify-center text-ink transition-colors"
            aria-label="장바구니">
            <Icon name="cart" size={18} strokeWidth={1.8} />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-dex text-paper text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-paper px-1">
                {cartCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to="/mypage" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full hover:bg-bone-2 transition-colors">
                <div className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'T'}
                </div>
                <span className="text-sm font-bold text-ink">{user?.name}</span>
              </Link>
              <button onClick={() => { logout(); navigate('/') }}
                className="text-xs font-bold text-mute hover:text-dex">
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:inline text-sm font-bold text-mute hover:text-ink">로그인</Link>
              <Link to="/register" className="btn btn-accent btn-sm">회원가입</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
