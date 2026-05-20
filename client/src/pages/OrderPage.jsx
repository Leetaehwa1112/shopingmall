import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import useToastStore from '@/store/toastStore'
import { formatKRWFull, getShippingOptionsForPrice, getShippingTier, SHIPPING_TIER } from '@/api/cards'
import api from '@/api/axios'
import Icon from '@/components/common/Icon'
import Eyebrow from '@/components/common/Eyebrow'

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
  const toast = useToastStore((s) => s.push)
  const navigate = useNavigate()

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

  useEffect(() => {
    if (requireBrinks && form.shipping !== 'brinks') {
      setForm((f) => ({ ...f, shipping: 'brinks' }))
    }
  }, [requireBrinks, form.shipping])

  if (items.length === 0) {
    return (
      <div className="p-20 text-center">
        <div className="text-mute font-bold mb-6">주문할 상품이 없어요.</div>
        <button onClick={() => navigate('/products')}
          className="btn-pop px-6 py-3 rounded-xl inline-flex items-center gap-2 font-bold">
          카탈로그 둘러보기 <Icon name="arrow" size={14} strokeWidth={2.4} />
        </button>
      </div>
    )
  }

  const shipOpt = shippingOpts.find((o) => o.id === form.shipping) || shippingOpts[0]
  const shipping = shipOpt?.price || 0
  const insurance = form.insurance ? Math.floor(total() * 0.005) : 0
  const grand = total() + shipping + insurance

  const submit = async (e) => {
    e.preventDefault()
    if (!window.PortOne) {
      toast({ type: 'error', message: '결제 모듈을 불러오는 중이에요. 잠시 후 다시 시도해주세요.' })
      return
    }

    // ─── 결제 시작 전 클라이언트 검증 ───────────────────────────
    // 결제(돈 빠짐) → 주문 생성(서버 검증 실패) 순서가 되면 환불 처리 골치.
    // 서버 검증과 동일한 규칙으로 사전 검증해서 결제 자체를 막는다.
    const validationErrors = []
    if (!form.name?.trim()) validationErrors.push('수령인 이름을 입력해주세요.')
    else if (form.name.length > 50) validationErrors.push('수령인 이름은 50자 이하로 입력해주세요.')
    if (!form.phone?.trim() || !/^[0-9+\-\s()]{8,20}$/.test(form.phone.trim())) {
      validationErrors.push('연락처를 올바르게 입력해주세요. (숫자/하이픈 8-20자)')
    }
    if (form.shipping !== 'pickup') {
      if (!form.zip || !/^[0-9\-]{3,10}$/.test(String(form.zip))) {
        validationErrors.push('우편번호를 올바르게 입력해주세요. (3-10자리 숫자)')
      }
      if (!form.addr1?.trim()) validationErrors.push('기본 주소를 입력해주세요.')
    }
    if (validationErrors.length) {
      toast({ type: 'error', message: validationErrors.join(' / ') })
      return
    }

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
        // PortOne v2: VIRTUAL_ACCOUNT은 발급 만료 시점(validHours) 필수.
        // 24시간 입금 정책에 맞춰 고정. dueDate ISO도 가능하지만 단순함 우선.
        ...(payInfo.payMethod === 'VIRTUAL_ACCOUNT' && {
          virtualAccount: { accountExpiry: { validHours: 24 } },
        }),
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
        toast({ type: 'info', message: rsp.message || '결제가 취소되었어요.' })
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
      const msg = err.response?.data?.message || err?.message || '결제에 실패했어요. 잠시 후 다시 시도해주세요.'
      toast({ type: 'error', message: Array.isArray(msg) ? msg.join(', ') : msg })
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <Eyebrow tone="water" led="blue" pulse>ORDER · 거의 다 왔어요</Eyebrow>
        <h1 className="mt-4 font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
          배송 정보
          <span className="relative inline-block ml-3">
            <span className="relative z-10 text-water">어디로 보낼까요?</span>
            <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
          </span>
        </h1>
      </div>

      {requireBrinks && (
        <div className="surface-pop bg-rose-50 p-5 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-dex text-white flex items-center justify-center flex-shrink-0 border-2 border-ink shadow-[0_3px_0_#1a1a1a]">
            <Icon name="shield" size={24} strokeWidth={2.4} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-dex inline-flex items-center gap-2">
              Brink's Armored Transport 자동 적용
              <span className="text-[9px] font-bold bg-dex text-white px-2 py-0.5 rounded-full tracking-wider border border-ink">MANDATORY</span>
            </div>
            <div className="text-sm text-ink/85 mt-1.5 leading-relaxed font-medium">
              1억원 이상 거래는 <strong>Brink's Global Services</strong>의 보안 호송이 의무예요.
              무장 운송 차량 + 호송 인력 2인 + 전액 보험 + 실시간 추적.
              운송 비용 ₩1,500,000.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Section title="🚚 배송지">
            <div className="grid grid-cols-2 gap-4">
              <Field label="수령인" value={form.name} onChange={(v) => setForm({...form, name: v})} required />
              <Field label="이메일" value={form.email} onChange={(v) => setForm({...form, email: v})} required placeholder="example@email.com" type="email" />
              <Field label="연락처" value={form.phone} onChange={(v) => setForm({...form, phone: v})} required placeholder="010-0000-0000" />
              <Field label="우편번호" value={form.zip} onChange={(v) => setForm({...form, zip: v})} required />
              <div />
              <div className="col-span-2"><Field label="기본 주소" value={form.addr1} onChange={(v) => setForm({...form, addr1: v})} required /></div>
              <div className="col-span-2"><Field label="상세 주소" value={form.addr2} onChange={(v) => setForm({...form, addr2: v})} /></div>
            </div>
          </Section>

          <Section title="📦 배송 방법">
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

          <Section title="💳 결제 수단">
            <div className="space-y-2">
              {PAY_METHODS.map((m) => {
                const active = form.method === m.id
                return (
                  <label key={m.id}
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      active
                        ? 'border-ink bg-electric/20 shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                        : 'border-ink/15 hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
                    }`}>
                    <div className="flex items-center gap-4">
                      <input type="radio" checked={active} onChange={() => setForm({...form, method: m.id})} className="accent-ink w-4 h-4" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink text-sm">{m.label}</span>
                          {m.recommended && (
                            <span className="text-[10px] font-bold bg-electric text-ink border border-ink px-2 py-0.5 rounded-full tracking-wider shadow-[0_1px_0_#1a1a1a]">⭐ 추천</span>
                          )}
                        </div>
                        <div className="text-xs text-mute mt-0.5 font-medium">{m.desc}</div>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </Section>

          <Section title="✓ 옵션">
            <Check v={form.signature} onChange={(x) => setForm({...form, signature: x})} label="수령인 서명 필수 (권장)" />
            <Check v={form.insurance} onChange={(x) => setForm({...form, insurance: x})} label="추가 보험 가입 (거래금액의 0.5%)" />
          </Section>

          <Section title="📝 요청 메모">
            <textarea value={form.memo} onChange={(e) => setForm({...form, memo: e.target.value})} rows={3}
              placeholder="배송 시 요청사항을 적어주세요"
              className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-3 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors font-medium" />
          </Section>
        </div>

        <aside>
          <div className="surface-pop p-6 sticky top-32">
            <Eyebrow tone="electric" led="yellow">FINAL · 결제 요약</Eyebrow>
            <div className="space-y-3 pb-4 mt-4 border-b-2 border-ink/15">
              {items.map((c) => {
                const img = Array.isArray(c.images) ? c.images[0] : c.images
                return (
                  <div key={c.id || c._id} className="flex items-center gap-3">
                    {img ? (
                      <img src={img} alt={c.name} loading="lazy" decoding="async" className="w-12 h-16 object-contain rounded-md bg-bone-2 border border-ink/15 flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-16 rounded-md bg-bone-2 border border-ink/15 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-ink truncate">{c.nameKo || c.name}</div>
                      <div className="text-xs text-mute mt-0.5 font-mono">× {c.qty || 1}</div>
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
            <div className="my-4 border-t-2 border-ink/15" />
            <div className="flex justify-between items-baseline mb-6">
              <span className="text-ink font-bold text-sm">총 결제</span>
              <span className="font-display text-3xl font-bold text-dex tabular-nums">{formatKRWFull(grand)}</span>
            </div>
            <button type="submit" disabled={paying}
              className="btn-pop w-full py-3 rounded-xl font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {paying ? '결제 처리중...' : <>결제하기! <Icon name="arrow" size={14} strokeWidth={2.4} /></>}
            </button>
          </div>
        </aside>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="surface-pop p-6">
      <h3 className="font-display text-xl font-bold text-ink mb-5">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
function Field({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <div className="text-[11px] text-ink font-bold mb-1.5 tracking-wide">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors font-medium" />
    </label>
  )
}
function ShipOpt({ opt, active, disabled, onChange }) {
  return (
    <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
      disabled ? 'opacity-40 cursor-not-allowed' : ''
    } ${
      active
        ? (opt.premium
            ? 'border-ink bg-dex/10 shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
            : 'border-ink bg-electric/20 shadow-[0_3px_0_#1a1a1a] -translate-y-0.5')
        : 'border-ink/15 hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
    }`}>
      <div className="flex items-center gap-3">
        <input type="radio" checked={active} onChange={onChange} disabled={disabled} className="accent-ink w-4 h-4" />
        <span className={`led led-${opt.led}`} style={{ width: 8, height: 8 }} />
        <Icon name={opt.icon} size={16} strokeWidth={2} className={opt.premium ? 'text-dex' : 'text-ink'} />
        <div className="flex-1">
          <div className={`font-bold ${opt.premium ? 'text-dex' : 'text-ink'} inline-flex items-center gap-2`}>
            {opt.label}
            {opt.premium && <span className="text-[8px] font-bold bg-dex text-white px-1.5 py-0.5 rounded-full tracking-wider border border-ink">SECURE</span>}
            {opt.forPacks && <span className="text-[8px] font-bold bg-electric text-ink px-1.5 py-0.5 rounded-full tracking-wider border border-ink">QUICK</span>}
          </div>
          <div className="text-xs text-mute mt-0.5 font-medium">{opt.desc}</div>
        </div>
        <div className={`font-mono text-sm font-bold tabular-nums ${opt.premium ? 'text-dex' : 'text-ink'}`}>
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
      <span className="text-mute font-medium truncate">{label}</span>
      <span className={`font-mono font-bold tabular-nums ${highlight ? 'text-dex' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
