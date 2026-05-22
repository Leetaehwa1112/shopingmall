import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/api/axios'
import { formatKRW, formatKRWFull } from '@/api/cards'
import Icon from '@/components/common/Icon'
import Countdown from '@/components/common/Countdown'
import {
  PageHeader, StatGrid, StatCard, StatusPill, ErrorState, EmptyState, readAudit,
} from '@/components/admin/ui'

/**
 * Admin Dashboard — operational overview, not marketing copy.
 *
 * Three deck system:
 *  1) Top KPI strip — today numbers + things-needing-attention
 *  2) Action queue — what needs the admin's click RIGHT NOW
 *  3) Live feed — last events, recent bids, low-stock list
 */
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [audit, setAudit] = useState([])

  const load = () => {
    setLoading(true); setError(false)
    api.get('/stats/dashboard')
      .then(({ data }) => setStats(data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(); setAudit(readAudit().slice(0, 6)) }, [])

  const s = stats || {}
  const auctions = s.auctions || []
  const todayOrders = s.todayOrders ?? 0
  const todayRevenue = s.todayRevenue ?? 0
  const pendingAuctions = s.pendingAuctions ?? s.auctionsPending ?? 0
  const lowStock = s.lowStockCount ?? 0
  const newUsers = s.newUsersToday ?? 0
  const totalBidValue = s.totalBidValue ?? 0
  const activeAuctions = s.activeAuctions ?? 0
  const totalProducts = s.totalProducts ?? 0
  const totalPacks = s.totalPacks ?? 0

  const urgentQueue = useMemo(() => {
    const q = []
    if (pendingAuctions > 0) q.push({
      icon: 'flame', tone: 'red',
      title: `${pendingAuctions}건의 경매 검수 대기`,
      sub: '검수 인박스에서 키보드로 빠르게 처리',
      href: '/admin/auctions/review',
    })
    if (lowStock > 0) q.push({
      icon: 'package', tone: 'amber',
      title: `${lowStock}개 카드 재고 부족`,
      sub: '재고 3개 이하 — 보충 필요',
      href: '/admin/products',
    })
    if (s.unpaidOrders > 0) q.push({
      icon: 'cart', tone: 'amber',
      title: `${s.unpaidOrders}건의 미결제 주문`,
      sub: '24시간 이상 결제 대기',
      href: '/admin/orders',
    })
    if (s.shippingDue > 0) q.push({
      icon: 'arrow', tone: 'blue',
      title: `${s.shippingDue}건의 배송 준비 필요`,
      sub: '결제 완료, 송장 미등록',
      href: '/admin/orders',
    })
    return q
  }, [pendingAuctions, lowStock, s.unpaidOrders, s.shippingDue])

  return (
    <div className="space-y-5 max-w-[1400px]">
      <PageHeader
        kicker="OPERATIONS"
        ledTone="red"
        title="대시보드"
        subtitle={`오늘 ${new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}`}
        breadcrumb={['Admin', 'Overview']}
        actions={
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-ink/15 bg-paper hover:bg-bone-2">
            <Icon name="arrow" size={12} strokeWidth={2.2} /> 새로고침
          </button>
        }
      />

      {/* ─ KPI strip ─────────────────────────────────────────── */}
      <StatGrid cols={5}>
        <StatCard label="오늘 주문" value={loading ? '—' : todayOrders} sub={loading ? '' : formatKRW(todayRevenue)} icon="cart" tone="blue"
          onClick={() => navigate('/admin/orders')} />
        <StatCard label="검수 대기" value={loading ? '—' : pendingAuctions} sub="클릭 → 인박스" icon="flame" tone="red" urgent={pendingAuctions > 0}
          onClick={() => navigate('/admin/auctions/review')} />
        <StatCard label="진행중 경매" value={loading ? '—' : activeAuctions} sub={loading ? '' : `총 ${formatKRW(totalBidValue)}`} icon="trophy" tone="amber"
          onClick={() => navigate('/admin/auctions')} />
        <StatCard label="재고 부족" value={loading ? '—' : lowStock} sub="3개 이하" icon="package" tone="amber" urgent={lowStock > 0}
          onClick={() => navigate('/admin/products')} />
        <StatCard label="신규 회원" value={loading ? '—' : newUsers} sub="오늘 가입" icon="shield" tone="emerald"
          onClick={() => navigate('/admin/users')} />
      </StatGrid>

      {/* Catalog totals — secondary row */}
      <StatGrid cols={4}>
        <StatCard label="총 카드" value={loading ? '—' : totalProducts} sub="등록 SKU" />
        <StatCard label="총 카드팩" value={loading ? '—' : totalPacks} sub="활성 팩" />
        <StatCard label="누적 입찰가" value={loading ? '—' : formatKRW(totalBidValue)} sub="전체 경매" />
        <StatCard label="평균 객단가" value={loading || !todayOrders ? '—' : formatKRW(Math.round(todayRevenue / todayOrders))} sub="오늘" />
      </StatGrid>

      {/* ─ Body grid ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left: action queue + live auctions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Action queue */}
          <Panel title="처리가 필요한 작업" kicker="ACTION QUEUE" ledTone="red">
            {error ? (
              <ErrorState onRetry={load} />
            ) : urgentQueue.length === 0 ? (
              <EmptyState icon="trophy" title="처리할 작업이 없어요" desc="모든 신청과 주문이 정리되어 있습니다." />
            ) : (
              <div className="divide-y divide-ink/10">
                {urgentQueue.map((q, i) => (
                  <Link key={i} to={q.href} className="flex items-center gap-3 py-2.5 hover:bg-bone-2/40 -mx-2 px-2 rounded transition-colors">
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center border ${queueTone(q.tone)}`}>
                      <Icon name={q.icon} size={14} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-ink">{q.title}</div>
                      <div className="text-[11px] text-mute font-medium">{q.sub}</div>
                    </div>
                    <Icon name="arrow" size={12} strokeWidth={2.2} className="text-mute" />
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {/* Live auctions */}
          <Panel
            title="진행중 경매"
            kicker="LIVE"
            ledTone="red"
            action={<Link to="/admin/auctions" className="text-[11px] font-bold text-mute hover:text-ink">전체 →</Link>}
          >
            {loading ? (
              <SkeletonList rows={4} />
            ) : auctions.length === 0 ? (
              <EmptyState icon="flame" title="진행중인 경매가 없어요" />
            ) : (
              <div className="divide-y divide-ink/10">
                {auctions.slice(0, 6).map((c) => (
                  <div key={c._id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-ink truncate">{c.nameKo || c.name || '—'}</div>
                      <div className="text-[10px] text-mute font-mono mt-0.5">
                        {c.bidCount ?? 0} bids · {c.watchers ?? 0} watching
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-xs font-bold text-ink tabular-nums">{formatKRWFull(c.currentBid)}</div>
                      {c.endsAt && <Countdown endsAt={c.endsAt} size="sm" label={false} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right: recent admin actions */}
        <div className="space-y-5">
          <Panel
            title="최근 관리자 작업"
            kicker="AUDIT"
            ledTone="yellow"
            action={<Link to="/admin/audit" className="text-[11px] font-bold text-mute hover:text-ink">전체 →</Link>}
          >
            {audit.length === 0 ? (
              <EmptyState icon="lock" title="기록된 작업이 없어요" desc="상태 변경/삭제 액션이 여기에 기록됩니다." />
            ) : (
              <div className="space-y-2">
                {audit.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 pb-2 border-b border-ink/8 last:border-0">
                    <span className={`led led-${actionLed(a.action)} flex-shrink-0 mt-1.5`} style={{ width: 5, height: 5 }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-mute font-bold uppercase tracking-wider">{a.action}</div>
                      <div className="text-xs text-ink font-bold truncate">{a.summary || a.entityId}</div>
                      <div className="text-[10px] text-mute font-mono mt-0.5">
                        {a.actor} · {timeAgo(a.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="알림" kicker="SYSTEM" ledTone="green">
            <div className="space-y-2 text-xs">
              <SysItem ok label="API 응답" detail="평균 142ms" />
              <SysItem ok label="에스크로 서비스" detail="정상" />
              <SysItem ok={!error} label="DB 연결" detail={error ? '응답 없음' : '정상'} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, kicker, ledTone = 'blue', action, children }) {
  return (
    <section className="bg-paper border border-ink/15 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-0.5">
            <span className={`led led-${ledTone} led-pulse`} style={{ width: 5, height: 5 }} />
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-mute">{kicker}</span>
          </div>
          <h3 className="font-display text-sm font-bold text-ink">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function SkeletonList({ rows = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-3 bg-bone-2 rounded animate-pulse flex-1" style={{ width: `${50 + i * 10}%` }} />
          <div className="h-3 bg-bone-2 rounded animate-pulse w-16" />
        </div>
      ))}
    </div>
  )
}

function SysItem({ ok, label, detail }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="inline-flex items-center gap-1.5 text-ink font-bold">
        <span className={`led led-${ok ? 'green' : 'red'} ${ok ? '' : 'led-pulse'}`} style={{ width: 5, height: 5 }} />
        {label}
      </span>
      <span className={`text-[10px] font-mono ${ok ? 'text-mute' : 'text-red-600 font-bold'}`}>{detail}</span>
    </div>
  )
}

function queueTone(t) {
  return {
    red:   'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue:  'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }[t] || 'bg-bone-2 border-ink/15 text-ink'
}

function actionLed(a = '') {
  if (a.includes('delete')) return 'red'
  if (a.includes('approve') || a.includes('success')) return 'green'
  if (a.includes('update') || a.includes('status')) return 'yellow'
  return 'blue'
}

function timeAgo(at) {
  const t = new Date(at).getTime()
  if (!t) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '방금'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}시간 전`
  return new Date(t).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
