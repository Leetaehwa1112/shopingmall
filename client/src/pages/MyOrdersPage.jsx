import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { formatKRWFull, formatDate, formatAddress } from '@/utils/format'
import {
  ORDER_STATUS, ORDER_PROGRESS_STEPS, ORDER_FILTERS,
  getPaymentLabel, getShippingLabel, isOrderCancellable,
} from '@/constants/order'
import { getMyOrders as fetchMyOrders, cancelOrder as cancelOrderApi } from '@/api/orderApi'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import Icon from '@/components/common/Icon'

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
        <div className="surface-pop p-10 sparkle-host relative bg-confetti">
          <Sparkles always />
          <h2 className="font-display text-2xl font-bold text-ink mb-3">로그인이 필요해요</h2>
          <p className="text-sm text-mute mb-6 font-medium">주문 내역을 보려면 로그인해주세요.</p>
          <Link to="/login" className="btn-pop px-6 py-3 rounded-xl inline-flex items-center gap-2 font-bold">
            로그인 <Icon name="arrow" size={14} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <Eyebrow tone="water" led="blue" pulse>MY ORDERS · 주문 내역</Eyebrow>
          <h1 className="mt-3 font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
            내 주문
            <span className="relative inline-block ml-3">
              <span className="relative z-10 text-water">{total}건</span>
              <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
            </span>
          </h1>
          <p className="text-sm text-mute mt-3 font-medium">우리집까지 안전하게 가는 중이에요.</p>
        </div>
        <Link to="/products"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper border-2 border-ink text-ink font-bold text-sm shadow-[0_2px_0_#1a1a1a] hover:bg-electric/30 hover:-translate-y-0.5 transition-all">
          <Icon name="arrow" size={12} strokeWidth={2.4} className="rotate-180" /> 카탈로그
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap mb-8 pb-4 border-b-2 border-ink/15">
        {FILTERS.map(({ value: v, label, led }) => {
          const active = filter === v
          return (
            <button key={v} onClick={() => handleFilter(v)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full border-2 transition-all ${
                active
                  ? 'bg-ink text-electric border-ink shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                  : 'bg-paper border-ink/20 text-ink hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
              }`}>
              {led && (
                <span
                  className={`inline-block rounded-full flex-shrink-0 led led-${led} ${active ? 'led-pulse' : ''}`}
                  style={{ width: 7, height: 7, opacity: active ? 1 : 0.5 }}
                />
              )}
              {label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="surface-pop p-16 text-center">
          <div className="inline-flex items-center gap-3 text-mute font-bold">
            <span className="led led-yellow led-pulse" style={{ width: 8, height: 8 }} />
            주문 불러오는 중...
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="surface-pop p-16 text-center sparkle-host relative bg-confetti">
          <Sparkles always />
          <div className="w-20 h-20 mx-auto rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a] mb-5">
            <Icon name="package" size={36} strokeWidth={2} className="text-ink" />
          </div>
          <p className="font-display text-2xl font-bold text-ink mb-2">아직 주문 내역이 없어요</p>
          <p className="text-sm text-mute mb-6 font-medium">카탈로그에서 첫 카드를 골라보세요.</p>
          <Link to="/products" className="btn-pop px-6 py-3 rounded-xl inline-flex items-center gap-2 font-bold">
            카탈로그 둘러보기 <Icon name="arrow" size={14} strokeWidth={2.4} />
          </Link>
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

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10 flex-wrap">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 rounded-lg border-2 border-ink bg-paper text-ink font-bold text-sm shadow-[0_3px_0_#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-electric/30 hover:-translate-y-0.5 disabled:hover:translate-y-0 transition-all"
          >‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPage(n)}
              className={`w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 ${
                n === page
                  ? 'bg-ink text-electric border-ink -translate-y-0.5'
                  : 'border-ink bg-paper text-ink hover:bg-electric/30'
              }`}>{n}</button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-10 h-10 rounded-lg border-2 border-ink bg-paper text-ink font-bold text-sm shadow-[0_3px_0_#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-electric/30 hover:-translate-y-0.5 disabled:hover:translate-y-0 transition-all"
          >›</button>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, expanded, onToggle, onCancel }) {
  const st = STATUS_MAP[order.status] || STATUS_MAP.paid
  const date = formatDate(order.createdAt)
  const firstItem = order.items?.[0]
  const moreCount = (order.items?.length || 0) - 1
  const isCancellable = isOrderCancellable(order.status)

  return (
    <div className="surface-pop overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-3 bg-electric/10 border-b-2 border-ink/15">
        <div className="flex items-center gap-4">
          <div className="font-mono text-xs text-mute font-bold">{date}</div>
          <div className="font-mono text-xs font-bold text-ink">#{order.orderNumber}</div>
        </div>
        <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border-2 ${st.color}`}>
          <span className={`led led-${st.led} ${st.step < 4 && st.step >= 0 ? 'led-pulse' : ''}`} style={{ width: 6, height: 6 }} />
          {st.label}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-5">
          <div className="flex -space-x-3 flex-shrink-0">
            {order.items?.slice(0, 3).map((it, idx) => {
              const img = Array.isArray(it.product?.images) ? it.product.images[0] : it.product?.images
              return (
                <div key={idx} className="w-14 h-20 rounded-md bg-bone-2 border-2 border-ink shadow-[0_2px_0_#1a1a1a] overflow-hidden flex-shrink-0">
                  {img ? <img src={img} alt={it.product?.name} className="w-full h-full object-contain" /> : null}
                </div>
              )
            })}
            {moreCount > 0 && (
              <div className="w-14 h-20 rounded-md bg-ink text-electric border-2 border-ink shadow-[0_2px_0_#1a1a1a] flex items-center justify-center font-bold text-sm">
                +{moreCount}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-display text-lg font-bold text-ink truncate">
              {firstItem?.product?.nameKo || firstItem?.product?.name}
              {moreCount > 0 && <span className="text-mute font-normal text-sm ml-1.5">외 {moreCount}건</span>}
            </div>
            <div className="text-xs text-mute mt-1 font-mono font-bold">
              {firstItem?.product?.sku} · {getShippingLabel(order.shipping?.method)}
            </div>
            {order.shipping?.trackingNumber && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-ink bg-water/20 px-2 py-1 rounded-full border-2 border-water">
                <Icon name="package" size={11} strokeWidth={2} />
                {order.shipping.carrier} · {order.shipping.trackingNumber}
              </div>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1">Total</div>
            <div className="font-display text-2xl font-bold text-ink tabular-nums">{formatKRWFull(order.totalAmount)}</div>
            <div className="text-[10px] text-mute mt-0.5 font-bold">{getPaymentLabel(order.payment?.method)}</div>
          </div>
        </div>

        {st.step >= 0 && (
          <div className="mt-6 pt-5 border-t-2 border-ink/15">
            <div className="grid grid-cols-5 gap-1 mb-3">
              {STEPS.map((label, i) => (
                <div key={i} className="text-center">
                  <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center mb-1.5 text-[11px] font-bold border-2 border-ink transition-all ${
                    i <= st.step
                      ? 'bg-grass text-white shadow-[0_2px_0_#1a1a1a]'
                      : 'bg-paper text-mute'
                  }`}>
                    {i < st.step ? <Icon name="check" size={11} strokeWidth={3} /> : i + 1}
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

        <div className="flex items-center justify-between gap-3 mt-5 pt-5 border-t-2 border-ink/15">
          <button onClick={onToggle}
            className="text-xs font-bold text-mute hover:text-ink inline-flex items-center gap-1.5 transition-colors">
            {expanded ? '상세 닫기' : '상세 보기'}
            <Icon name="arrow" size={10} strokeWidth={2.8} className={`transition-transform ${expanded ? '-rotate-90' : 'rotate-90'}`} />
          </button>
          <div className="flex gap-2">
            {isCancellable && (
              <button onClick={onCancel}
                className="px-3 py-1.5 text-xs font-bold rounded-md border-2 border-dex text-dex bg-paper hover:bg-rose-50 transition-colors">
                주문 취소
              </button>
            )}
            {order.shipping?.trackingNumber && (
              <button className="px-3 py-1.5 text-xs font-bold rounded-md border-2 border-ink text-ink bg-paper hover:bg-electric/30 transition-colors">
                배송 조회
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="bg-bone-2/60 border-t-2 border-ink/15 px-6 py-5 space-y-5">
          <div>
            <Eyebrow tone="electric" led="yellow">ITEMS · 상품</Eyebrow>
            <div className="space-y-2 mt-3">
              {order.items?.map((it, idx) => {
                const img = Array.isArray(it.product?.images) ? it.product.images[0] : it.product?.images
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-paper border-2 border-ink/15">
                    <div className="w-10 h-14 rounded-md bg-bone-2 border border-ink/15 overflow-hidden flex-shrink-0">
                      {img ? <img src={img} alt={it.product?.name} className="w-full h-full object-contain" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-ink text-sm truncate">{it.product?.nameKo || it.product?.name}</div>
                      <div className="text-xs text-mute font-mono">{it.product?.sku}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-ink tabular-nums text-sm">{formatKRWFull(it.unitPrice * it.qty)}</div>
                      <div className="text-[10px] text-mute font-bold">{formatKRWFull(it.unitPrice)} × {it.qty}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-paper rounded-lg border-2 border-ink/15 p-4">
              <Eyebrow tone="water" led="blue">SHIPPING · 배송</Eyebrow>
              <div className="mt-3">
                <KV k="수령인" v={`${order.shipping?.recipient} (${order.shipping?.phone})`} />
                <KV k="주소" v={formatAddress(order.shipping?.address)} />
                <KV k="배송 방법" v={getShippingLabel(order.shipping?.method)} />
                <KV k="서명 필수" v={order.shipping?.requireSignature ? '예' : '아니오'} />
                {order.shipping?.memo && <KV k="요청 사항" v={order.shipping.memo} />}
              </div>
            </div>
            <div className="bg-paper rounded-lg border-2 border-ink/15 p-4">
              <Eyebrow tone="grass" led="green">PAYMENT · 결제</Eyebrow>
              <div className="mt-3">
                <KV k="결제 수단" v={getPaymentLabel(order.payment?.method)} />
                <KV k="상품 합계" v={formatKRWFull(order.subtotal)} mono />
                <KV k="배송비" v={order.shippingFee > 0 ? formatKRWFull(order.shippingFee) : '무료'} mono />
                {order.insuranceFee > 0 && <KV k="보험료" v={formatKRWFull(order.insuranceFee)} mono />}
                <div className="border-t-2 border-ink/15 my-2" />
                <KV k="총 결제" v={formatKRWFull(order.totalAmount)} mono highlight />
                {order.escrow?.status === 'held' && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-grass bg-grass/15 px-2 py-1 rounded-full border-2 border-grass">
                    <Icon name="shield" size={10} strokeWidth={2} /> 에스크로 보호
                  </div>
                )}
              </div>
            </div>
          </div>

          {order.cancelledAt && (
            <div className="bg-rose-50 border-2 border-dex rounded-lg p-4 text-sm">
              <div className="font-bold text-dex mb-1">취소 안내</div>
              <div className="text-dex/80 text-xs font-medium">
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
      <span className={`text-right ${mono ? 'font-mono tabular-nums' : ''} ${highlight ? 'text-ink font-bold text-sm' : 'text-ink font-medium'}`}>{v}</span>
    </div>
  )
}
