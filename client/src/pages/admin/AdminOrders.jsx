import { useState } from 'react'
import { ALL_CARDS, formatKRWFull } from '@/api/cards'
import Button from '@/components/common/Button'
import PokeCard from '@/components/common/PokeCard'
import GradeBadge from '@/components/common/GradeBadge'
import Icon from '@/components/common/Icon'

const ORDERS = [
  { id: 'PV-LM4K7Z', date: '2026-05-12', cardId: 'mewtwo-1st',     buyer: 'collector_777', total: 15830000, status: 'shipping', paid: 'escrow' },
  { id: 'PV-LM3J2Y', date: '2026-05-12', cardId: 'gyarados-base',  buyer: 'PSA_hunter',    total: 1010000,  status: 'paid',     paid: 'card' },
  { id: 'PV-LM2H9X', date: '2026-05-11', cardId: 'venusaur-1st',   buyer: 'kim_collect',   total: 12730000, status: 'pending',  paid: 'bank' },
  { id: 'PV-LK9G5W', date: '2026-05-10', cardId: 'blastoise-shadowless', buyer: 'rare_chase', total: 6430000, status: 'delivered', paid: 'card' },
  { id: 'PV-LK7F2V', date: '2026-05-09', cardId: 'alakazam-base',  buyer: 'alakazam_kr',   total: 2330000, status: 'delivered', paid: 'kakao' },
]

const STATUS = {
  pending:   { label: '결제 대기', led: 'yellow' },
  paid:      { label: '결제 완료', led: 'green' },
  shipping:  { label: '운송중',    led: 'blue' },
  delivered: { label: '도착',      led: 'green' },
  refunded:  { label: '환불',      led: 'red' },
}

export default function AdminOrders() {
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')

  const list = filter === 'all' ? ORDERS : ORDERS.filter((o) => o.status === filter)

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <div className="pixel-label text-mute mb-3">Orders</div>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight">주문 관리</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', '전체'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-2 text-sm font-bold rounded-full border transition-all ${
              filter === v ? 'bg-ink text-paper border-ink' : 'bg-paper border-line text-ink hover:border-ink/30'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="surface-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bone-2/50 border-b border-line">
            <tr className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">
              <th className="text-left p-4">Order ID</th>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Card</th>
              <th className="text-left p-4">Buyer</th>
              <th className="text-right p-4">Total</th>
              <th className="text-center p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => {
              const card = ALL_CARDS.find((c) => c.id === o.cardId)
              return (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-bone-2/30">
                  <td className="p-4 font-mono text-ink font-bold">{o.id}</td>
                  <td className="p-4 text-mute font-mono text-xs">{o.date}</td>
                  <td className="p-4 text-ink font-bold">{card?.nameKo} <span className="text-mute text-xs italic">({card?.name})</span></td>
                  <td className="p-4 text-mute font-mono text-xs">{o.buyer}</td>
                  <td className="p-4 text-right font-mono text-ink font-bold tabular-nums">{formatKRWFull(o.total)}</td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                      <span className={`led led-${STATUS[o.status].led}`} style={{ width: 6, height: 6 }} />
                      {STATUS[o.status].label}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setSelected(o)} className="text-xs text-ink hover:text-dex font-bold inline-flex items-center gap-1">
                      상세 <Icon name="arrow" size={11} strokeWidth={2.2} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && <DetailModal order={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function DetailModal({ order, onClose }) {
  const card = ALL_CARDS.find((c) => c.id === order.cardId)
  const [trackingNo, setTrackingNo] = useState('')

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
      <div className="surface-soft max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto elev-3">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="pixel-label text-dex mb-2">Order Detail</div>
            <h2 className="font-display text-2xl font-bold text-ink">{order.id}</h2>
            <div className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold">
              <span className={`led led-${STATUS[order.status].led}`} style={{ width: 6, height: 6 }} />
              {STATUS[order.status].label}
            </div>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink">
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="text-center">
            {card && <div className="inline-block"><PokeCard card={card} size="md" interactive={false} /></div>}
            <div className="mt-4">
              <div className="font-display text-2xl font-bold text-ink">{card?.nameKo}</div>
              <div className="text-xs text-mute font-bold mt-1">{card?.set}</div>
              <div className="mt-3 flex justify-center"><GradeBadge grade={card?.grade} size="sm" /></div>
            </div>
          </div>

          <div className="space-y-5">
            <DSec title="주문">
              <KV k="주문일" v={order.date} />
              <KV k="결제 방법" v={order.paid.toUpperCase()} />
              <KV k="결제 금액" v={formatKRWFull(order.total)} highlight />
            </DSec>
            <DSec title="구매자">
              <KV k="아이디" v={order.buyer} />
              <KV k="연락처" v="010-****-****" />
              <KV k="이메일" v={`${order.buyer}@pokevault.kr`} />
            </DSec>
            <DSec title="배송">
              <KV k="배송지" v="서울 강남구 ***" />
              <KV k="운송수단" v="FedEx Insured" />
              <div className="pt-3">
                <div className="text-xs text-mute font-bold mb-1.5">운송장 번호</div>
                <div className="flex gap-2">
                  <input value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)}
                    placeholder="송장번호 입력"
                    className="flex-1 bg-bone-2 border border-line rounded-lg px-3 py-2 text-sm text-ink font-mono focus:border-ink outline-none" />
                  <Button variant="primary" size="sm">등록</Button>
                </div>
              </div>
            </DSec>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-line">
          <Button variant="ghost" onClick={onClose}>닫기</Button>
          <Button variant="secondary">환불 처리</Button>
          <Button variant="accent">상태 변경</Button>
        </div>
      </div>
    </div>
  )
}

function DSec({ title, children }) {
  return (
    <div>
      <div className="font-display font-bold text-ink mb-3 text-sm">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
function KV({ k, v, highlight }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-mute font-bold">{k}</span>
      <span className={`font-mono font-bold tabular-nums ${highlight ? 'text-dex' : 'text-ink'}`}>{v}</span>
    </div>
  )
}
