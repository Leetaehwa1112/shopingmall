import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { formatKRWFull, getShippingOptionsForPrice, getShippingTier, SHIPPING_TIER } from '@/api/cards'
import api from '@/api/axios'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'

const STORE_ID = 'store-43aecd40-673f-4953-8fd3-6aa4882eff27'

const PAY_METHODS = [
  { id: 'card',   payMethod: 'CARD',           label: '신용/체크카드', desc: '국내 모든 카드 가능' },
  { id: 'toss',   payMethod: 'EASY_PAY',        label: '토스페이',      desc: '간편 결제',      easyPayProvider: 'TOSSPAY' },
  { id: 'kakao',  payMethod: 'EASY_PAY',        label: '카카오페이',    desc: '카카오톡 인증',  easyPayProvider: 'KAKAOPAY' },
  { id: 'bank',   payMethod: 'VIRTUAL_ACCOUNT', label: '가상계좌',      desc: '24시간 내 입금' },
  { id: 'escrow', payMethod: 'CARD',            label: '에스크로 결제', desc: '안전 거래 (권장)', recommended: true, escrow: true },
]

export default function OrderPage() {
  const { items, total, clear } = useCartStore()
  const navigate = useNavigate()

  // 카트 상품 중 가장 비싼 가격으로 배송 등급 결정
  const maxPrice = useMemo(() => Math.max(0, ...items.map((c) => c.price || c.currentBid || 0)), [items])
  const isAllPacks = items.length > 0 && items.every((i) => i.type === 'pack' || i.type === 'box')
  const tier = getShippingTier(maxPrice)
  const requireBrinks = tier === SHIPPING_TIER.BRINKS_REQUIRED
  const shippingOpts = useMemo(() => getShippingOptionsForPrice(maxPrice, isAllPacks), [maxPrice, isAllPacks])

  const [form, setForm] = useState({
    name: '', email: '', phone: '', zip: '', addr1: '', addr2: '',
    shipping: shippingOpts[0]?.id || 'standard',
    signature: true, insurance: true, memo: '',
    method: 'card',
  })
  const [paying, setPaying] = useState(false)

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

  const submit = async (e) => {
    e.preventDefault()
    if (!window.PortOne) return alert('결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.')

    const payInfo = PAY_METHODS.find((m) => m.id === form.method) || PAY_METHODS[0]
    const paymentId = 'PV-' + Date.now().toString(36).toUpperCase()
    const orderName = items.length === 1
      ? (items[0].nameKo || items[0].name)
      : `${items[0].nameKo || items[0].name} 외 ${items.length - 1}건`

    setPaying(true)
    try {
      const rsp = await window.PortOne.requestPayment({
        storeId:    STORE_ID,
        paymentId,
        orderName,
        totalAmount: grand,
        currency:   'KRW',
        payMethod:  payInfo.payMethod,
        channelKey: 'channel-key-05b70ec0-8306-4378-aaad-33ada270685a',
        ...(payInfo.easyPayProvider && { easyPay: { easyPayProvider: payInfo.easyPayProvider } }),
        ...(payInfo.escrow && { escrow: true }),
        customer: {
          fullName:    form.name,
          phoneNumber: form.phone,
          email:       form.email || 'guest@pokevault.kr',
          address: {
            addressLine1: form.addr1,
            addressLine2: form.addr2 || '',
            zipcode:      form.zip,
          },
        },
      })

      if (rsp?.code) {
        setPaying(false)
        alert(rsp.message || '결제가 취소되었습니다.')
        return
      }

      const { data } = await api.post('/orders', {
        shippingMethod:   form.shipping,
        recipient:        form.name,
        phone:            form.phone,
        address: {
          zipcode: form.zip,
          street:  form.addr1,
          detail:  form.addr2 || '',
          city:    '',
        },
        requireSignature: form.signature,
        insuranceEnabled: form.insurance,
        memo:             form.memo || '',
        paymentMethod:    form.method,
        paymentId:        rsp.paymentId,
        clientItems:      items,
      })

      sessionStorage.setItem('last-order', JSON.stringify({
        items, form,
        total:       grand,
        shipOpt,
        method:      form.method,
        orderId:     data.data.orderNumber,
        serverOrder: data.data,
      }))
      clear()
      navigate('/order-complete')
    } catch (err) {
      setPaying(false)
      console.error('결제 오류:', err)
      alert(err.response?.data?.message || err?.message || JSON.stringify(err))
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6 sm:mb-10">
        <div className="pixel-label text-mute mb-3">Order</div>
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-ink tracking-tight">주문 정보</h1>
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

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Section title="배송지">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="수령인" value={form.name} onChange={(v) => setForm({...form, name: v})} required />
              <Field label="이메일" value={form.email} onChange={(v) => setForm({...form, email: v})} required placeholder="example@email.com" type="email" />
              <Field label="연락처" value={form.phone} onChange={(v) => setForm({...form, phone: v})} required placeholder="010-0000-0000" />
              <Field label="우편번호" value={form.zip} onChange={(v) => setForm({...form, zip: v})} required />
              <div className="hidden sm:block" />
              <div className="sm:col-span-2"><Field label="기본 주소" value={form.addr1} onChange={(v) => setForm({...form, addr1: v})} required /></div>
              <div className="sm:col-span-2"><Field label="상세 주소" value={form.addr2} onChange={(v) => setForm({...form, addr2: v})} /></div>
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

          <Section title="결제 수단">
            <div className="space-y-2">
              {PAY_METHODS.map((m) => (
                <label key={m.id}
                  className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                    form.method === m.id ? 'border-ink bg-ink/[0.03] elev-1' : 'border-line hover:border-ink/30'
                  }`}>
                  <div className="flex items-center gap-4">
                    <input type="radio" checked={form.method === m.id} onChange={() => setForm({...form, method: m.id})} className="accent-ink" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-sm">{m.label}</span>
                        {m.recommended && (
                          <span className="text-[10px] font-bold bg-gold text-ink px-2 py-0.5 rounded-full tracking-wider">추천</span>
                        )}
                      </div>
                      <div className="text-xs text-mute mt-0.5">{m.desc}</div>
                    </div>
                  </div>
                </label>
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
          <div className="surface-soft p-5 sm:p-6 elev-2 lg:sticky lg:top-32">
            <div className="pixel-label text-mute mb-5">Summary</div>
            <div className="space-y-3 pb-4 border-b border-line">
              {items.map((c) => {
                const img = Array.isArray(c.images) ? c.images[0] : c.images
                return (
                  <div key={c.id || c._id} className="flex items-center gap-3">
                    {img ? (
                      <img src={img} alt={c.name} className="w-12 h-16 object-contain rounded-md bg-bone-2 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-16 rounded-md bg-bone-2 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-ink truncate">{c.nameKo || c.name}</div>
                      <div className="text-xs text-mute mt-0.5">× {c.qty || 1}</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-ink tabular-nums flex-shrink-0">
                      {formatKRWFull((c.priceSnapshot || c.price || c.currentBid || 0) * (c.qty || 1))}
                    </span>
                  </div>
                )
              })}
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
            <Button variant="accent" size="lg" className="w-full" type="submit" disabled={paying}>
              {paying ? '결제 처리중...' : <>결제하기 <Icon name="arrow" size={14} strokeWidth={2.2} /></>}
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
