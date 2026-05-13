import { Link } from 'react-router-dom'
import { formatKRWFull } from '@/api/cards'
import Button from '@/components/common/Button'
import PokeCard from '@/components/common/PokeCard'
import Icon from '@/components/common/Icon'

export default function OrderCompletePage() {
  const order = JSON.parse(sessionStorage.getItem('last-order') || '{}')
  if (!order.items) return <div className="p-20 text-center text-mute">주문 내역이 없습니다.</div>

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 relative">
      {/* Confetti */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: `${10 + i * 7}%`,
              top: `${10 + (i % 5) * 10}%`,
              background: ['#dc2626', '#f5b800', '#2a4480', '#84cc16'][i % 4],
              animation: `confetti 3s ease-in-out ${i * 0.15}s infinite`,
            }} />
        ))}
        <style>{`@keyframes confetti { 0%,100% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-24px); } }`}</style>
      </div>

      <div className="text-center mb-12 relative">
        <div className="inline-flex items-center justify-center gap-2 mb-5">
          <span className="led led-green led-pulse" />
          <span className="led led-green led-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="led led-green led-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[0.18em] uppercase mb-5">
          <Icon name="check" size={12} strokeWidth={2.5} /> Order Confirmed
        </div>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight mb-2">결제가 완료되었습니다</h1>
        <p className="text-sm text-mute">컬렉션에 카드가 추가되었습니다. 안전하게 배송됩니다.</p>
        <div className="font-mono text-xs text-mute mt-4">ORDER · {order.orderId}</div>
      </div>

      <div className="flex justify-center gap-3 mb-10 flex-wrap">
        {order.items.map((c) => (
          <PokeCard key={c.id} card={c} size="sm" interactive={false} showShine={false} />
        ))}
      </div>

      <div className="surface-soft p-8 mb-6 elev-2">
        <div className="grid md:grid-cols-3 gap-6 pb-6 border-b border-line">
          <Stat label="결제 금액" value={formatKRWFull(order.total)} highlight />
          <Stat label="결제 수단" value={methodLabel(order.method)} />
          <Stat label="배송 예정" value="1-2일 이내" />
        </div>
        <div className="grid md:grid-cols-2 gap-6 pt-6">
          <KV k="수령인" v={`${order.form?.name} (${order.form?.phone})`} />
          <KV k="배송지" v={`${order.form?.addr1} ${order.form?.addr2 || ''}`} />
          <KV k="배송 방법" v={shippingLabel(order.form?.shipping)} />
          <KV k="서명 필수" v={order.form?.signature ? '예' : '아니오'} />
        </div>
      </div>

      <div className="surface-soft p-8 mb-10">
        <div className="pixel-label text-mute mb-6 inline-flex items-center gap-2">
          <Icon name="package" size={14} strokeWidth={1.8} /> Shipping Status
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {['주문 확정', '발송 준비', '운송중', '도착'].map((s, i) => (
            <div key={s} className="text-center">
              <div className={`mx-auto w-11 h-11 rounded-full flex items-center justify-center mb-2 font-bold text-sm ${
                i === 0 ? 'bg-emerald-500 text-paper elev-1' : 'bg-bone-2 text-mute'
              }`}>
                {i === 0 ? <Icon name="check" size={16} strokeWidth={2.5} /> : i + 1}
              </div>
              <div className={`text-xs font-bold ${i === 0 ? 'text-ink' : 'text-mute'}`}>{s}</div>
            </div>
          ))}
        </div>
        <div className="hp-bar"><div className="hp-bar-fill" style={{ width: '25%' }} /></div>
      </div>

      <div className="flex gap-3 justify-center">
        <Link to="/mypage"><Button variant="primary" size="lg">컬렉션 보기</Button></Link>
        <Link to="/products"><Button variant="secondary" size="lg">계속 쇼핑</Button></Link>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1.5">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${highlight ? 'text-dex' : 'text-ink'}`}>{value}</div>
    </div>
  )
}
function KV({ k, v }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase">{k}</div>
      <div className="text-sm text-ink font-bold mt-1.5">{v}</div>
    </div>
  )
}
function methodLabel(m) {
  return { card: '신용카드', toss: '토스페이', kakao: '카카오페이', bank: '가상계좌', escrow: '에스크로' }[m] || m
}
function shippingLabel(s) {
  return { fedex: 'FedEx Priority', ems: 'EMS Premium', pickup: '직접 수령' }[s] || s
}
