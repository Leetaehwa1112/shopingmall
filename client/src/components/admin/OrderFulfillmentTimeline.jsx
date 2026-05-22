/**
 * OrderFulfillmentTimeline — 9-step horizontal stepper.
 *
 * 운영 의도
 *   현재 어느 단계인지를 시각적으로 1초 안에 인식.
 *   완료/현재/대기 3개 상태 + tone color로 진행률 + 다음 단계 미리보기.
 *
 *   너비 좁을 때(우측 드로어 540px 등)는 compact 모드로 자동 전환:
 *     기본:   각 step에 라벨 표시
 *     좁음:   step 번호 + 활성 step만 라벨
 *
 * Props
 *   stages: STAGES 배열 (lib/fulfillment.js)
 *   currentStageId: 현재 활성 stage id
 *   compact: 좁은 컨테이너용 (default false)
 */
import Icon from '@/components/common/Icon'

const TONE = {
  done:    { dot: 'bg-emerald-500 text-paper border-emerald-600', line: 'bg-emerald-400', label: 'text-emerald-700' },
  current: { dot: 'bg-ink text-paper border-ink animate-pulse-slow', line: 'bg-ink/30', label: 'text-ink font-bold' },
  pending: { dot: 'bg-paper text-mute border-ink/15', line: 'bg-ink/10', label: 'text-mute' },
}

export default function OrderFulfillmentTimeline({ stages = [], currentStageId, compact = false }) {
  if (!stages.length) return null
  const currentIdx = stages.findIndex((s) => s.id === currentStageId)

  return (
    <div role="progressbar" aria-label="주문 처리 단계"
      aria-valuenow={currentIdx + 1} aria-valuemin={1} aria-valuemax={stages.length}
      className="w-full">
      <ol className="flex items-start gap-0 relative">
        {stages.map((stage, i) => {
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'pending'
          const tone = TONE[state]
          const isLast = i === stages.length - 1
          return (
            <li key={stage.id} className="flex-1 min-w-0 relative">
              {/* 좌측에서 이전 step과 연결되는 라인 */}
              {i > 0 && (
                <div
                  className={`absolute h-0.5 top-3 left-0 w-1/2 -translate-x-px ${
                    i <= currentIdx ? TONE.done.line : TONE.pending.line
                  }`}
                  aria-hidden="true"
                />
              )}
              {/* 우측 라인 */}
              {!isLast && (
                <div
                  className={`absolute h-0.5 top-3 left-1/2 w-1/2 translate-x-px ${
                    i < currentIdx ? TONE.done.line : TONE.pending.line
                  }`}
                  aria-hidden="true"
                />
              )}

              <div className="relative flex flex-col items-center gap-1.5">
                {/* dot */}
                <div
                  className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold font-mono shrink-0 ${tone.dot}`}
                  title={stage.label}
                >
                  {state === 'done'
                    ? <Icon name="search" size={10} strokeWidth={3} style={{ display: 'none' }} />
                    : stage.step}
                  {state === 'done' && (
                    <svg viewBox="0 0 24 24" width="11" height="11" className="absolute" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12l5 5L20 6" />
                    </svg>
                  )}
                </div>

                {/* label — compact 모드에서는 현재만 */}
                {(!compact || state === 'current') && (
                  <div className={`text-[10px] text-center leading-tight ${tone.label} ${compact ? 'whitespace-nowrap' : ''}`}>
                    {compact ? stage.label : stage.short}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* 진행률 텍스트 — 한눈에 '몇 단계 / 총 N' */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
        <span className="text-mute font-bold">
          STEP {currentIdx + 1} / {stages.length}
        </span>
        <span className="text-mute">
          {stages[currentIdx]?.label}
        </span>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.18); }
          50%      { box-shadow: 0 0 0 5px rgba(0, 0, 0, 0); }
        }
        .animate-pulse-slow { animation: pulse-slow 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
