import { useEffect, useState, useMemo } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import ToastContainer from '@/components/common/Toast'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'
import api from '@/api/axios'
import CommandPalette from '@/components/admin/CommandPalette'

/**
 * Admin shell — desktop-first operations console.
 *
 * Sidebar: w-56, section-grouped nav with live badge counts (검수 대기,
 * 오늘 주문, 재고 부족) so operators see what needs attention at a glance.
 * Top utility bar: global search + role chip + quick actions.
 */
export default function AdminLayout() {
  const { isAdmin, user } = useAuthStore()
  const location = useLocation()
  const [badges, setBadges] = useState({
    pendingAuctions: 0, todayOrders: 0, lowStock: 0, slaViolated: 0, slaExpiring: 0,
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 사이드바 badge — 라우트 이동마다 + 60초 폴링으로 SLA 실시간성
  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    const fetchBadges = () => {
      api.get('/stats/dashboard')
        .then(({ data }) => {
          if (!alive) return
          const d = data?.data || {}
          setBadges({
            pendingAuctions: d.pendingAuctions ?? d.auctionsPending ?? 0,
            todayOrders: d.todayOrders ?? 0,
            lowStock: d.lowStockCount ?? 0,
            slaViolated: d.slaViolated ?? 0,
            slaExpiring: d.slaExpiring ?? 0,
          })
        })
        .catch(() => {})
    }
    fetchBadges()
    // SLA는 시간 의존적이라 60초마다 갱신 (라우트 변경 + 폴링 동시)
    const id = setInterval(fetchBadges, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [isAdmin, location.pathname])

  // 라우트 이동 시 모바일 드로어 자동 닫힘
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // ESC로 드로어 닫기
  useEffect(() => {
    if (!drawerOpen) return
    const handler = (e) => { if (e.key === 'Escape') setDrawerOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [drawerOpen])

  if (!isAdmin) {
    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center px-6 bg-bone">
        <div className="bg-paper border-2 border-ink rounded-2xl shadow-[0_6px_0_#1a1a1a] p-10 max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center mb-4">
            <Icon name="lock" size={24} strokeWidth={2} className="text-ink" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink mb-2">관리자 권한이 필요해요</h1>
          <p className="text-sm text-mute mb-5 font-medium">관리자 계정으로 로그인해주세요.</p>
          <Link to="/admin/login" className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-gray-800">
            관리자 로그인 <Icon name="arrow" size={12} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-dvh flex bg-bone">
      <ToastContainer />
      {/* ⌘K 글로벌 명령 팔레트 — 어느 admin 화면에서든 활성 */}
      <CommandPalette />

      {/* ── Mobile backdrop (드로어 열렸을 때) ──────────────── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-ink/50 backdrop-blur-sm z-40"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────
          데스크탑: sticky 좌측 사이드바.
          모바일: fixed 드로어 (햄버거 클릭 시 슬라이드 인). */}
      <aside
        className={`
          w-64 lg:w-56 bg-paper border-r border-ink/15 flex flex-col
          fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:flex-shrink-0 lg:sticky lg:top-0 lg:h-screen lg:h-dvh
          h-screen h-dvh
        `}
        aria-label="관리자 메뉴"
      >
        <Link to="/" className="block px-4 py-4 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <Pokeball size={24} />
            <div className="font-display font-bold text-base text-ink">
              Poké<span className="text-dex">vault</span>
            </div>
          </div>
          <div className="text-[9px] font-bold tracking-[0.18em] text-dex uppercase mt-1.5 inline-flex items-center gap-1.5">
            <span className="led led-red led-pulse" style={{ width: 4, height: 4 }} />
            Admin Console
          </div>
        </Link>

        <nav className="px-2 py-2 flex-1 overflow-y-auto text-xs">
          <NavItem to="/admin" end icon="trophy" label="대시보드" />

          <NavGroup label="카탈로그" />
          <NavItem to="/admin/products" icon="package" label="카드 관리" badge={badges.lowStock} badgeTone="amber" />
          <NavItem to="/admin/packs"    icon="star"    label="카드팩 관리" />

          <NavGroup label="거래" />
          <NavItem to="/admin/auctions" icon="flame"   label="경매 관리" badge={badges.pendingAuctions} badgeTone="red" />
          {badges.pendingAuctions > 0 && (
            <NavItem to="/admin/auctions/review" icon="bolt" label="검수 인박스" badge={badges.pendingAuctions} badgeTone="red" sub />
          )}
          {badges.pendingAuctions === 0 && (
            <NavItem to="/admin/auctions/review" icon="bolt" label="검수 인박스" sub />
          )}
          {/* 주문 관리 — SLA 위반(빨강) > 임박(주황) > 오늘 주문(파랑) 우선순위로 가장 시급한 1개만 노출
              위반이 있으면 검수보다도 먼저 처리해야 하는 신호 — 사이드바 어디 페이지에서든 빨강 dot이 보이게 */}
          <NavItem
            to="/admin/orders"
            icon="cart"
            label="주문 관리"
            badge={badges.slaViolated || badges.slaExpiring || badges.todayOrders}
            badgeTone={badges.slaViolated > 0 ? 'red' : badges.slaExpiring > 0 ? 'amber' : 'blue'}
            pulse={badges.slaViolated > 0}
          />
          {/* SLA 위반이 있으면 sub-nav로 바로 점프 가능한 deep link 노출 — 가장 시급한 작업의 가시성 ↑ */}
          {badges.slaViolated > 0 && (
            <NavItem
              to="/admin/orders?view=sla-violated"
              icon="flame"
              label="SLA 위반 처리"
              badge={badges.slaViolated}
              badgeTone="red"
              pulse
              sub
            />
          )}

          <NavGroup label="회원" />
          <NavItem to="/admin/users"    icon="shield"  label="고객 관리" />

          <NavGroup label="운영" />
          <NavItem to="/admin/settlements" icon="package" label="위탁자 정산" />
          <NavItem to="/admin/audit"       icon="lock"    label="감사 로그" />
        </nav>

        <div className="px-3 py-3 border-t border-ink/10 bg-bone-2/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-ink truncate">{user?.name}</div>
              <div className="text-[10px] text-mute font-medium uppercase tracking-wider">관리자</div>
            </div>
          </div>
          <Link to="/" className="block text-[10px] text-mute hover:text-ink mt-2 font-bold uppercase tracking-wider">
            ← 사이트로
          </Link>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col">
        <TopBar user={user} onMenuClick={() => setDrawerOpen(true)} />
        <div className="flex-1 px-3 sm:px-6 py-4 sm:py-5 overflow-x-hidden">
          <Outlet context={{ badges }} />
        </div>
      </main>
    </div>
  )
}

function NavGroup({ label }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[9px] font-bold tracking-[0.18em] text-mute uppercase">{label}</div>
  )
}

function NavItem({ to, end, icon, label, badge, badgeTone = 'red', sub, pulse = false }) {
  const tone = {
    red:     'bg-red-100 text-red-700 border-red-200',
    amber:   'bg-amber-100 text-amber-700 border-amber-200',
    blue:    'bg-blue-100 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }[badgeTone] || 'bg-bone-2 text-ink border-ink/15'

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md font-bold transition-colors mb-0.5 ${sub ? 'ml-4 py-1.5 text-[11px]' : ''} ${
          isActive
            ? 'bg-gray-900 text-white'
            : 'text-ink/70 hover:bg-bone-2 hover:text-ink'
        }`
      }
    >
      <Icon name={icon} size={sub ? 12 : 14} strokeWidth={2} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className={`text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded-full border ${tone} ${pulse ? 'animate-nav-pulse' : ''}`}>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
      {pulse && (
        <style>{`
          @keyframes nav-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.45); }
            50%      { box-shadow: 0 0 0 4px rgba(244, 63, 94, 0); }
          }
          .animate-nav-pulse { animation: nav-pulse 2s ease-in-out infinite; }
        `}</style>
      )}
    </NavLink>
  )
}

function TopBar({ user, onMenuClick }) {
  const time = useMemo(() => new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }), [])
  // ⌘K 명령 팔레트 트리거 — focus가 아니라 키이벤트 dispatch로 일관된 진입점 유지
  const openPalette = () => {
    const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true })
    window.dispatchEvent(evt)
  }
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <div className="bg-paper border-b border-ink/10 px-3 sm:px-6 py-2.5 flex items-center gap-2 sm:gap-4 sticky top-0 z-30">
      {/* 모바일 햄버거 — 드로어 토글 */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="관리자 메뉴 열기"
        className="lg:hidden w-10 h-10 rounded-md border border-ink/15 hover:bg-bone-2 flex items-center justify-center text-ink shrink-0"
      >
        <Icon name="menu" size={18} strokeWidth={2.2} />
      </button>
      {/* 통합 검색 — 진짜 input이 아니라 ⌘K 트리거 (글로벌 팔레트가 단일 진입점) */}
      <button
        type="button"
        onClick={openPalette}
        aria-label="검색 (⌘K)"
        className="relative flex-1 max-w-md bg-bone-2/50 border border-ink/15 rounded-lg pl-8 pr-2 py-1.5 text-xs text-mute hover:bg-paper hover:border-ink/30 hover:text-ink transition-colors flex items-center group"
      >
        <Icon name="search" size={13} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2" />
        <span className="flex-1 text-left">주문 · 카드 · 고객 검색</span>
        <kbd className="ml-2 hidden sm:inline-flex items-center text-[10px] font-mono text-mute bg-paper border border-ink/15 px-1.5 py-0.5 rounded">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>
      <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
        <span className="text-mute font-mono hidden lg:inline">{time}</span>
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
          <span className="led led-green led-pulse" style={{ width: 5, height: 5 }} />
          <span className="hidden sm:inline">SYSTEM </span>OK
        </span>
        <span className="font-bold text-ink hidden md:inline">{user?.name}</span>
      </div>
    </div>
  )
}
