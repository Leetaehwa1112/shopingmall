import { Link } from 'react-router-dom'
import Pokeball from '@/components/common/Pokeball'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import Icon from '@/components/common/Icon'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 bg-confetti relative sparkle-host">
      <Sparkles always />
      <div className="mb-6 float-bob opacity-90"><Pokeball size={88} /></div>
      <div className="font-display text-[120px] leading-none font-bold text-ink/15 tracking-tighter">404</div>
      <Eyebrow tone="fire" led="red" pulse>LOST · 길을 잃었어요</Eyebrow>
      <h1 className="font-display text-3xl font-bold text-ink mt-3">
        앗,
        <span className="relative inline-block ml-2">
          <span className="relative z-10 text-fire">이 카드는 어디로 갔을까요?</span>
          <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
        </span>
      </h1>
      <p className="text-sm text-mute mt-3 mb-6 font-medium max-w-md">
        요청하신 페이지가 사라졌거나, 아직 도착하지 않은 카드일지도 몰라요.
      </p>
      <Link to="/" className="btn-pop px-6 py-3 rounded-xl inline-flex items-center gap-2 font-bold">
        홈으로 돌아가기 <Icon name="arrow" size={14} strokeWidth={2.4} />
      </Link>
    </div>
  )
}
