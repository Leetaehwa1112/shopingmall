import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { formatKRWFull, getShippingOptionsForPrice, getShippingTier, SHIPPING_TIER } from '@/api/cards'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'

export default function OrderPage() {
  const { items, total } = useCartStore()
  const navigate = useNavigate()

  // 카트 상품 중 가장 비싼 가격으로 배송 등급 결정
  const maxPrice = useMemo(() => Math.max(0, ...items.map((c) => c.price || c.currentBid || 0)), [items])
  const isAllPacks = items.length > 0 && items.every((i) => i.type === 'pack' || i.type === 'box')
  const tier = getShippingTier(maxPrice)
  const requireBrinks = tier === SHIPPING_TIER.BRINKS_REQUIRED
  const shippingOpts = useMemo(() => getShippingOptionsForPrice(maxPrice, isAllPacks), [maxPrice, isAllPacks])

  const [form, setForm] = useState({
    name: '', phone: '', zip: '', addr1: '', addr2: '',
    shipping: shippingOpts[0]?.id || 'standard',
    signature: true, insurance: true, memo: '',
  })

  // Brink's 강제 시 자동 설정
  useEffect(() => {
    if (requireBrinks && form.shipping !== 'brinks') {
      setForm((f) => ({ ...f, shipping: 'brinks' }))
    }
  }, [requireBrinks, form.shipping])

  if (items.length === 0) {
    return (
      <div className="p-20 text-center text-mute">
        주문할 상품이 없습니다.
        <div className="mt-6"><Button variant="primary" onClick={() => navigate('/products')}>카탈로그</Button></div>
      </div>
    )
  }

  const shipOpt = shippingOpts.find((o) => o.id === form.shipping) || shippingOpts[0]
  const shipping = shipOpt?.price || 0
  const insurance = form.insurance ? Math.floor(total() * 0.005) : 0
  const grand = total() + shipping + insurance

  const submit = (e) => {
    e.preventDefault()
    sessionStorage.setItem('pending-order', JSON.stringify({ items, form, total: grand, shipOpt }))
    navigate('/checkout')
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="pixel-label text-mute mb-3">Order</div>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight">주문 정보</h1>
      </div>

      {/* Mandatory Brink's banner */}
      {requireBrinks && (
        <div className="bg-gradient-to-br from-rose-50 to-red-50 border-2 border-dex/40 rounded-xl p-5 mb-6 flex items-start gap-4 elev-1">
          <div className="w-12 h-12 rounded-full bg-dex text-paper flex items-center justify-center flex-shrink-0">
            <Icon name="shield" size={24} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-dex inline-flex items-center gap-2">
              Brink's Armored Transport 자동 적용
              <span className="pixel-label bg-dex text-paper px-2 py-0.5 rounded-full text-[9px]">MANDATORY</span>
            </div>
            <div className="text-sm text-ink/85 mt-1.5 leading-relaxed">
              1억원 이상 거래는 <strong>Brink's Global Services</strong>의 보안 호송이 의무입니다.
              무장 운송 차량 + 호송 인력 2인 + 전액 보험 + 실시간 추적.
              운송 비용 ₩1,500,000.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Section title="배송지">
            <div className="grid grid-cols-2 gap-4">
              <Field label="수령인" value={form.name} onChange={(v) => setForm({...form, name: v})} required />
              <Field label="연락처" value={form.phone} onChange={(v) => setForm({...form, phone: v})} required placeholder="010-0000-0000" />
              <Field label="우편번호" value={form.zip} onChange={(v) => setForm({...form, zip: v})} required />
              <div />
              <div className="col-span-2"><Field label="기본 주소" value={form.addr1} onChange={(v) => setForm({...form, addr1: v})} required /></div>
              <div className="col-span-2"><Field label="상세 주소" value={form.addr2} onChange={(v) => setForm({...form, addr2: v})} /></div>
            </div>
          </Section>

          <Section title="배송 방법">
            <div className="space-y-2.5">
              {shippingOpts.map((opt) => (
                <ShipOpt
                  key={opt.id}
                  opt={opt}
                  active={form.shipping === opt.id}
                  disabled={requireBrinks && opt.id !== 'brinks' && opt.id !== 'pickup'}
                  onChange={() => setForm({...form, shipping: opt.id})}
                />
              ))}
            </div>
          </Section>

          <Section title="옵션">
            <Check v={form.signature} onChange={(x) => setForm({...form, signature: x})} label="수령인 서명 필수 (권장)" />
            <Check v={form.insurance} onChange={(x) => setForm({...form, insurance: x})} label="추가 보험 가입 (거래금액의 0.5%)" />
          </Section>

          <Section title="요청 메모">
            <textarea value={form.memo} onChange={(e) => setForm({...form, memo: e.target.value})} rows={3}
              placeholder="배송 시 요청사항"
              className="w-full bg-bone-2 border border-line rounded-lg px-4 py-3 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
          </Section>
        </div>

        <aside>
          <div className="surface-soft p-6 elev-2 sticky top-32">
            <div className="pixel-label text-mute mb-5">Summary</div>
            <div className="space-y-1.5 text-sm pb-4 border-b border-line">
              {items.map((c) => (
                <div key={c.id} className="flex justify-between gap-2">
                  <span className="text-ink truncate font-bold">{c.nameKo}</span>
                  <span className="font-mono text-mute text-xs tabular-nums">{formatKRWFull(c.price || c.currentBid)}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 space-y-1.5 text-sm">
              <Row label="상품" value={formatKRWFull(total())} />
              <Row label={shipOpt?.label || '배송'} value={shipping > 0 ? formatKRWFull(shipping) : '무료'} highlight={shipOpt?.premium} />
              {insurance > 0 && <Row label="보험" value={formatKRWFull(insurance)} />}
            </div>
            <div className="my-4 border-t border-line" />
            <div className="flex justify-between items-baseline mb-6">
              <span className="text-mute font-bold text-sm">총 결제</span>
              <span className="font-display text-3xl font-bold text-ink tabular-nums">{formatKRWFull(grand)}</span>
            </div>
            <Button variant="accent" size="lg" className="w-full" type="submit">
              결제하기 <Icon name="arrow" size={14} strokeWidth={2.2} />
            </Button>
          </div>
        </aside>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="surface-soft p-6">
      <h3 className="font-display text-xl font-bold text-ink mb-5">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
function Field({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
    </label>
  )
}
function ShipOpt({ opt, active, disabled, onChange }) {
  return (
    <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${
      disabled ? 'opacity-40 cursor-not-allowed' : ''
    } ${
      active ? (opt.premium ? 'border-dex bg-dex/5 elev-2' : 'border-ink bg-ink/[0.03] elev-1') : 'border-line hover:border-ink/30'
    }`}>
      <div className="flex items-center gap-3">
        <input type="radio" checked={active} onChange={onChange} disabled={disabled} className="accent-ink" />
        <span className={`led led-${opt.led}`} style={{ width: 8, height: 8 }} />
        <Icon name={opt.icon} size={16} strokeWidth={1.8} className={opt.premium ? 'text-dex' : 'text-ink/60'} />
        <div className="flex-1">
          <div className={`font-bold ${opt.premium ? 'text-dex' : 'text-ink'} inline-flex items-center gap-2`}>
            {opt.label}
            {opt.premium && <span className="pixel-label bg-dex text-paper px-1.5 py-0.5 rounded-full text-[8px]">SECURE</span>}
            {opt.forPacks && <span className="pixel-label bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-full text-[8px]">QUICK</span>}
          </div>
          <div className="text-xs text-mute mt-0.5">{opt.desc}</div>
        </div>
        <div className={`font-mono text-sm font-bold ${opt.premium ? 'text-dex' : 'text-ink'}`}>
          {opt.price > 0 ? `₩${opt.price.toLocaleString()}` : '무료'}
        </div>
      </div>
    </label>
  )
}
function Check({ v, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm text-ink font-bold">
      <input type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)} className="accent-ink w-4 h-4" />
      {label}
    </label>
  )
}
function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-mute truncate">{label}</span>
      <span className={`font-mono font-bold tabular-nums ${highlight ? 'text-dex' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
