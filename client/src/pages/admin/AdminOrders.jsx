import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  formatKRWFull, formatDateShort, formatTime,
  formatAddress, formatDateTime,
} from '@/utils/format'
import {
  ORDER_STATUS, ORDER_FILTERS,
  getPaymentLabel, getShippingLabel,
} from '@/constants/order'
import {
  getAllOrders, updateOrderStatus as apiUpdateStatus, updateOrderTracking,
} from '@/api/orderApi'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'
import Icon from '@/components/common/Icon'
import {
  PageHeader, StatGrid, StatCard, FilterBar, SearchInput, Select, DateRange, QuickRanges,
  FilterChips, Spacer, DataTable, StatusPill, Pagination, BulkBar, BulkButton,
  Cell, RowActions, IconBtn, InlineSelect, Drawer, DSection, KV, EmptyState, logAudit,
} from '@/components/admin/ui'
import SavedViewBar from '@/components/admin/SavedViewBar'
import SLABadge, { isOrderSLAExpiring, isOrderSLAViolated } from '@/components/admin/SLABadge'
import QuickRefundModal from '@/components/admin/QuickRefundModal'
import Can, { useCanDo, missingRolesTooltip } from '@/components/admin/Can'
import OrderFulfillmentTimeline from '@/components/admin/OrderFulfillmentTimeline'
import FulfillmentGuide from '@/components/admin/FulfillmentGuide'
import CarrierTrackingCard from '@/components/admin/CarrierTrackingCard'
import NotificationHistory, { recordNotification } from '@/components/admin/NotificationHistory'
import { STAGES, inferStage, loadChecklist, saveChecklist, renderCustomerMessage } from '@/lib/fulfillment'
import { CARRIER_NAMES } from '@/lib/carriers'
import { useAuditLog } from '@/hooks/useAuditLog'

const STATUS = ORDER_STATUS
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// status → tone mapping for StatusPill
const statusTone = (s) => ({
  pending_payment: 'amber', paid: 'emerald', preparing: 'blue',
  shipped: 'blue', delivered: 'emerald', cancelled: 'red', refunded: 'red',
}[s] || 'gray')

export default function AdminOrders() {
  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.push)
  const [searchParams, setSearchParams] = useSearchParams()

  // server-side state
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // filters
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' })
  const [range, setRange] = useState({ from: '', to: '' })
  const [quickRange, setQuickRange] = useState('all')
  const [payment, setPayment] = useState('all')

  // selection + drawer
  const [selected, setSelected] = useState([])
  const [drawerOrder, setDrawerOrder] = useState(null)
  const [bulkTrackOpen, setBulkTrackOpen] = useState(false)
  const [refundTarget, setRefundTarget] = useState(null)

  // SLA 뷰 토글 — server filter와 별개로 클라이언트 필터링
  const [slaView, setSlaView] = useState(null)  // null | 'expiring' | 'violated'

  // 권한
  const canRefund = useCanDo('order.refund')
  const canCancel = useCanDo('order.cancel')
  const audit = useAuditLog()

  const fetchOrders = useCallback(() => {
    setLoading(true)
    getAllOrders({ page, limit: pageSize, status: filter, search })
      .then(({ data }) => {
        setOrders(data.data || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      })
      .catch(() => { setOrders([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [filter, page, pageSize, search])

  useEffect(() => { fetchOrders() }, [fetchOrders])
  useEffect(() => { setPage(1); setSelected([]) }, [filter, search, range, payment])

  // ?view= URL 파라미터로 진입 시 (대시보드/⌘K에서 점프) 해당 saved view 자동 적용
  useEffect(() => {
    const view = searchParams.get('view')
    if (!view) return
    if (view === 'sla-violated')  { setSlaView('violated'); setFilter('all') }
    if (view === 'sla-expiring')  { setSlaView('expiring'); setFilter('all') }
    if (view === 'shipping-due')  { setSlaView(null); setFilter('paid') }
    if (view === 'pending')       { setSlaView(null); setFilter('pending_payment') }
    if (view === 'cancelled')     { setSlaView(null); setFilter('cancelled') }
    // URL 정리
    const next = new URLSearchParams(searchParams)
    next.delete('view')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // apply local date-range + payment + SLA + sort on top of server result
  const filtered = useMemo(() => {
    let rows = orders.slice()
    if (payment !== 'all') rows = rows.filter((o) => o.payment?.method === payment)
    if (range.from) rows = rows.filter((o) => new Date(o.createdAt) >= new Date(range.from))
    if (range.to)   rows = rows.filter((o) => new Date(o.createdAt) <= new Date(`${range.to}T23:59:59`))
    if (slaView === 'expiring') rows = rows.filter(isOrderSLAExpiring)
    if (slaView === 'violated') rows = rows.filter(isOrderSLAViolated)
    rows.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const get = (o) => ({
        createdAt: new Date(o.createdAt).getTime(),
        totalAmount: o.totalAmount || 0,
        status: o.status,
        orderNumber: o.orderNumber,
      }[sort.key])
      const av = get(a), bv = get(b)
      if (av < bv) return -1 * dir
      if (av > bv) return  1 * dir
      return 0
    })
    return rows
  }, [orders, range, payment, slaView, sort])

  // KPIs based on currently loaded page (cheap, indicative)
  const kpis = useMemo(() => {
    const today = new Date().toDateString()
    const todays = orders.filter((o) => new Date(o.createdAt).toDateString() === today)
    return {
      total,
      todayCount: todays.length,
      todayRevenue: todays.reduce((s, o) => s + (o.totalAmount || 0), 0),
      shippingDue: orders.filter((o) => o.status === 'paid' && !o.shipping?.trackingNumber).length,
      cancelled: orders.filter((o) => o.status === 'cancelled' || o.status === 'refunded').length,
      slaExpiring: orders.filter(isOrderSLAExpiring).length,
      slaViolated: orders.filter(isOrderSLAViolated).length,
    }
  }, [orders, total])

  // 시스템 saved views — 포케볼트 도메인 + SLA 기반 (가장 ROI 높은 운영 큐)
  const systemViews = useMemo(() => [
    {
      id: 'sla-violated', label: 'SLA 위반', tone: 'red',
      count: kpis.slaViolated,
      apply: () => { setSlaView('violated'); setFilter('all') },
    },
    {
      id: 'sla-expiring', label: 'SLA 임박 (18h+)', tone: 'amber',
      count: kpis.slaExpiring,
      apply: () => { setSlaView('expiring'); setFilter('all') },
    },
    {
      id: 'shipping-due', label: '송장 미등록', tone: 'amber',
      count: kpis.shippingDue,
      apply: () => { setSlaView(null); setFilter('paid') },
    },
    {
      id: 'pending', label: '결제 대기', tone: 'blue',
      apply: () => { setSlaView(null); setFilter('pending_payment') },
    },
    {
      id: 'cancelled', label: '취소·환불', tone: 'red',
      apply: () => { setSlaView(null); setFilter('cancelled') },
    },
  ], [kpis])

  const activeViewId = useMemo(() => {
    if (slaView === 'violated') return 'sla-violated'
    if (slaView === 'expiring') return 'sla-expiring'
    if (filter === 'paid') return 'shipping-due'
    if (filter === 'pending_payment') return 'pending'
    if (filter === 'cancelled') return 'cancelled'
    return null
  }, [slaView, filter])

  const clearView = () => { setSlaView(null); setFilter('all'); setSearch(''); setPayment('all'); setRange({ from: '', to: '' }) }

  const handleSort = (key) => {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })
  }

  const handleStatusChange = async (orderId, newStatus) => {
    const prev = orders.find((o) => o._id === orderId)?.status
    try {
      await apiUpdateStatus(orderId, newStatus)
      logAudit({
        actor: user?.name, action: 'order.status', entity: 'order', entityId: orderId,
        summary: `${prev} → ${newStatus}`,
      })
      toast({ type: 'success', title: '상태 변경 완료', message: STATUS[newStatus]?.label })
      fetchOrders()
      if (drawerOrder?._id === orderId) setDrawerOrder((o) => ({ ...o, status: newStatus }))
    } catch (err) {
      toast({ type: 'error', title: '변경 실패', message: err.response?.data?.message || '상태 변경 실패' })
    }
  }

  const handleBulkStatus = async (newStatus) => {
    if (!selected.length) return
    if (!confirm(`${selected.length}건의 주문을 [${STATUS[newStatus]?.label}](으)로 변경할까요?`)) return
    for (const id of selected) {
      try { await apiUpdateStatus(id, newStatus) } catch {/* ignore individual fail */}
    }
    logAudit({
      actor: user?.name, action: 'order.bulk.status', entity: 'order',
      entityId: `${selected.length}건`,
      summary: `→ ${STATUS[newStatus]?.label}`, meta: { ids: selected },
    })
    toast({ type: 'success', title: '일괄 변경 완료', message: `${selected.length}건 → ${STATUS[newStatus]?.label}` })
    setSelected([])
    fetchOrders()
  }

  // 빠른 환불 — QuickRefundModal에서 호출
  const handleRefund = async ({ amount, reasonCode, reasonText, reasonLabel, mode, items }) => {
    const orderId = refundTarget._id
    const before = { status: refundTarget.status, totalAmount: refundTarget.totalAmount }
    try {
      // 백엔드 환불 엔드포인트가 별도면 변경 — 현재는 status 전이로 대체 가능
      await apiUpdateStatus(orderId, 'refunded')
      // audit (앞서 만든 useAuditLog hook으로 영속 + 기존 logAudit으로 UI용 로그)
      audit.record({
        entity: 'order', entityId: orderId, action: 'refund',
        before, after: { status: 'refunded', refundAmount: amount },
        reason: `[${reasonCode}] ${reasonLabel}`,
        metadata: { mode, items },
      })
      logAudit({
        actor: user?.name, action: 'order.refund', entity: 'order', entityId: orderId,
        summary: `${formatKRWFull(amount)} 환불 · ${reasonLabel}`,
      })
      toast({ type: 'success', title: '환불 처리 완료', message: `${formatKRWFull(amount)} · ${reasonLabel}` })
      setRefundTarget(null)
      fetchOrders()
      if (drawerOrder?._id === orderId) setDrawerOrder(null)
    } catch (err) {
      toast({ type: 'error', title: '환불 실패', message: err.response?.data?.message || '환불 처리 실패' })
    }
  }

  const filterOptions = ORDER_FILTERS.map((f) => ({
    value: f.value, label: f.label, led: f.led,
  }))

  const paymentOptions = [
    { value: 'all', label: '전체 결제' },
    { value: 'card', label: '신용카드' },
    { value: 'toss', label: '토스페이' },
    { value: 'kakao', label: '카카오페이' },
    { value: 'bank', label: '가상계좌' },
    { value: 'escrow', label: '에스크로' },
  ]

  return (
    <div className="space-y-4 max-w-[1400px]">
      <PageHeader
        kicker="ORDERS"
        ledTone="green"
        title="주문 관리"
        subtitle={`서버 총 ${total.toLocaleString()}건 · 현재 페이지 ${orders.length}건`}
        breadcrumb={['Admin', '거래', '주문 관리']}
        actions={
          <>
            <button
              onClick={() => setBulkTrackOpen(true)}
              style={{ backgroundColor: '#16a34a', color: '#fff' }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md border-2 border-ink shadow-[0_2px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a] transition-all"
            >
              <Icon name="package" size={12} strokeWidth={2.5} /> 송장 일괄 등록
            </button>
            <button onClick={fetchOrders} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-gray-900/15 bg-paper hover:bg-bone-2">
              <Icon name="arrow" size={12} strokeWidth={2.2} /> 새로고침
            </button>
          </>
        }
      />

      {/* KPI */}
      <StatGrid cols={4}>
        <StatCard label="오늘 주문" value={kpis.todayCount} sub={formatKRWFull(kpis.todayRevenue)} icon="cart" tone="blue" />
        <StatCard
          label="배송 준비 대기"
          value={kpis.shippingDue}
          sub="결제완료, 송장미등록"
          icon="package"
          tone="amber"
          urgent={kpis.shippingDue > 5}
          onClick={() => { setFilter('paid'); setSearch('') }}
        />
        <StatCard label="취소/환불" value={kpis.cancelled} sub="현 페이지 기준" icon="flame" tone="red" />
        <StatCard label="전체 주문" value={total.toLocaleString()} sub="누적" icon="trophy" />
      </StatGrid>

      {/* Filter bar */}
      <FilterBar>
        <SearchInput value={search} onSubmit={setSearch} placeholder="주문번호 / 구매자 이름" width={240} />
        <QuickRanges value={quickRange} onChange={(v) => { setQuickRange(v); setRange(rangeFromQuick(v)) }} />
        <DateRange from={range.from} to={range.to} onChange={(r) => { setRange(r); setQuickRange('custom') }} />
        <Select label="결제" value={payment} onChange={setPayment} options={paymentOptions} />
        <Spacer />
        <Select
          label="페이지당"
          value={pageSize}
          onChange={(v) => { setPageSize(Number(v)); setPage(1) }}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: `${n}건` }))}
        />
      </FilterBar>

      {/* Status chips */}
      <div className="-mx-1 px-1 overflow-x-auto">
        <FilterChips value={filter} onChange={setFilter} options={filterOptions} />
      </div>

      {/* 시스템 saved views — SLA·예외 큐 1클릭 점프 */}
      <SavedViewBar views={systemViews} activeId={activeViewId} onClearView={clearView} />

      {/* Bulk action bar */}
      <BulkBar
        count={selected.length}
        onClear={() => setSelected([])}
        actions={
          <>
            <BulkButton tone="success" onClick={() => handleBulkStatus('preparing')}>배송 준비로</BulkButton>
            <BulkButton tone="success" onClick={() => handleBulkStatus('shipped')}>운송중으로</BulkButton>
            <BulkButton tone="default" onClick={() => handleBulkStatus('delivered')}>도착 처리</BulkButton>
            <Can action="order.cancel" disable>
              {(allowed) => (
                <BulkButton
                  tone="danger"
                  onClick={() => handleBulkStatus('cancelled')}
                  disabled={!allowed}
                  title={allowed ? '선택 주문 취소' : missingRolesTooltip('order.cancel')}
                >
                  취소
                </BulkButton>
              )}
            </Can>
          </>
        }
      />

      {/* Table */}
      <DataTable
        density="compact"
        loading={loading}
        rows={filtered}
        rowKey={(r) => r._id}
        selected={selected}
        onSelect={setSelected}
        sort={sort}
        onSort={handleSort}
        onRowClick={(r) => setDrawerOrder(r)}
        empty={<EmptyState icon="cart" title="주문이 없습니다" desc="해당 조건의 주문이 없어요." />}
        columns={[
          { key: 'orderNumber', label: '주문번호', sortable: true, render: (o) =>
            <span className="font-mono text-[11px] text-ink font-bold">{o.orderNumber}</span>
          },
          { key: 'createdAt', label: '일시', sortable: true, render: (o) =>
            <div className="font-mono text-[11px] tabular-nums">
              <div className="text-ink font-bold">{formatDateShort(o.createdAt)}</div>
              <div className="text-mute">{formatTime(o.createdAt)}</div>
            </div>
          },
          { key: 'sla', label: 'SLA', align: 'center', render: (o) =>
            <SLABadge order={o} />
          },
          { key: 'buyer', label: '구매자', render: (o) =>
            <Cell primary={o.shipping?.recipient || '—'} secondary={o.user?.email} />
          },
          { key: 'product', label: '상품', render: (o) => {
            const f = o.items?.[0]
            const more = (o.items?.length || 0) - 1
            const qty = o.items?.reduce((s, i) => s + i.qty, 0)
            return <Cell
              primary={`${f?.product?.nameKo || f?.product?.name || f?.pack?.nameKo || f?.pack?.name || '—'}${more > 0 ? ` 외 ${more}` : ''}`}
              secondary={`${qty || 0}개`}
            />
          }},
          { key: 'shipping', label: '배송', render: (o) =>
            <span className="text-[11px] text-ink font-medium">
              {getShippingLabel(o.shipping?.method)}
              {o.shipping?.trackingNumber && (
                <span className="ml-1 text-[10px] text-emerald-600 font-mono">·{o.shipping.trackingNumber.slice(-6)}</span>
              )}
            </span>
          },
          { key: 'totalAmount', label: '금액', align: 'right', sortable: true, render: (o) =>
            <span className="font-mono text-xs font-bold tabular-nums text-ink">{formatKRWFull(o.totalAmount)}</span>
          },
          { key: 'payment', label: '결제', align: 'center', render: (o) =>
            <span className="text-[11px] text-mute font-bold">{getPaymentLabel(o.payment?.method)}</span>
          },
          { key: 'status', label: '상태', align: 'center', sortable: true, render: (o) => {
            const st = STATUS[o.status] || STATUS.unknown
            return (
              <InlineSelect
                tone={statusTone(o.status)}
                value={o.status}
                onChange={(v) => handleStatusChange(o._id, v)}
                options={Object.entries(STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
              />
            )
          }},
          { key: 'actions', label: '', align: 'right', render: (o) => {
            const canRefundRow = canRefund && !['cancelled', 'refunded'].includes(o.status)
            return (
              <RowActions>
                {canRefundRow && (
                  <IconBtn
                    icon="close"
                    label="빠른 환불"
                    tone="danger"
                    onClick={(e) => { e.stopPropagation?.(); setRefundTarget(o) }}
                  />
                )}
                <IconBtn icon="arrow" label="상세" onClick={() => setDrawerOrder(o)} />
              </RowActions>
            )
          }},
        ]}
      />

      <Pagination
        page={page} totalPages={totalPages} total={total} pageSize={pageSize}
        onPage={setPage}
      />

      {drawerOrder && (
        <OrderDrawer
          order={drawerOrder}
          onClose={() => setDrawerOrder(null)}
          onStatusChange={handleStatusChange}
          onTrackingUpdate={fetchOrders}
          actor={user?.name}
        />
      )}

      {bulkTrackOpen && (
        <BulkTrackingModal
          onClose={() => setBulkTrackOpen(false)}
          onDone={() => { setBulkTrackOpen(false); fetchOrders() }}
          orders={orders}
          actor={user?.name}
        />
      )}

      {refundTarget && (
        <QuickRefundModal
          order={refundTarget}
          onClose={() => setRefundTarget(null)}
          onConfirm={handleRefund}
        />
      )}
    </div>
  )
}

/* ─── Bulk tracking CSV import ────────────────────────────── */
function BulkTrackingModal({ onClose, onDone, orders, actor }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState([])
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)

  // parse on the fly so admin sees preview before committing
  useEffect(() => {
    const rows = parseCsv(text, orders)
    setParsed(rows)
  }, [text, orders])

  const handleRun = async () => {
    setRunning(true)
    const ok = []; const fail = []
    for (const row of parsed) {
      if (!row.matchId) { fail.push({ ...row, err: '주문번호 매칭 실패' }); continue }
      try {
        await updateOrderTracking(row.matchId, { trackingNumber: row.tracking, carrier: row.carrier })
        ok.push(row)
      } catch (e) {
        fail.push({ ...row, err: e.response?.data?.message || '저장 실패' })
      }
    }
    if (ok.length) {
      logAudit({
        actor, action: 'order.bulk.tracking', entity: 'order',
        entityId: `${ok.length}건`,
        summary: `송장 일괄 등록 ${ok.length}건 · 실패 ${fail.length}건`,
      })
    }
    setResults({ ok, fail })
    setRunning(false)
    if (fail.length === 0) {
      setTimeout(onDone, 1200)
    }
  }

  const validCount = parsed.filter((r) => r.matchId && r.tracking).length

  return (
    <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-paper border border-gray-900/15 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-900/15 flex items-start justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-ink">송장 일괄 등록</h2>
            <p className="text-[11px] text-mute font-medium mt-0.5">
              엑셀에서 복사 → 붙여넣기. 형식: <code className="font-mono bg-bone-2 px-1 rounded">주문번호,캐리어,송장번호</code>
              <span className="text-mute/70"> (캐리어 생략 시 FedEx)</span>
            </p>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink p-1 -m-1">
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!results ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                placeholder={`ORD-20250101-0001,FedEx,1234567890\nORD-20250101-0002,Brink's,9876543210\nORD-20250101-0003,7777777777`}
                className="w-full bg-bone-2/30 border border-gray-900/15 rounded-md px-3 py-2 text-xs font-mono text-ink placeholder:text-mute focus:border-gray-900 focus:bg-paper outline-none resize-none"
              />

              {/* Preview */}
              {parsed.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-mute">미리보기</div>
                    <div className="text-[11px] font-bold">
                      <span className="text-emerald-600">매칭 {validCount}</span>
                      <span className="text-mute mx-1">·</span>
                      <span className="text-red-600">실패 {parsed.length - validCount}</span>
                    </div>
                  </div>
                  <div className="border border-gray-900/10 rounded-md overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-bone-2/60 text-[10px] font-bold text-mute uppercase tracking-wider">
                        <tr>
                          <th className="text-left px-2 py-1.5">상태</th>
                          <th className="text-left px-2 py-1.5">주문번호</th>
                          <th className="text-left px-2 py-1.5">캐리어</th>
                          <th className="text-left px-2 py-1.5">송장번호</th>
                          <th className="text-left px-2 py-1.5">매칭 정보</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((row, i) => (
                          <tr key={i} className="border-t border-gray-900/8">
                            <td className="px-2 py-1.5">
                              {row.matchId && row.tracking
                                ? <span className="text-[10px] font-bold text-emerald-600">OK</span>
                                : <span className="text-[10px] font-bold text-red-600">ERR</span>}
                            </td>
                            <td className="px-2 py-1.5 font-mono">{row.orderNumber}</td>
                            <td className="px-2 py-1.5">{row.carrier}</td>
                            <td className="px-2 py-1.5 font-mono">{row.tracking}</td>
                            <td className="px-2 py-1.5 text-[11px] text-mute truncate max-w-[200px]">
                              {row.matchId ? row.matchInfo : '주문번호 매칭 안 됨'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <ResultPanel results={results} />
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-900/15 bg-bone-2/30 flex items-center justify-end gap-2">
          {!results ? (
            <>
              <button onClick={onClose} className="text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md hover:bg-bone-2">취소</button>
              <button
                onClick={handleRun}
                disabled={running || validCount === 0}
                className="text-xs font-bold bg-emerald-600 text-white px-4 py-1.5 rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {running ? '처리 중...' : `${validCount}건 등록`}
              </button>
            </>
          ) : (
            <button onClick={onDone} className="text-xs font-bold bg-gray-900 text-white px-4 py-1.5 rounded-md hover:bg-gray-800">완료</button>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultPanel({ results }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">성공</div>
          <div className="font-display text-2xl font-bold text-emerald-700 tabular-nums">{results.ok.length}</div>
        </div>
        <div className={`rounded-md p-3 border ${results.fail.length ? 'bg-red-50 border-red-200' : 'bg-bone-2/40 border-gray-900/10'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${results.fail.length ? 'text-red-700' : 'text-mute'}`}>실패</div>
          <div className={`font-display text-2xl font-bold tabular-nums ${results.fail.length ? 'text-red-700' : 'text-mute'}`}>{results.fail.length}</div>
        </div>
      </div>
      {results.fail.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-mute mb-2">실패 상세</div>
          <div className="border border-red-200 rounded-md overflow-hidden">
            {results.fail.map((row, i) => (
              <div key={i} className="px-3 py-2 text-xs border-t border-red-100 first:border-t-0 flex items-center justify-between gap-2 bg-red-50/40">
                <span className="font-mono text-ink">{row.orderNumber}</span>
                <span className="text-red-700 font-bold">{row.err}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Tolerant CSV/TSV parser for paste-from-Excel */
function parseCsv(text, orders) {
  if (!text.trim()) return []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  return lines.map((line) => {
    // accept tab or comma
    const parts = line.split(/[\t,]/).map((p) => p.trim()).filter(Boolean)
    let orderNumber, carrier, tracking
    if (parts.length >= 3) {
      [orderNumber, carrier, tracking] = parts
    } else if (parts.length === 2) {
      [orderNumber, tracking] = parts
      carrier = 'FedEx'
    } else {
      orderNumber = parts[0]; carrier = 'FedEx'; tracking = ''
    }
    const match = orders.find((o) => o.orderNumber === orderNumber)
    return {
      orderNumber, carrier, tracking,
      matchId: match?._id,
      matchInfo: match ? `${match.shipping?.recipient || ''} · ${match.status}` : '',
    }
  })
}

/* helper: quick range → from/to */
function rangeFromQuick(v) {
  if (v === 'all' || v === 'custom') return { from: '', to: '' }
  const to = new Date()
  const from = new Date()
  if (v === 'today') from.setHours(0, 0, 0, 0)
  if (v === '7d')  from.setDate(from.getDate() - 7)
  if (v === '30d') from.setDate(from.getDate() - 30)
  if (v === '90d') from.setDate(from.getDate() - 90)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(to) }
}

/* ─── Drawer ────────────────────────────────────────────── */
function OrderDrawer({ order, onClose, onStatusChange, onTrackingUpdate, actor }) {
  const [trackingNo, setTrackingNo] = useState(order.shipping?.trackingNumber || '')
  const [carrier, setCarrier] = useState(order.shipping?.carrier || 'FedEx')
  const [saving, setSaving] = useState(false)
  const st = STATUS[order.status] || STATUS.unknown

  // 풀필먼트 단계 추론 — 9 micro-step
  const currentStage = inferStage(order)

  const handleTrackingSave = async () => {
    setSaving(true)
    try {
      await updateOrderTracking(order._id, { trackingNumber: trackingNo, carrier })
      logAudit({ actor, action: 'order.tracking', entity: 'order', entityId: order._id, summary: `${carrier} ${trackingNo}` })
      onTrackingUpdate()
      alert('송장이 등록되었습니다.')
    } catch (err) {
      alert(err.response?.data?.message || '송장 등록 실패')
    } finally { setSaving(false) }
  }

  // 알림 자동 발송 헬퍼 — 단계 진입 시 고객 알림 + 이력 기록
  const sendCustomerNotice = (stage) => {
    if (!stage?.customerNotify) return
    const msg = renderCustomerMessage(stage, order)
    if (!msg) return
    recordNotification(order._id, {
      stage: stage.id,
      channel: 'kakao',
      status: 'sent',
      message: msg,
      recipient: order.shipping?.phone || order.user?.email,
    })
    logAudit({
      actor, action: 'order.notify',
      entity: 'order', entityId: order._id,
      summary: `[${stage.label}] 알림 발송 → ${order.shipping?.recipient || '고객'}`,
    })
  }

  // 풀필먼트 가이드의 CTA가 눌렸을 때 — 단계별 다음 액션 수행
  const handleAdvance = async ({ stage }) => {
    const orderId = order._id
    switch (stage.id) {
      case 'inspection':
      case 'packing':
        // 클라이언트 체크리스트만 — localStorage 진행 (이미 FulfillmentGuide 내부에서 저장됨)
        // 다음 렌더 시 inferStage가 다음 단계로 자동 진행
        logAudit({ actor, action: `order.${stage.id}.done`, entity: 'order', entityId: orderId, summary: stage.label })
        onTrackingUpdate() // 리스트 새로고침 → 드로어 재계산
        break
      case 'tracking_input':
        // 운송장이 저장된 상태인지 확인 — 별도 운송장 영역에서 저장하고 다시 CTA 클릭
        if (!order.shipping?.trackingNumber) {
          alert('아래 "송장 등록" 영역에서 운송장 번호를 먼저 저장해주세요.')
          return
        }
        // 알림 발송 (운송장 번호 포함)
        sendCustomerNotice(stage)
        // 자동으로 preparing 상태로 (다음 단계 진입)
        await onStatusChange(orderId, 'preparing')
        break
      case 'shipped':
        sendCustomerNotice(stage)
        await onStatusChange(orderId, 'shipped')
        break
      case 'delivered': {
        // 고객 수령 확인 — checklist에 customer_confirmed 마크
        const cl = loadChecklist(orderId)
        saveChecklist(orderId, { ...cl, customer_confirmed: true })
        logAudit({ actor, action: 'order.received', entity: 'order', entityId: orderId, summary: '고객 수령 확인' })
        onTrackingUpdate()
        break
      }
      default:
        break
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={order.orderNumber}
      subtitle={formatDateTime(order.createdAt)}
      width={620}
      footer={
        <>
          <span className="text-[11px] text-mute mr-auto">ESC로 닫기 · J/K로 형제 이동</span>
          <button onClick={onClose} className="text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md hover:bg-bone-2">닫기</button>
        </>
      }
    >
      {/* 9-step Fulfillment Timeline — 상태를 한눈에 */}
      {currentStage && (
        <div className="mb-4 px-1">
          <OrderFulfillmentTimeline
            stages={STAGES}
            currentStageId={currentStage.id}
            compact
          />
        </div>
      )}

      {/* 현재 단계 친절 가이드 — 체크리스트/Alert/CTA/고객알림 미리보기 */}
      {currentStage && (
        <div className="mb-4">
          <FulfillmentGuide
            order={order}
            stage={currentStage}
            onAdvance={handleAdvance}
          />
        </div>
      )}

      {/* 캐리어 추적 카드 — 운송장 있으면 추적 링크 + URL 복사, 없으면 권장 캐리어 안내 */}
      <div className="mb-4">
        <CarrierTrackingCard order={order} showRecommendation />
      </div>

      {/* 알림 발송 이력 — 고객에게 어떤 알림이 언제 갔는지 한눈에 */}
      <div className="mb-5">
        <NotificationHistory order={order} refreshKey={currentStage?.id} />
      </div>

      {/* 헤더 status pill — 기존 호환 */}
      <div className="flex items-center gap-2 mb-4">
        <StatusPill tone={statusTone(order.status)} led={st.led}>{st.label}</StatusPill>
        {order.escrow?.status === 'held' && <StatusPill tone="emerald" dot>에스크로 보호중</StatusPill>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DSection title="주문">
          <KV k="주문번호" v={order.orderNumber} mono />
          <KV k="주문일시" v={formatDateTime(order.createdAt)} />
          <KV k="상품 수" v={`${order.items?.length || 0}건`} />
        </DSection>
        <DSection title="결제">
          <KV k="결제 수단" v={getPaymentLabel(order.payment?.method)} />
          <KV k="상품 합계" v={formatKRWFull(order.subtotal)} mono />
          <KV k="배송비" v={order.shippingFee > 0 ? formatKRWFull(order.shippingFee) : '무료'} mono />
          <KV k="총 결제" v={formatKRWFull(order.totalAmount)} mono highlight />
        </DSection>
        <DSection title="구매자">
          <KV k="이름" v={order.shipping?.recipient} />
          <KV k="연락처" v={order.shipping?.phone} />
          <KV k="이메일" v={order.user?.email || '-'} />
        </DSection>
        <DSection title="배송지">
          <KV k="방법" v={getShippingLabel(order.shipping?.method)} />
          <KV k="주소" v={formatAddress(order.shipping?.address)} />
          <KV k="서명 필수" v={order.shipping?.requireSignature ? '예' : '아니오'} />
          {order.shipping?.memo && <KV k="요청" v={order.shipping.memo} />}
        </DSection>
      </div>

      <DSection title="상품 목록">
        {order.items?.map((it, idx) => (
          <div key={idx} className="flex justify-between items-center bg-bone-2/40 border border-gray-900/8 rounded-md px-3 py-2 text-xs mb-1">
            <div className="font-bold text-ink truncate">{it.product?.nameKo || it.product?.name || it.pack?.nameKo || it.pack?.name || '-'}</div>
            <div className="font-mono text-mute ml-2 flex-shrink-0">{formatKRWFull(it.unitPrice)} × {it.qty}</div>
          </div>
        ))}
      </DSection>

      <DSection title="송장 등록">
        <div className="flex gap-2 mb-2">
          <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
            className="bg-paper border border-gray-900/15 rounded-md px-2 py-1.5 text-xs text-ink font-bold focus:border-gray-900 outline-none">
            {CARRIER_NAMES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)}
            placeholder="송장번호"
            className="flex-1 bg-paper border border-gray-900/15 rounded-md px-2 py-1.5 text-xs text-ink font-mono focus:border-gray-900 outline-none" />
          <button onClick={handleTrackingSave} disabled={saving}
            className="text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:opacity-50">
            {saving ? '저장중' : '등록'}
          </button>
        </div>
      </DSection>

      <DSection title="상태 변경">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(STATUS).filter(([k]) => k !== order.status).map(([k, v]) => (
            <button key={k}
              onClick={() => onStatusChange(order._id, k)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${v.color} hover:opacity-80`}>
              → {v.label}
            </button>
          ))}
        </div>
      </DSection>
    </Drawer>
  )
}
