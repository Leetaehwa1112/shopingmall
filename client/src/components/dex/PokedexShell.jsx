/**
 * PokedexShell — 지우가 들고다니던 빨간 도감 디바이스의 본체 셸.
 *
 * NOTE: 본 컴포넌트는 자체 LCD 영역을 가지며,
 *   추가로 `catalogue` slot을 받아 그 아래 cream 카탈로그 패널을 렌더.
 *   `children`은 LCD(어두운 그린) 안에, `catalogue`는 LCD 아래 빨간 본체 안의
 *   밝은 인서트 패널에 렌더 — 카드 가독성 확보.
 *
 * 구조:
 *  ┌──────────────────────────────┐  ← 상단 패널 (빨간 본체)
 *  │ ◯ LED  • • •         POKÉDEX │     · 큰 파란 LED + 3개의 작은 LED + 라벨
 *  │ ┌──────────────────────────┐ │
 *  │ │     LCD 그린 스크린       │ │  ← 안쪽 LCD 패널 (자식 children 렌더)
 *  │ └──────────────────────────┘ │
 *  └──────────────────────────────┘
 *
 * 디자인 토큰: --pdx-* (index.css @theme)
 *  - 컬러: 진한 빨강 그라데이션 + 검정 베젤 + 어두운 LCD 그린
 *  - 그림자: 다층 box-shadow로 광택+깊이
 *  - 반응형: 데스크톱은 padding 넉넉, 모바일은 축소
 *
 * children: LCD 스크린 안에 들어가는 콘텐츠 (이미 LCDPanel로 래핑됨)
 */
import React from 'react'

export default function PokedexShell({ title = 'POKÉDEX', subtitle, children, catalogue }) {
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-6 pb-12">
      <div
        className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden"
        style={{
          background: `linear-gradient(180deg, var(--pdx-shell-hl) 0%, var(--pdx-shell) 18%, var(--pdx-shell) 70%, var(--pdx-shell-d) 100%)`,
          boxShadow: [
            'inset 0 2px 0 rgba(255,255,255,0.4)',       // 상단 광택
            'inset 0 -3px 0 rgba(0,0,0,0.25)',           // 하단 그늘
            'inset 0 0 0 2px var(--pdx-rim)',            // 내부 짙은 빨강 라인
            '0 10px 30px rgba(124,7,13,0.35)',           // 책상에 놓인 그림자
            '0 2px 0 #1a1a1a',                            // 검정 베이스
          ].join(', '),
        }}
      >
        {/* 본체 윗 가장자리 미세한 광택 줄 */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-[28px] sm:rounded-t-[36px] pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 50%, transparent)' }}
        />

        {/* 본체 우측 측면 음각 굴곡 — 입체감 */}
        <span
          aria-hidden="true"
          className="absolute right-0 top-1/4 bottom-1/4 w-[2px] pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.15), transparent)' }}
        />

        {/* 코너 4개 리벳/스크류 (디바이스 디테일) */}
        {[
          'top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3',
        ].map((pos, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`absolute ${pos} w-2.5 h-2.5 rounded-full pointer-events-none`}
            style={{
              background: 'radial-gradient(circle at 35% 30%, #4a4a4a, #1a1a1a 65%, #000)',
              boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.5)',
            }}
          />
        ))}

        {/* === 상단 컨트롤 패널 === */}
        <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 flex items-center gap-4">
          {/* 큰 파란 LED */}
          <div className="relative shrink-0">
            <div
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
              style={{
                background: `radial-gradient(circle at 32% 28%, var(--pdx-led-blue-hl) 0%, var(--pdx-led-blue) 40%, #0f7aa3 100%)`,
                boxShadow: [
                  'inset 0 2px 4px rgba(255,255,255,0.7)',
                  'inset 0 -4px 8px rgba(0,0,0,0.4)',
                  'inset 0 0 0 3px #0a1a1f',
                  '0 0 18px rgba(98,202,240,0.6)',         // 푸른 글로우 — '켜진' 느낌
                  '0 3px 6px rgba(0,0,0,0.4)',
                ].join(', '),
              }}
              aria-hidden="true"
            />
            {/* LED 하이라이트 */}
            <span
              aria-hidden="true"
              className="absolute pointer-events-none rounded-full"
              style={{
                top: '15%',
                left: '20%',
                width: '40%',
                height: '30%',
                background: 'radial-gradient(ellipse, rgba(255,255,255,0.85), transparent 65%)',
                filter: 'blur(0.5px)',
              }}
            />
          </div>

          {/* 작은 LED 3개 (red, yellow, green — 도감 클래식) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {['#dc2626', '#facc15', '#16a34a'].map((c, i) => (
              <div
                key={i}
                className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${shadeUp(c)} 0%, ${c} 60%, ${shadeDown(c)} 100%)`,
                  boxShadow: [
                    'inset 0 0.5px 0 rgba(255,255,255,0.7)',
                    'inset 0 -1px 1.5px rgba(0,0,0,0.4)',
                    `0 0 6px ${c}80`,
                  ].join(', '),
                }}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* 라벨 */}
          <div className="ml-auto text-right select-none">
            <div
              className="font-display text-lg sm:text-2xl leading-none tracking-wide"
              style={{
                color: '#fff',
                textShadow: '0 2px 0 rgba(0,0,0,0.45), 0 0 8px rgba(255,255,255,0.25)',
                letterSpacing: '0.06em',
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                className="font-mono text-[9px] sm:text-[10px] mt-1 font-bold tracking-[0.18em] uppercase"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
                {subtitle}
              </div>
            )}
            <div
              className="font-mono text-[8px] sm:text-[9px] mt-0.5 tracking-[0.22em] font-bold uppercase"
              style={{ color: 'rgba(0,0,0,0.45)' }}
            >
              MFG · SILPH CO · KANTO
            </div>
          </div>
        </div>

        {/* 본체 중앙 음각 라인 — '경첩' 같은 디바이스 디테일 (시각만) */}
        <div className="px-5 sm:px-8 -mt-1 mb-1" aria-hidden="true">
          <div className="h-[2px] rounded-full"
               style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 15%, rgba(0,0,0,0.35) 85%, transparent 100%)' }} />
          <div className="h-px rounded-full mt-px"
               style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 15%, rgba(255,255,255,0.2) 85%, transparent 100%)' }} />
        </div>

        {/* === LCD 스크린 (검정 베젤 + 어두운 그린 안쪽) === */}
        <div
          className="mx-3 sm:mx-6 mb-5 sm:mb-7 rounded-2xl sm:rounded-3xl p-2 sm:p-3"
          style={{
            background: 'linear-gradient(180deg, #1c1c1c 0%, #0a0a0a 100%)',
            boxShadow: [
              'inset 0 2px 3px rgba(0,0,0,0.7)',
              'inset 0 -1px 0 rgba(255,255,255,0.05)',
              '0 1px 0 rgba(255,255,255,0.15)',         // 베젤 상단 미세 광택
            ].join(', '),
          }}
        >
          <div
            className="relative overflow-hidden rounded-xl sm:rounded-2xl"
            style={{
              background: `
                radial-gradient(ellipse at top, rgba(255,255,255,0.04), transparent 60%),
                linear-gradient(180deg, #0e2410 0%, #07170a 100%)
              `,
              boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(98,202,240,0.08)',
            }}
          >
            {/* 스캔라인 오버레이 — CRT 잔향 */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)',
              }}
            />
            {/* 모서리 비네트 */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.6)' }}
            />

            <div className="relative px-3 py-3 sm:px-4 sm:py-4">{children}</div>
          </div>
        </div>

        {/* === 카탈로그 인서트 패널 (빨간 본체 안의 cream 패널) === */}
        {catalogue && (
          <div className="mx-3 sm:mx-6 mb-5 sm:mb-7">
            <div
              className="rounded-2xl sm:rounded-3xl p-4 sm:p-6"
              style={{
                background: 'linear-gradient(180deg, #fffaf2 0%, #f5efe0 100%)',
                boxShadow: [
                  'inset 0 2px 4px rgba(0,0,0,0.15)',
                  'inset 0 -1px 0 rgba(255,255,255,0.8)',
                  '0 1px 0 rgba(255,255,255,0.3)',
                ].join(', '),
              }}
            >
              {catalogue}
            </div>
          </div>
        )}

        {/* === 하단 컨트롤 패드 영역 === */}
        <div className="px-5 sm:px-8 pb-5 sm:pb-6 flex items-end justify-between gap-4">
          {/* 좌측: 진짜 D-pad 모양 (4방향) */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0" aria-hidden="true">
            {/* + 모양 검정 베이스 */}
            <div
              className="absolute inset-0 rounded-md"
              style={{
                background: 'radial-gradient(circle at 30% 25%, #3a3a3a 0%, #1a1a1a 60%, #050505 100%)',
                clipPath: 'polygon(33% 0, 67% 0, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0 67%, 0 33%, 33% 33%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 0 #000',
              }}
            />
            {/* 방향 화살표 (작은 삼각형) */}
            <span className="absolute top-[6%] left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '5px solid rgba(255,255,255,0.55)' }} />
            <span className="absolute bottom-[6%] left-1/2 -translate-x-1/2" style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '5px solid rgba(255,255,255,0.55)' }} />
            <span className="absolute left-[6%] top-1/2 -translate-y-1/2" style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderRight: '5px solid rgba(255,255,255,0.55)' }} />
            <span className="absolute right-[6%] top-1/2 -translate-y-1/2" style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '5px solid rgba(255,255,255,0.55)' }} />
            {/* 중앙 분할 점 */}
            <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.7)' }} />
          </div>

          {/* 가운데: 시리얼 + 인디케이터 (디바이스 디테일) */}
          <div className="flex flex-col items-center gap-1.5 select-none">
            <div className="flex gap-1.5">
              <span className="font-mono text-[8px] sm:text-[9px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: 'rgba(255,255,255,0.65)' }}>
                PWR
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#16a34a', boxShadow: '0 0 4px #16a34a' }}
                aria-hidden="true"
              />
              <span className="font-mono text-[8px] sm:text-[9px] font-bold tracking-[0.18em] uppercase"
                    style={{ color: 'rgba(255,255,255,0.65)' }}>
                BAT
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#facc15', boxShadow: '0 0 4px #facc15' }}
                aria-hidden="true"
              />
            </div>
            <div className="font-mono text-[8px] sm:text-[9px] tracking-[0.22em] font-bold uppercase"
                 style={{ color: 'rgba(0,0,0,0.55)', textShadow: '0 1px 0 rgba(255,255,255,0.15)' }}>
              SN · {Math.floor(Math.random() * 9000 + 1000)} · KANTO
            </div>
          </div>

          {/* 우측: A/B 둥근 액션 버튼 + 스피커 그릴 */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {['A', 'B'].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-display text-[11px] font-bold"
                    style={{
                      background: 'radial-gradient(circle at 32% 28%, #5a5a5a, #1a1a1a 65%, #000)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 3px rgba(0,0,0,0.6), 0 2px 0 #000',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                    aria-hidden="true"
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-[3px]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="block w-12 sm:w-16 h-[3px] rounded-full"
                  style={{ background: 'rgba(0,0,0,0.4)', boxShadow: 'inset 0 0.5px 0 rgba(0,0,0,0.6)' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 작은 LED용 단순 shade — full helper는 TypeSymbol에 있지만 자체 캡슐화
function shadeUp(hex) {
  const c = hex.replace('#', '')
  const num = parseInt(c, 16)
  let r = Math.min(255, (num >> 16) + 60)
  let g = Math.min(255, ((num >> 8) & 0xff) + 60)
  let b = Math.min(255, (num & 0xff) + 60)
  return `rgb(${r},${g},${b})`
}
function shadeDown(hex) {
  const c = hex.replace('#', '')
  const num = parseInt(c, 16)
  let r = Math.max(0, (num >> 16) - 60)
  let g = Math.max(0, ((num >> 8) & 0xff) - 60)
  let b = Math.max(0, (num & 0xff) - 60)
  return `rgb(${r},${g},${b})`
}
