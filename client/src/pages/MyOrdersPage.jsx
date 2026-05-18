import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { formatKRWFull, formatDate, formatAddress } from '@/utils/format'
import {
  ORDER_STATUS, ORDER_PROGRESS_STEPS, ORDER_FILTERS,
  getPaymentLabel, getShippingLabel, isOrderCancellable,
} from '@/constants/order'
import { getMyOrders as fetchMyOrders, cancelOrder as cancelOrderApi } from '@/api/orderApi'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'

// 알리아스 — 기존 변수명 호환
const STATUS_MAP = ORDER_STATUS
const STEPS      = ORDER_PROGRESS_STEPS
const FILTERS    = ORDER_FILTERS

export default function MyOrdersPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!isAuthenticated) return
    setLoading(true)
    fetchMyOrders({ page, limit: 5, status: filter })
      .then(({ data }) => {
        setOrders(data.data || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [isAuthenticated, filter, page])

  const handleFilter = (v) => { setFilter(v); setPage(1); setExpanded(null) }

  const handleCancel = async (orderId) => {
    if (!confirm('정말 주문을 취소하시겠습니까?')) return
    try {
      await cancelOrderApi(orderId)
      setOrders((arr) => arr.map((o) => o._id === orderId ? { ...o, status: 'cancelled', cancelledAt: new Date().toISOString() } : o))
    } catch (err) {
      alert(err.response?.data?.message || '취소 처리에 실패했습니다.')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="surface-soft p-10 elev-1">
          <h2 className="font-display text-2xl font-bold text-ink mb-3">로그인이 필요합니다</h2>
          <p className="text-sm text-mute mb-6">주문 내역을 보려면 로그인해주세요.</p>
          <Link to="/login"><Button variant="primary">로그인</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="pixel-label text-mute mb-3">My Orders</div>
          <h1 className="font-display text-4xl font-bold text-ink tracking-tight">주문 내역</h1>
          <p className="text-sm text-mute mt-2">총 <span className="text-ink font-bold">{total}</span>건의 주문</p>
        </div>
        <Link to="/products">
          <Button variant="secondary" size="sm">
            <Icon name="arrow" size={12} strokeWidth={2.2} className="rotate-180" /> 카탈로그
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap mb-8 border-b border-line pb-4">
        {FILTERS.map(({ value: v, label, led }) => {
          const active = filter === v
          return (
            <button key={v} onClick={() => handleFilter(v)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full border transition-all ${
                active
                  ? 'bg-ink text-paper border-ink elev-1 scale-[1.03]'
                  : 'bg-paper border-line text-mute hover:text-ink hover:border-ink/40 hover:bg-bone-2'
              }`}>
              {led && (
                <span
                  className={`inline-block rounded-full flex-shrink-0 led led-${led} ${active ? 'led-pulse' : ''}`}
                  style={{ width: 7, height: 7, opacity: active ? 1 : 0.45 }}
                />
              )}
              {label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="surface-soft p-20 text-center">
          <div className="inline-flex items-center gap-2 text-mute font-bold">
            <span className="led led-blue led-pulse" /> 불러오는 중...
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="surface-soft p-20 text-center elev-1">
          <Icon name="package" size={48} strokeWidth={1.2} className="text-mute mx-auto mb-5" />
          <p className="font-display text-2xl font-bold text-ink mb-2">주문 내역이 없습니다</p>
          <p className="text-sm text-mute mb-6">카탈로그에서 카드를 골라보세요.</p>
          <Link to="/products"><Button variant="primary" size="lg">카탈로그 둘러보기 <Icon name="arrow" size={14} strokeWidth={2.2} /></Button></Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((o) => (
            <OrderCard
              key={o._id}
              order={o}
              expanded={expanded === o._id}
              onToggle={() => setExpanded(expanded === o._id ? null : o._id)}
              onCancel={() => handleCancel(o._id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-9 h-9 rounded-md border border-line bg-paper text-ink font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bone-2 transition-colors"
          >‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPage(n)}
              className={`w-9 h-9 rounded-md font-bold text-sm transition-all ${
                n === page ? 'bg-ink text-paper elev-1' : 'border border-line bg-paper text-ink hover:bg-bone-2'
              }`}>{n}</button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 rounded-md border border-line bg-paper text-ink font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bone-2 transition-colors"
          >›</button>
        </div>
      )}
    </div>
  )
}

// ─── Order Card ─────────────────────────────────────────────
function OrderCard({ order, expanded, onToggle, onCancel }) {
  const st = STATUS_MAP[order.status] || STATUS_MAP.paid
  const date = formatDate(order.createdAt)
  const firstItem = order.items?.[0]
  const moreCount = (order.items?.length || 0) - 1
  const isCancellable = isOrderCancellable(order.status)

  return (
    <div className={`surface-soft elev-1 overflow-hidden transition-all ${expanded ? 'elev-2' : 'hover:elev-2'}`}>
      {/* Top strip — date + order number + status */}
      <div className="flex items-center justify-between gap-3 px-6 py-3 bg-bone-2/40 border-b border-line">
        <div className="flex items-center gap-4">
          <div className="font-mono text-xs text-mute">{date}</div>
          <div className="font-mono text-xs font-bold text-ink">#{order.orderNumber}</div>
        </div>
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${st.color}`}>
          <span className={`led led-${st.led} ${st.step < 4 && st.step >= 0 ? 'led-pulse' : ''}`} style={{ width: 6, height: 6 }} />
          {st.label}
        </div>
      </div>

      {/* Main row */}
      <div className="p-6">
        <div className="flex items-center gap-5">
          {/* Card thumbs */}
          <div className="flex -space-x-3 flex-shrink-0">
            {order.items?.slice(0, 3).map((it, idx) => {
              const img = Array.isArray(it.product?.images) ? it.product.images[0] : it.product?.images
              return (
                <div key={idx} className="w-14 h-20 rounded-md bg-bone-2 border-2 border-paper elev-1 overflow-hidden flex-shrink-0">
                  {img ? <img src={img} alt={it.product?.name} className="w-full h-full object-contain" /> : null}
                </div>
              )
            })}
            {moreCount > 0 && (
              <div className="w-14 h-20 rounded-md bg-ink text-paper border-2 border-paper elev-1 flex items-center justify-center font-bold text-sm">
                +{moreCount}
              </div>
            )}
          </div>

          {/* Item summary */}
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg font-bold text-ink truncate">
              {firstItem?.product?.nameKo || firstItem?.product?.name}
              {moreCount > 0 && <span className="text-mute font-normal text-sm ml-1.5">외 {moreCount}건</span>}
            </div>
            <div className="text-xs text-mute mt-1 font-mono">
              {firstItem?.product?.sku} · {getShippingLabel(order.shipping?.method)}
            </div>
            {order.shipping?.trackingNumber && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                <Icon name="package" size={11} strokeWidth={2} />
                {order.shipping.carrier} · {order.shipping.trackingNumber}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1">Total</div>
            <div className="font-display text-2xl font-bold text-ink tabular-nums">{formatKRWFull(order.totalAmount)}</div>
            <div className="text-[10px] text-mute mt-0.5">{getPaymentLabel(order.payment?.method)}</div>
          </div>
        </div>

        {/* Progress timeline (only for non-cancelled) */}
        {st.step >= 0 && (
          <div className="mt-6 pt-5 border-t border-line">
            <div className="grid grid-cols-5 gap-1 mb-3">
              {STEPS.map((label, i) => (
                <div key={i} className="text-center">
                  <div className={`mx-auto w-7 h-7 rounded-full flex items-center justify-center mb-1.5 text-[11px] font-bold transition-all ${
                    i <= st.step
                      ? 'bg-emerald-500 text-paper elev-1'
                      : 'bg-bone-2 text-mute border border-line'
                  }`}>
                    {i < st.step ? <Icon name="check" size={11} strokeWidth={2.8} /> : i + 1}
                  </div>
                  <div className={`text-[10px] font-bold ${i <= st.step ? 'text-ink' : 'text-mute'}`}>{label}</div>
                </div>
              ))}
            </div>
            <div className="hp-bar">
              <div className="hp-bar-fill transition-all duration-500"
                style={{ width: `${((st.step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-5 border-t border-line">
          <button onClick={onToggle}
            className="text-xs font-bold text-mute hover:text-ink inline-flex items-center gap-1.5 transition-colors">
            {expanded ? '상세 닫기' : '상세 보기'}
            <Icon name="arrow" size={10} strokeWidth={2.5} className={`transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
          </button>
          <div className="flex gap-2">
            {isCancellable && (
              <button onClick={onCancel}
                className="px-3 py-1.5 text-xs font-bold rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors">
                주문 취소
              </button>
            )}
            {order.shipping?.trackingNumber && (
              <button className="px-3 py-1.5 text-xs font-bold rounded-md border border-line text-ink hover:bg-bone-2 transition-colors">
                배송 조회
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="bg-bone-2/40 border-t border-line px-6 py-5 space-y-5">
          {/* All items */}
          <div>
            <div className="pixel-label text-mute mb-3">Items</div>
            <div className="space-y-2">
              {order.items?.map((it, idx) => {
                const img = Array.isArray(it.product?.images) ? it.product.images[0] : it.product?.images
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-paper border border-line">
                    <div className="w-10 h-14 rounded-md bg-bone-2 overflow-hidden flex-shrink-0">
                      {img ? <img src={img} alt={it.product?.name} className="w-full h-full object-contain" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-ink text-sm truncate">{it.product?.nameKo || it.product?.name}</div>
                      <div className="text-xs text-mute font-mono">{it.product?.sku}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-ink tabular-nums text-sm">{formatKRWFull(it.unitPrice * it.qty)}</div>
                      <div className="text-[10px] text-mute">{formatKRWFull(it.unitPrice)} × {it.qty}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Two-column info */}
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-paper rounded-lg border border-line p-4">
              <div className="pixel-label text-mute mb-3">Shipping</div>
              <KV k="수령인" v={`${order.shipping?.recipient} (${order.shipping?.phone})`} />
              <KV k="주소" v={formatAddress(order.shipping?.address)} />
              <KV k="배송 방법" v={getShippingLabel(order.shipping?.method)} />
              <KV k="서명 필수" v={order.shipping?.requireSignature ? '예' : '아니오'} />
              {order.shipping?.memo && <KV k="요청 사항" v={order.shipping.memo} />}
            </div>
            <div className="bg-paper rounded-lg border border-line p-4">
              <div className="pixel-label text-mute mb-3">Payment</div>
              <KV k="결제 수단" v={getPaymentLabel(order.payment?.method)} />
              <KV k="상품 합계" v={formatKRWFull(order.subtotal)} mono />
              <KV k="배송비" v={order.shippingFee > 0 ? formatKRWFull(order.shippingFee) : '무료'} mono />
              {order.insuranceFee > 0 && <KV k="보험료" v={formatKRWFull(order.insuranceFee)} mono />}
              <div className="border-t border-line my-2" />
              <KV k="총 결제" v={formatKRWFull(order.totalAmount)} mono highlight />
              {order.escrow?.status === 'held' && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                  <Icon name="shield" size={10} strokeWidth={2} /> 에스크로 보호
                </div>
              )}
            </div>
          </div>

          {/* Cancel info */}
          {order.cancelledAt && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-sm">
              <div className="font-bold text-rose-700 mb-1">취소 안내</div>
              <div className="text-rose-800/80 text-xs">
                {formatDate(order.cancelledAt)} 취소됨
                {order.cancelReason && ` · 사유: ${order.cancelReason}`}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KV({ k, v, mono, highlight }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-xs">
      <span className="text-mute font-bold flex-shrink-0">{k}</span>
      <span className={`text-right ${mono ? 'font-mono tabular-nums' : ''} ${highlight ? 'text-ink font-bold text-sm' : 'text-ink'}`}>{v}</span>
    </div>
  )
}
