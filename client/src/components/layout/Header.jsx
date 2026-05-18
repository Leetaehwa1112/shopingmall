import { useRef, useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'

export default function Header() {
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore()
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + (i.qty || 1), 0))
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false) // mobile overlay
  const searchRef = useRef(null)

  const submitSearch = (e) => {
    e?.preventDefault?.()
    const q = searchQuery.trim()
    if (!q) return
    navigate(`/products?q=${encodeURIComponent(q)}`)
    setSearchOpen(false)
  }

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
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between gap-4 lg:gap-6">
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <Pokeball size={36} className="group-hover:rotate-12 transition-transform" />
          <div className="leading-none">
            <div className="font-display font-bold text-2xl tracking-tight text-ink">
              Poké<span className="text-dex">vault</span>
            </div>
            <div className="pixel-label text-mute mt-1.5">AUCTION · MARKET</div>
          </div>
        </Link>

        {/* Global Search — desktop inline */}
        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-md mx-2 lg:mx-4">
          <label className="relative w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none">
              <Icon name="search" size={16} strokeWidth={2} />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="카드 이름 · 세트 · Cert# 검색"
              aria-label="카드 검색"
              className="w-full h-10 pl-10 pr-3 rounded-full bg-bone-2 border border-transparent text-sm font-medium text-ink placeholder:text-mute focus:bg-paper focus:border-ink/30 outline-none transition-colors"
            />
          </label>
        </form>

        <nav className="hidden lg:flex items-center gap-6 shrink-0">
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

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile search icon */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="md:hidden w-10 h-10 rounded-full bg-bone-2 hover:bg-line flex items-center justify-center text-ink transition-colors"
            aria-label="검색 열기"
          >
            <Icon name="search" size={18} strokeWidth={1.8} />
          </button>
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
            <UserDropdown user={user} logout={logout} navigate={navigate} />
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:inline text-sm font-bold text-mute hover:text-ink">로그인</Link>
              <Link to="/register" className="btn btn-accent btn-sm">회원가입</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden border-t border-line bg-paper px-4 py-3">
          <form onSubmit={submitSearch} className="flex gap-2">
            <label className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none">
                <Icon name="search" size={16} strokeWidth={2} />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="카드 이름 · 세트 · Cert# 검색"
                aria-label="카드 검색"
                autoFocus
                className="w-full h-10 pl-10 pr-3 rounded-full bg-bone-2 border border-transparent text-sm font-medium text-ink placeholder:text-mute focus:bg-paper focus:border-ink/30 outline-none"
              />
            </label>
            <button type="button" onClick={() => { setSearchOpen(false); setSearchQuery('') }}
              className="px-3 text-sm font-bold text-mute hover:text-ink">취소</button>
          </form>
        </div>
      )}
    </header>
  )
}

// ─── User Dropdown ───────────────────────────────────────────
function UserDropdown({ user, logout, navigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full hover:bg-bone-2 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-bold">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="leading-none text-left">
          <div className="text-[10px] text-mute font-medium">환영합니다</div>
          <div className="text-sm font-bold text-ink">{user?.name}님</div>
        </div>
        <Icon name="arrow" size={10} strokeWidth={2.5}
          className={`text-mute transition-transform duration-200 ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 surface-soft elev-3 rounded-xl overflow-hidden z-50 border border-line">
          <div className="px-4 py-3 border-b border-line">
            <div className="text-xs text-mute font-medium">로그인 중</div>
            <div className="text-sm font-bold text-ink truncate">{user?.email}</div>
          </div>
          <div className="py-1">
            <Link to="/mypage" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-ink hover:bg-bone-2 transition-colors">
              <Icon name="user" size={14} strokeWidth={1.8} />
              마이페이지
            </Link>
            <Link to="/my-orders" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-ink hover:bg-bone-2 transition-colors">
              <Icon name="package" size={14} strokeWidth={1.8} />
              내 주문 목록
            </Link>
            <div className="border-t border-line my-1" />
            <button
              onClick={() => { setOpen(false); logout(); navigate('/') }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors">
              <Icon name="logout" size={14} strokeWidth={1.8} />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
