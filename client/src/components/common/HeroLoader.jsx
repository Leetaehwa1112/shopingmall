import Pokeball from './Pokeball'

/**
 * HeroLoader — hero panel 로딩 중 표시되는 재미있는 로더.
 * - 포켓볼이 손에서 떨어진 듯 통통 튀고 가볍게 흔들림
 * - 그림자가 튀는 리듬에 맞춰 늘었다 줄음 → 부피감
 * - 아래에 LED dot 3개가 wave 형태로 깜빡임 (포켓도감 전원 표시 느낌)
 * - 카피: "두근두근, 카드 꺼내는 중..."
 *
 * 의존성 없음 (순수 CSS keyframes). PokeCard lg(300x420)와 비슷한 layout 점유로
 * layout shift 최소화.
 */
export default function HeroLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative w-full max-w-[320px] mx-auto py-8 lg:py-12 flex flex-col items-center justify-center select-none"
      style={{ minHeight: 360 }}
    >
      {/* 통통 튀는 포켓볼 + 동적 그림자 */}
      <div className="relative flex flex-col items-center" style={{ height: 200 }}>
        <div className="hero-loader-ball">
          <Pokeball size={96} />
        </div>
        <div className="hero-loader-shadow" aria-hidden="true" />
      </div>

      {/* LED wave dots */}
      <div className="mt-6 flex items-center gap-2" aria-hidden="true">
        <span className="hero-loader-dot hero-loader-dot-1" />
        <span className="hero-loader-dot hero-loader-dot-2" />
        <span className="hero-loader-dot hero-loader-dot-3" />
      </div>

      {/* 카피 */}
      <div className="mt-4 text-center">
        <div className="pixel-label text-dex tracking-[0.18em]">LOADING</div>
        <div className="mt-1.5 font-display text-lg font-bold text-ink">
          두근두근, 카드 꺼내는 중<span className="hero-loader-ellipsis" aria-hidden="true" />
        </div>
      </div>

      <span className="sr-only">콘텐츠를 불러오고 있어요</span>
    </div>
  )
}
