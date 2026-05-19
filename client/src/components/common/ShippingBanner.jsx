import Icon from './Icon'
import { getShippingTier, SHIPPING_TIER } from '@/api/cards'

export default function ShippingBanner({ price, isPack = false }) {
  if (isPack) {
    return (
      <BannerShell tone="electric" iconBg="bg-electric" iconColor="text-ink" icon="bolt">
        <div className="font-bold text-ink text-sm inline-flex items-center gap-2">
          ⚡ 퀵 배송 가능!
          <span className="text-[10px] font-bold bg-electric text-ink border border-ink px-2 py-0.5 rounded-full tracking-wider">PACK</span>
        </div>
        <div className="text-xs text-ink/80 mt-0.5 font-medium">서울·경기 당일 2-4시간 도착 (+₩50,000)</div>
      </BannerShell>
    )
  }

  const tier = getShippingTier(price)

  if (tier === SHIPPING_TIER.BRINKS_REQUIRED) {
    return (
      <BannerShell tone="rose-50" iconBg="bg-dex" iconColor="text-paper" icon="shield">
        <div className="font-bold text-dex text-sm inline-flex items-center gap-2">
          Brink's Armored Transport
          <span className="text-[10px] font-bold bg-dex text-paper border border-ink px-2 py-0.5 rounded-full tracking-wider">MANDATORY</span>
        </div>
        <div className="text-xs text-ink/80 mt-1 leading-relaxed font-medium">
          1억원 이상 거래는 <strong>Brink's Global Services</strong> 보안 호송이 의무예요.
          무장 운송 차량 + 호송 인력 2인 + 전액 보험 + 실시간 추적.
        </div>
      </BannerShell>
    )
  }

  if (tier === SHIPPING_TIER.BRINKS_RECOMMENDED) {
    return (
      <BannerShell tone="electric/15" iconBg="bg-electric" iconColor="text-ink" icon="shield">
        <div className="font-bold text-ink text-sm">Brink's 전문 운송 권장</div>
        <div className="text-xs text-ink/75 mt-0.5 leading-relaxed font-medium">
          3천만원 이상 — <strong>Brink's Armored</strong> 보안 운송 권장 (선택). FedEx Insured도 가능해요.
        </div>
      </BannerShell>
    )
  }

  if (tier === SHIPPING_TIER.INSURED) {
    return (
      <BannerShell tone="water/15" iconBg="bg-water" iconColor="text-paper" icon="package">
        <div className="font-bold text-water text-sm">FedEx Priority Insured</div>
        <div className="text-xs text-ink/75 mt-0.5 leading-relaxed font-medium">
          500만원 이상 — FedEx 보험 운송 권장. Brink's Armored도 선택 가능해요.
        </div>
      </BannerShell>
    )
  }

  return (
    <BannerShell tone="grass/15" iconBg="bg-grass" iconColor="text-paper" icon="package">
      <div className="font-bold text-grass text-sm">일반 배송 가능</div>
      <div className="text-xs text-ink/75 mt-0.5 leading-relaxed font-medium">
        500만원 미만 — 일반 배송 또는 FedEx 선택 가능. 보험은 선택사항이에요.
      </div>
    </BannerShell>
  )
}

function BannerShell({ tone, iconBg, iconColor, icon, children }) {
  return (
    <div className={`bg-${tone} border-2 border-ink rounded-xl p-4 flex items-start gap-3 shadow-[0_3px_0_#1a1a1a]`}>
      <div className={`w-10 h-10 rounded-full ${iconBg} ${iconColor} border-2 border-ink flex items-center justify-center flex-shrink-0 shadow-[0_2px_0_#1a1a1a]`}>
        <Icon name={icon} size={18} strokeWidth={2.4} />
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
