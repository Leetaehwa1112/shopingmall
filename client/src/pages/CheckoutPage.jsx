import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { formatKRWFull } from '@/api/cards'
import api from '@/api/axios'
import Icon from '@/components/common/Icon'
import Eyebrow from '@/components/common/Eyebrow'

const METHODS = [
  { id: 'card',   label: '신용/체크카드',  desc: '국내 모든 카드 가능' },
  { id: 'toss',   label: '토스페이',       desc: '간편 결제' },
  { id: 'kakao',  label: '카카오페이',     desc: '카카오톡 인증' },
  { id: 'bank',   label: '가상계좌',       desc: '24시간 내 입금' },
  { id: 'escrow', label: '에스크로 결제',  desc: '안전 거래 (권장)', recommended: true },
]

export default function CheckoutPage() {
  const navigate = useNavigate()
  const clear = useCartStore((s) => s.clear)
  const pending = JSON.parse(sessionStorage.getItem('pending-order') || '{}')
  const [method, setMethod] = useState(pending.total >= 1000000 ? 'escrow' : 'card')
  const [agree, setAgree] = useState(false)
  const [processing, setProcessing] = useState(false)

  if (!pending.items) return <div className="p-20 text-center text-mute font-bold">진행중인 주문이 없어요.</div>

  const pay = async (e) => {
    e.preventDefault()
    if (!agree) return alert('약관에 동의해주세요')
    setProcessing(true)
    try {
      const { form } = pending
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
        paymentMethod:    method,
      })
      sessionStorage.setItem('last-order', JSON.stringify({
        ...pending,
        method,
        orderId:   data.data.orderNumber,
        serverOrder: data.data,
      }))
      sessionStorage.removeItem('pending-order')
      clear()
      navigate('/order-complete')
    } catch (err) {
      setProcessing(false)
      alert(err.response?.data?.message || '결제 처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <Eyebrow tone="grass" led="green" pulse>PAYMENT · 마지막 한 걸음</Eyebrow>
        <h1 className="mt-4 font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
          결제하기
          <span className="relative inline-block ml-3">
            <span className="relative z-10 text-grass">곧 도착!</span>
            <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
          </span>
        </h1>
      </div>

      <form onSubmit={pay} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="surface-pop p-6">
            <h3 className="font-display text-xl font-bold text-ink mb-5">💳 결제 수단</h3>
            <div className="space-y-2">
              {METHODS.map((m) => {
                const active = method === m.id
                return (
                  <label key={m.id}
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      active
                        ? 'border-ink bg-electric/20 shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                        : 'border-ink/15 hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
                    }`}>
                    <div className="flex items-center gap-4">
                      <input type="radio" checked={active} onChange={() => setMethod(m.id)} className="accent-ink w-4 h-4" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-ink">{m.label}</span>
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
          </div>

          {method === 'card' && (
            <div className="surface-pop p-6 space-y-3">
              <Input placeholder="카드번호 (0000 0000 0000 0000)" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="유효기간 (MM/YY)" />
                <Input placeholder="CVC" />
              </div>
            </div>
          )}

          <div className="surface-pop p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-ink mt-1 w-4 h-4" />
              <div className="text-sm text-ink/80 leading-relaxed">
                <span className="font-bold text-ink">결제 정보 제공</span>, <span className="font-bold text-ink">개인정보 처리방침</span>,
                <span className="font-bold text-ink"> 경매 참여 규정</span>에 동의합니다.
                모든 카드는 정품 보증되며, 14일 내 가품 판정 시 100% 환불해드려요.
              </div>
            </label>
          </div>
        </div>

        <aside>
          <div className="surface-pop p-6 sticky top-32">
            <Eyebrow tone="electric" led="yellow">FINAL · 결제 요약</Eyebrow>
            <div className="space-y-1.5 text-sm pb-4 mt-4 border-b-2 border-ink/15">
              {pending.items?.map((c) => (
                <div key={c.id} className="flex justify-between gap-2">
                  <span className="text-ink truncate font-bold">{c.nameKo || c.name}</span>
                  <span className="font-mono text-mute text-xs tabular-nums">{formatKRWFull(c.price || c.currentBid)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-baseline mt-5 mb-6">
              <span className="text-ink font-bold text-sm">총 결제</span>
              <span className="font-display text-3xl font-bold text-dex tabular-nums">{formatKRWFull(pending.total)}</span>
            </div>
            <button type="submit" disabled={processing}
              className="btn-pop w-full py-3 rounded-xl font-bold disabled:opacity-60 disabled:cursor-not-allowed">
              {processing ? '결제 처리중...' : `${formatKRWFull(pending.total)} 결제!`}
            </button>
            <div className="text-[10px] text-ink/70 mt-4 text-center inline-flex items-center gap-1.5 w-full justify-center font-bold">
              <Icon name="lock" size={11} strokeWidth={2.2} className="text-grass" />
              SSL 암호화 · 안전 결제
            </div>
          </div>
        </aside>
      </form>

      {processing && <Processing />}
    </div>
  )
}

function Input(props) {
  return <input {...props}
    className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-3 text-sm text-ink focus:border-ink focus:bg-paper outline-none font-mono transition-colors" />
}

function Processing() {
  const [step, setStep] = useState(0)
  const STEPS = ['결제 정보 검증', '카드사 승인 요청', '에스크로 잠금', '주문 확정']
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 500)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="fixed inset-0 bg-bone/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="dex-casing p-10 max-w-md w-full mx-6">
        <div className="flex justify-center gap-2 mb-6">
          <span className="led led-blue led-pulse" />
          <span className="led led-yellow led-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="led led-red led-pulse" style={{ animationDelay: '0.4s' }} />
          <span className="led led-green led-pulse" style={{ animationDelay: '0.6s' }} />
        </div>
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-bold text-white mb-2">결제 처리중</div>
          <div className="text-sm text-white/70">조금만 기다려주세요</div>
        </div>
        <div className="lcd-dark p-4 text-left space-y-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 font-mono text-sm">
              <span className={i < step ? 'text-led-g' : i === step ? 'text-led-y blink' : 'text-led-g/30'}>
                {i < step ? '✓' : i === step ? '▸' : '·'}
              </span>
              <span className={i <= step ? 'text-led-g' : 'text-led-g/30'}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
