import { useEffect, useState, useMemo } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import ToastContainer from '@/components/common/Toast'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'
import api from '@/api/axios'

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
  const [badges, setBadges] = useState({ pendingAuctions: 0, todayOrders: 0, lowStock: 0 })

  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    api.get('/stats/dashboard')
      .then(({ data }) => {
        if (!alive) return
        const d = data?.data || {}
        setBadges({
          pendingAuctions: d.pendingAuctions ?? d.auctionsPending ?? 0,
          todayOrders: d.todayOrders ?? 0,
          lowStock: d.lowStockCount ?? 0,
        })
      })
      .catch(() => {})
    return () => { alive = false }
  }, [isAdmin, location.pathname])

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-bone">
        <div className="bg-paper border-2 border-ink rounded-2xl shadow-[0_6px_0_#1a1a1a] p-10 max-w-md text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center mb-4">
            <Icon name="lock" size={24} strokeWidth={2} className="text-ink" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink mb-2">관리자 권한이 필요해요</h1>
          <p className="text-sm text-mute mb-5 font-medium">관리자 계정으로 로그인해주세요.</p>
          <Link to="/admin/login" className="inline-flex items-center gap-2 bg-ink text-paper font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-ink/90">
            관리자 로그인 <Icon name="arrow" size={12} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-bone">
      <ToastContainer />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-56 bg-paper border-r border-ink/15 flex-shrink-0 flex flex-col sticky top-0 h-screen">
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
          <NavItem to="/admin/orders"   icon="cart"    label="주문 관리" badge={badges.todayOrders} badgeTone="blue" />

          <NavGroup label="회원" />
          <NavItem to="/admin/users"    icon="shield"  label="고객 관리" />

          <NavGroup label="운영" />
          <NavItem to="/admin/audit"    icon="lock"    label="감사 로그" />
        </nav>

        <div className="px-3 py-3 border-t border-ink/10 bg-bone-2/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-ink text-paper text-xs font-bold flex items-center justify-center">
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
        <TopBar user={user} />
        <div className="flex-1 px-6 py-5 overflow-x-hidden">
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

function NavItem({ to, end, icon, label, badge, badgeTone = 'red', sub }) {
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
            ? 'bg-ink text-paper'
            : 'text-ink/70 hover:bg-bone-2 hover:text-ink'
        }`
      }
    >
      <Icon name={icon} size={sub ? 12 : 14} strokeWidth={2} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge ? (
        <span className={`text-[9px] font-mono tabular-nums px-1.5 py-0.5 rounded-full border ${tone}`}>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </NavLink>
  )
}

function TopBar({ user }) {
  const [q, setQ] = useState('')
  const time = useMemo(() => new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }), [])

  return (
    <div className="bg-paper border-b border-ink/10 px-6 py-2.5 flex items-center gap-4 sticky top-0 z-30">
      <div className="relative flex-1 max-w-md">
        <Icon name="search" size={13} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SKU · 주문번호 · 회원명 · 카드명 검색"
          className="w-full bg-bone-2/50 border border-ink/15 rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-mute focus:border-ink focus:bg-paper outline-none transition-colors"
        />
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-mute font-mono hidden md:inline">{time}</span>
        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
          <span className="led led-green led-pulse" style={{ width: 5, height: 5 }} />
          SYSTEM OK
        </span>
        <span className="font-bold text-ink hidden sm:inline">{user?.name}</span>
      </div>
    </div>
  )
}
