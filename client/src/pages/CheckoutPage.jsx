import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { formatKRWFull } from '@/api/cards'
import Button from '@/components/common/Button'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'

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

  if (!pending.items) return <div className="p-20 text-center text-mute">진행중인 주문이 없습니다.</div>

  const pay = (e) => {
    e.preventDefault()
    if (!agree) return alert('약관에 동의해주세요')
    setProcessing(true)
    setTimeout(() => {
      const orderId = 'PV-' + Date.now().toString(36).toUpperCase()
      sessionStorage.setItem('last-order', JSON.stringify({ ...pending, method, orderId }))
      sessionStorage.removeItem('pending-order')
      clear()
      navigate('/order-complete')
    }, 2400)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="pixel-label text-mute mb-3">Payment</div>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight">결제</h1>
      </div>

      <form onSubmit={pay} className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="surface-soft p-6">
            <h3 className="font-display text-xl font-bold text-ink mb-5">결제 수단</h3>
            <div className="space-y-2">
              {METHODS.map((m) => (
                <label key={m.id}
                  className={`block p-4 rounded-xl border cursor-pointer transition-all ${
                    method === m.id ? 'border-ink bg-ink/[0.03] elev-1' : 'border-line hover:border-ink/30'
                  }`}>
                  <div className="flex items-center gap-4">
                    <input type="radio" checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-ink" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink">{m.label}</span>
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
          </div>

          {method === 'card' && (
            <div className="surface-soft p-6 space-y-3">
              <Input placeholder="카드번호 (0000 0000 0000 0000)" />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="유효기간 (MM/YY)" />
                <Input placeholder="CVC" />
              </div>
            </div>
          )}

          <div className="surface-soft p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-ink mt-1 w-4 h-4" />
              <div className="text-sm text-ink/80 leading-relaxed">
                <span className="font-bold text-ink">결제 정보 제공</span>, <span className="font-bold text-ink">개인정보 처리방침</span>,
                <span className="font-bold text-ink"> 경매 참여 규정</span>에 동의합니다.
                모든 카드는 정품 보증되며, 14일 내 가품 판정 시 100% 환불됩니다.
              </div>
            </label>
          </div>
        </div>

        <aside>
          <div className="surface-soft p-6 elev-2 sticky top-32">
            <div className="pixel-label text-mute mb-5">Final Amount</div>
            <div className="space-y-1.5 text-sm pb-4 border-b border-line">
              {pending.items?.map((c) => (
                <div key={c.id} className="flex justify-between gap-2">
                  <span className="text-ink truncate font-bold">{c.nameKo || c.name}</span>
                  <span className="font-mono text-mute text-xs tabular-nums">{formatKRWFull(c.price || c.currentBid)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-baseline mt-5 mb-6">
              <span className="text-mute font-bold text-sm">총 결제</span>
              <span className="font-display text-3xl font-bold text-ink tabular-nums">{formatKRWFull(pending.total)}</span>
            </div>
            <Button variant="accent" size="lg" className="w-full" type="submit" disabled={processing}>
              {processing ? '결제 처리중...' : `${formatKRWFull(pending.total)} 결제`}
            </Button>
            <div className="text-[10px] text-mute mt-4 text-center inline-flex items-center gap-1.5 w-full justify-center">
              <Icon name="lock" size={11} strokeWidth={2} className="text-gold" />
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
    className="w-full bg-bone-2 border border-line rounded-lg px-4 py-3 text-sm text-ink focus:border-ink focus:bg-paper outline-none font-mono transition-colors" />
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
          <div className="font-display text-2xl font-bold text-paper mb-2">결제 처리중</div>
          <div className="text-sm text-paper/70">잠시만 기다려주세요</div>
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
