import { useState, useEffect, useCallback } from 'react'
import { formatKRWFull, formatDateShort, formatTime, formatAddress, formatDateTime } from '@/utils/format'
import {
  ORDER_STATUS, ORDER_FILTERS,
  getPaymentLabel, getShippingLabel,
} from '@/constants/order'
import {
  getAllOrders, updateOrderStatus as apiUpdateStatus, updateOrderTracking,
} from '@/api/orderApi'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'

const STATUS    = ORDER_STATUS
const FILTERS   = ORDER_FILTERS
const PAGE_SIZE = 10

export default function AdminOrders() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]         = useState(0)
  const [selected, setSelected]   = useState(null)
  const [search, setSearch]       = useState('')
  const [searchInput, setSearchInput] = useState('')

  const fetchOrders = useCallback(() => {
    setLoading(true)
    getAllOrders({ page, limit: PAGE_SIZE, status: filter, search })
      .then(({ data }) => {
        setOrders(data.data || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [filter, page, search])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleFilter = (v) => { setFilter(v); setPage(1) }
  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await apiUpdateStatus(orderId, newStatus)
      fetchOrders()
      if (selected?._id === orderId) setSelected((o) => ({ ...o, status: newStatus }))
    } catch (err) {
      alert(err.response?.data?.message || '상태 변경 실패')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="pixel-label text-mute mb-2">Orders</div>
          <h1 className="font-display text-4xl font-bold text-ink tracking-tight">주문 관리</h1>
          <p className="text-sm text-mute mt-1">총 <span className="font-bold text-ink">{total}</span>건</p>
        </div>
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="주문번호 / 구매자 이름 검색"
            className="bg-paper border border-line rounded-lg px-3 py-2 text-sm text-ink focus:border-ink outline-none w-56"
          />
          <Button variant="secondary" size="sm" type="submit">
            <Icon name="search" size={13} strokeWidth={2} /> 검색
          </Button>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-line pb-4">
        {FILTERS.map(({ value: v, label }) => {
          const st = STATUS[v]
          return (
            <button key={v} onClick={() => handleFilter(v)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full border transition-all ${
                filter === v
                  ? 'bg-ink text-paper border-ink elev-1 scale-[1.03]'
                  : 'bg-paper border-line text-mute hover:text-ink hover:border-ink/40 hover:bg-bone-2'
              }`}>
              {st && (
                <span className={`inline-block rounded-full flex-shrink-0 led led-${st.led}`}
                  style={{ width: 7, height: 7, opacity: filter === v ? 1 : 0.45 }} />
              )}
              {label}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="surface-soft overflow-x-auto elev-1">
        {loading ? (
          <div className="p-20 text-center text-mute font-bold">
            <span className="led led-blue led-pulse mr-2" />불러오는 중...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-20 text-center">
            <Icon name="package" size={40} strokeWidth={1.3} className="text-mute mx-auto mb-4" />
            <p className="font-bold text-ink mb-1">주문이 없습니다</p>
            <p className="text-sm text-mute">해당 조건의 주문이 없어요.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bone-2/60 border-b border-line">
              <tr className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">
                <th className="text-left p-4">주문번호</th>
                <th className="text-left p-4">일시</th>
                <th className="text-left p-4">구매자</th>
                <th className="text-left p-4">상품</th>
                <th className="text-left p-4">배송</th>
                <th className="text-right p-4">금액</th>
                <th className="text-center p-4">결제</th>
                <th className="text-center p-4">상태</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const st = STATUS[o.status] || STATUS.paid
                const firstItem = o.items?.[0]
                const moreCount = (o.items?.length || 0) - 1
                const date = formatDateShort(o.createdAt)
                const time = formatTime(o.createdAt)
                return (
                  <tr key={o._id} className="border-b border-line last:border-0 hover:bg-bone-2/30 transition-colors">
                    <td className="p-4 font-mono text-ink font-bold text-xs">{o.orderNumber}</td>
                    <td className="p-4 text-mute font-mono text-xs whitespace-nowrap">
                      <div>{date}</div>
                      <div className="opacity-60">{time}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-ink text-xs">{o.shipping?.recipient}</div>
                      <div className="text-mute font-mono text-[10px]">{o.user?.email || '-'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-ink text-xs">
                        {firstItem?.product?.nameKo || firstItem?.product?.name || '-'}
                        {moreCount > 0 && <span className="text-mute font-normal ml-1">외 {moreCount}</span>}
                      </div>
                      <div className="text-mute text-[10px]">수량 {o.items?.reduce((s, i) => s + i.qty, 0)}개</div>
                    </td>
                    <td className="p-4 text-mute text-xs">{getShippingLabel(o.shipping?.method)}</td>
                    <td className="p-4 text-right font-mono font-bold text-ink tabular-nums text-xs">
                      {formatKRWFull(o.totalAmount)}
                    </td>
                    <td className="p-4 text-center text-xs text-mute font-bold">
                      {getPaymentLabel(o.payment?.method)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>
                        <span className={`led led-${st.led}`} style={{ width: 5, height: 5 }} />
                        {st.label}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => setSelected(o)}
                        className="text-xs text-mute hover:text-ink font-bold inline-flex items-center gap-1 transition-colors">
                        상세 <Icon name="arrow" size={11} strokeWidth={2.2} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-mute font-mono">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}건
          </span>
          <div className="flex gap-1.5">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-line bg-paper text-ink font-bold text-sm hover:bg-bone-2 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-lg border text-sm font-bold transition-all ${
                  n === page ? 'bg-ink text-paper border-ink' : 'bg-paper border-line text-ink hover:bg-bone-2'
                }`}>{n}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 rounded-lg border border-line bg-paper text-ink font-bold text-sm hover:bg-bone-2 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <DetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onTrackingUpdate={fetchOrders}
        />
      )}
    </div>
  )
}

// ─── Detail Modal ────────────────────────────────────────────
function DetailModal({ order, onClose, onStatusChange, onTrackingUpdate }) {
  const [trackingNo, setTrackingNo] = useState(order.shipping?.trackingNumber || '')
  const [carrier, setCarrier] = useState(order.shipping?.carrier || 'FedEx')
  const [statusVal, setStatusVal] = useState(order.status)
  const [saving, setSaving] = useState(false)
  const st = STATUS[order.status] || STATUS.paid

  const handleTrackingSave = async () => {
    setSaving(true)
    try {
      await updateOrderTracking(order._id, { trackingNumber: trackingNo, carrier })
      onTrackingUpdate()
      alert('송장이 등록되었습니다.')
    } catch (err) {
      alert(err.response?.data?.message || '송장 등록 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusSave = async () => {
    await onStatusChange(order._id, statusVal)
  }

  const date = formatDateTime(order.createdAt)

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="surface-soft max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto elev-3 rounded-2xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="pixel-label text-dex mb-2">Order Detail</div>
            <h2 className="font-display text-2xl font-bold text-ink">{order.orderNumber}</h2>
            <div className={`inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-2.5 py-1 rounded-full border ${st.color}`}>
              <span className={`led led-${st.led}`} style={{ width: 6, height: 6 }} />
              {st.label}
            </div>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink p-1">
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: 주문 / 구매자 / 결제 */}
          <div className="space-y-5">
            <DSec title="주문 정보">
              <KV k="주문일시" v={date} />
              <KV k="주문번호" v={order.orderNumber} mono />
              <KV k="상품 수" v={`${order.items?.length || 0}건`} />
            </DSec>
            <DSec title="결제">
              <KV k="결제 수단" v={getPaymentLabel(order.payment?.method)} />
              <KV k="상품 합계" v={formatKRWFull(order.subtotal)} mono />
              <KV k="배송비" v={order.shippingFee > 0 ? formatKRWFull(order.shippingFee) : '무료'} mono />
              <div className="border-t border-line my-1" />
              <KV k="총 결제" v={formatKRWFull(order.totalAmount)} mono highlight />
              {order.escrow?.status === 'held' && (
                <div className="mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                  <Icon name="shield" size={10} strokeWidth={2} /> 에스크로 보호중
                </div>
              )}
            </DSec>
            <DSec title="구매자">
              <KV k="이름" v={order.shipping?.recipient} />
              <KV k="연락처" v={order.shipping?.phone} />
              <KV k="이메일" v={order.user?.email || '-'} />
            </DSec>
          </div>

          {/* Right: 배송 / 상품 / 상태관리 */}
          <div className="space-y-5">
            <DSec title="배송지">
              <KV k="방법" v={getShippingLabel(order.shipping?.method)} />
              <KV k="주소" v={formatAddress(order.shipping?.address)} />
              <KV k="서명 필수" v={order.shipping?.requireSignature ? '예' : '아니오'} />
              {order.shipping?.memo && <KV k="요청 사항" v={order.shipping.memo} />}
            </DSec>

            {/* 상품 목록 */}
            <DSec title="상품 목록">
              <div className="space-y-2">
                {order.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-bone-2/50 rounded-lg px-3 py-2 text-xs">
                    <div className="font-bold text-ink truncate">{it.product?.nameKo || it.product?.name || '-'}</div>
                    <div className="font-mono text-mute ml-2 flex-shrink-0">{formatKRWFull(it.unitPrice)} × {it.qty}</div>
                  </div>
                ))}
              </div>
            </DSec>

            {/* 송장 등록 */}
            <DSec title="송장 등록">
              <div className="flex gap-2 mb-2">
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)}
                  className="bg-paper border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-ink outline-none">
                  <option value="FedEx">FedEx</option>
                  <option value="Brink's">Brink's</option>
                  <option value="CJ대한통운">CJ대한통운</option>
                  <option value="우체국">우체국</option>
                </select>
                <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)}
                  placeholder="송장번호 입력"
                  className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-xs text-ink font-mono focus:border-ink outline-none" />
              </div>
              <Button variant="secondary" size="sm" onClick={handleTrackingSave} disabled={saving}>
                {saving ? '저장 중...' : '송장 등록'}
              </Button>
            </DSec>

            {/* 상태 변경 */}
            <DSec title="상태 변경">
              <div className="flex gap-2">
                <select value={statusVal} onChange={(e) => setStatusVal(e.target.value)}
                  className="flex-1 bg-paper border border-line rounded-lg px-3 py-2 text-sm text-ink focus:border-ink outline-none">
                  {Object.entries(STATUS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <Button variant="primary" size="sm" onClick={handleStatusSave}>변경</Button>
              </div>
            </DSec>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-line">
          <Button variant="ghost" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  )
}

function DSec({ title, children }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function KV({ k, v, mono, highlight }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-mute font-bold flex-shrink-0">{k}</span>
      <span className={`text-right break-all ${mono ? 'font-mono tabular-nums' : ''} ${highlight ? 'text-dex font-bold text-sm' : 'text-ink font-bold'}`}>{v}</span>
    </div>
  )
}
