import { useRef, useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'

export default function Header() {
  // 개별 selector — 각각 primitive/함수 참조 반환. 미사용 필드(verified 등) 변경 시 재렌더 안 함.
  // 전체 destructure (useAuthStore())는 어떤 필드든 바뀌면 재렌더 → Layout 하위 모든 페이지에 비용.
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const cartCount = useCartStore((s) => (s.items || []).reduce((sum, i) => sum + (i.qty || 1), 0))
  const navigate = useNavigate()
  const loc = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const searchRef = useRef(null)

  // 라우트 변경 시 모바일 메뉴 자동 닫힘
  useEffect(() => { setMenuOpen(false) }, [loc.pathname])

  const submitSearch = (e) => {
    e?.preventDefault?.()
    const q = searchQuery.trim()
    if (!q) return
    navigate(`/products?q=${encodeURIComponent(q)}`)
    setSearchOpen(false)
  }

  const linkCls = ({ isActive }) =>
    `relative text-[13px] font-bold tracking-wide transition-colors py-1 ${
      isActive
        ? 'text-dex after:absolute after:left-0 after:right-0 after:-bottom-0.5 after:h-[3px] after:bg-electric after:rounded-full'
        : 'text-ink/75 hover:text-ink'
    }`

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur-md border-b-2 border-ink">
      {/* ── Top fun ribbon ─────────────────────────────────── */}
      <div className="bg-ink text-white">
        <div className="max-w-7xl mx-auto px-6 h-8 flex items-center justify-between text-[11px] font-medium">
          <div className="flex gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="led led-yellow led-pulse" style={{ width: 6, height: 6 }} />
              <span className="font-bold">두근두근 LIVE 경매</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-white/70">
              <span className="led led-blue" style={{ width: 6, height: 6 }} />
              PSA·BGS·CGC 인증
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-white/70">
              <span className="led led-green" style={{ width: 6, height: 6 }} />
              안심 배송 + 보험
            </span>
          </div>
          <div className="hidden md:flex gap-3 items-center">
            <span className="font-mono text-electric font-bold">1588-0420</span>
            <span className="text-white/30">|</span>
            <span className="text-white/50">EN</span>
            <span>KR</span>
          </div>
        </div>
      </div>

      {/* ── Main bar ───────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 h-[76px] flex items-center justify-between gap-4 lg:gap-6">
        <Link
          to="/"
          onClick={(e) => {
            // 이미 홈이면 Link가 no-op → 수동으로 최상단 스크롤
            if (loc.pathname === '/') {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
          className="flex items-center gap-3 group shrink-0"
        >
          <Pokeball size={38} className="group-hover:rotate-[20deg] group-hover:scale-110 transition-transform duration-300" />
          <div className="leading-none">
            <div className="font-display font-bold text-[26px] tracking-tight text-ink">
              Poké<span className="text-dex">vault</span>
            </div>
            <div className="pixel-label text-mute mt-1.5">트레이너 옥션</div>
          </div>
        </Link>

        {/* Global Search — desktop inline */}
        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-md mx-2 lg:mx-4">
          <label className="relative w-full group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-mute pointer-events-none transition-colors group-focus-within:text-dex">
              <Icon name="search" size={16} strokeWidth={2.2} />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="어떤 카드를 찾고 계세요?"
              aria-label="카드 검색"
              className="w-full h-10 pl-11 pr-3 rounded-full bg-bone-2 border-2 border-transparent text-sm font-bold text-ink placeholder:text-mute placeholder:font-medium focus:bg-paper focus:border-ink outline-none transition-all"
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
          <NavLink to="/dex" className={linkCls}>도감</NavLink>
          {isAdmin && <NavLink to="/admin" className={linkCls}>관리자</NavLink>}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="md:hidden w-10 h-10 rounded-full bg-bone-2 hover:bg-line flex items-center justify-center text-ink transition-colors"
            aria-label="검색 열기"
          >
            <Icon name="search" size={18} strokeWidth={1.8} />
          </button>
          <Link
            to="/sell"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-paper border-2 border-ink text-[12px] font-bold text-ink hover:bg-electric transition-colors shadow-[0_2px_0_#1a1a1a]"
          >
            <Icon name="plus" size={12} strokeWidth={2.8} /> 내 카드 출품
          </Link>
          <Link to="/cart"
            className="relative w-10 h-10 rounded-full bg-bone-2 hover:bg-electric hover:rotate-6 transition-all flex items-center justify-center text-ink"
            aria-label="장바구니">
            <Icon name="cart" size={18} strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-dex text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-paper px-1 animate-pulse">
                {cartCount}
              </span>
            )}
          </Link>
          {isAuthenticated ? (
            <UserDropdown user={user} logout={logout} navigate={navigate} />
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="hidden sm:inline text-sm font-bold text-mute hover:text-ink">로그인</Link>
              <Link to="/register" className="btn btn-pop btn-sm">
                트레이너 되기
              </Link>
            </div>
          )}

          {/* 햄버거 — lg 미만에서만 노출 (lg에선 nav가 인라인) */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            className="lg:hidden w-10 h-10 rounded-full bg-bone-2 hover:bg-electric flex items-center justify-center text-ink transition-colors border-2 border-transparent hover:border-ink"
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Mobile nav panel — 햄버거로 토글 */}
      {menuOpen && (
        <div
          id="mobile-nav-panel"
          className="lg:hidden border-t-2 border-ink bg-paper"
        >
          <nav className="max-w-7xl mx-auto px-6 py-3 flex flex-col gap-1">
            <MobileLink to="/auctions" onClick={() => setMenuOpen(false)}>
              <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} />
              경매
            </MobileLink>
            <MobileLink to="/products" onClick={() => setMenuOpen(false)}>희귀카드</MobileLink>
            <MobileLink to="/packs" onClick={() => setMenuOpen(false)}>카드팩</MobileLink>
            <MobileLink to="/dex" onClick={() => setMenuOpen(false)}>도감</MobileLink>
            <MobileLink to="/sell" onClick={() => setMenuOpen(false)}>
              <Icon name="plus" size={13} strokeWidth={2.6} /> 내 카드 출품
            </MobileLink>
            {isAdmin && (
              <MobileLink to="/admin" onClick={() => setMenuOpen(false)}>관리자</MobileLink>
            )}
            {!isAuthenticated && (
              <MobileLink to="/login" onClick={() => setMenuOpen(false)}>로그인</MobileLink>
            )}
          </nav>
        </div>
      )}

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden border-t border-line bg-paper px-4 py-3">
          <form onSubmit={submitSearch} className="flex gap-2">
            <label className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none">
                <Icon name="search" size={16} strokeWidth={2.2} />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="어떤 카드를 찾고 계세요?"
                aria-label="카드 검색"
                autoFocus
                className="w-full h-10 pl-10 pr-3 rounded-full bg-bone-2 border-2 border-transparent text-sm font-bold text-ink placeholder:text-mute focus:bg-paper focus:border-ink outline-none"
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
        <div className="w-8 h-8 rounded-full bg-ink text-electric flex items-center justify-center text-xs font-bold border-2 border-ink">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="leading-none text-left">
          <div className="text-[10px] text-dex font-bold">트레이너</div>
          <div className="text-sm font-bold text-ink">{user?.name}님</div>
        </div>
        <Icon name="arrow" size={10} strokeWidth={2.5}
          className={`text-mute transition-transform duration-200 ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-paper rounded-2xl overflow-hidden z-50 border-2 border-ink shadow-[0_4px_0_#1a1a1a]">
          <div className="px-4 py-3 bg-electric/30 border-b-2 border-ink">
            <div className="text-[10px] text-ink font-bold">접속 중인 트레이너</div>
            <div className="text-sm font-bold text-ink truncate">{user?.email}</div>
          </div>
          <div className="py-1">
            <Link to="/mypage" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-ink hover:bg-electric/20 transition-colors">
              <Icon name="user" size={14} strokeWidth={2} />
              마이페이지
            </Link>
            <Link to="/my-orders" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-ink hover:bg-electric/20 transition-colors">
              <Icon name="package" size={14} strokeWidth={2} />
              내 주문 목록
            </Link>
            <div className="border-t-2 border-ink my-1" />
            <button
              onClick={() => { setOpen(false); logout(); navigate('/') }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors">
              <Icon name="logout" size={14} strokeWidth={2} />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mobile menu link ───────────────────────────────────────
function MobileLink({ to, onClick, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-4 py-3 rounded-xl text-[15px] font-bold border-2 transition-colors ${
          isActive
            ? 'bg-ink text-electric border-ink'
            : 'bg-paper text-ink border-transparent hover:bg-bone-2 hover:border-ink'
        }`
      }
    >
      {children}
    </NavLink>
  )
}
