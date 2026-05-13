import Icon from './Icon'
import { getShippingTier, SHIPPING_TIER } from '@/api/cards'

// 가격 기반 배송 안내 배너
export default function ShippingBanner({ price, isPack = false }) {
  if (isPack) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-amber-500 text-paper flex items-center justify-center flex-shrink-0">
          <Icon name="bolt" size={18} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-amber-900 text-sm inline-flex items-center gap-2">
            ⚡ 퀵 배송 가능
            <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">PACK</span>
          </div>
          <div className="text-xs text-amber-800 mt-0.5">서울·경기 당일 2-4시간 도착 (+₩50,000)</div>
        </div>
      </div>
    )
  }

  const tier = getShippingTier(price)

  if (tier === SHIPPING_TIER.BRINKS_REQUIRED) {
    return (
      <div className="bg-gradient-to-br from-rose-50 to-red-50 border-2 border-dex/40 rounded-xl p-4 flex items-start gap-3 elev-1">
        <div className="w-10 h-10 rounded-full bg-dex text-paper flex items-center justify-center flex-shrink-0">
          <Icon name="shield" size={20} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-dex text-sm inline-flex items-center gap-2">
            Brink's Armored Transport
            <span className="pixel-label bg-dex text-paper px-2 py-0.5 rounded-full text-[9px]">MANDATORY</span>
          </div>
          <div className="text-xs text-ink/80 mt-1 leading-relaxed">
            1억원 이상 거래는 <strong>Brink's Global Services</strong> 보안 호송이 의무 적용됩니다.
            무장 운송 차량 + 호송 인력 2인 + 전액 보험 + 실시간 추적.
          </div>
        </div>
      </div>
    )
  }

  if (tier === SHIPPING_TIER.BRINKS_RECOMMENDED) {
    return (
      <div className="bg-gold/8 border border-gold/40 rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gold text-ink flex items-center justify-center flex-shrink-0">
          <Icon name="shield" size={18} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-amber-900 text-sm">Brink's 전문 운송 권장</div>
          <div className="text-xs text-ink/75 mt-0.5 leading-relaxed">
            3천만원 이상 — <strong>Brink's Armored</strong> 보안 운송 권장 (선택). FedEx Insured도 가능합니다.
          </div>
        </div>
      </div>
    )
  }

  if (tier === SHIPPING_TIER.INSURED) {
    return (
      <div className="bg-blue-50 border border-blue/30 rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-blue text-paper flex items-center justify-center flex-shrink-0">
          <Icon name="package" size={18} strokeWidth={2} />
        </div>
        <div className="flex-1">
          <div className="font-bold text-blue text-sm">FedEx Priority Insured</div>
          <div className="text-xs text-ink/75 mt-0.5 leading-relaxed">
            500만원 이상 — FedEx 보험 운송 권장. Brink's Armored도 선택 가능.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-full bg-emerald-500 text-paper flex items-center justify-center flex-shrink-0">
        <Icon name="package" size={18} strokeWidth={2} />
      </div>
      <div className="flex-1">
        <div className="font-bold text-emerald-800 text-sm">일반 배송 가능</div>
        <div className="text-xs text-ink/75 mt-0.5 leading-relaxed">
          500만원 미만 — 일반 배송 또는 FedEx 선택 가능. 보험은 선택사항.
        </div>
      </div>
    </div>
  )
}
