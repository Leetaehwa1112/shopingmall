/**
 * FulfillmentGuide — 현재 단계 친절 가이드 카드.
 *
 * 운영 의도
 *   "지금 할 일은 정확히 무엇이고, 무엇을 확인해야 하며, 다음은 무엇인가"를
 *   한 카드에 모두 표현. 신규 운영자도 이 카드만 보고 처리 가능해야 함.
 *
 *   구성:
 *     1) 헤더 — 단계 라벨 + 진행률 + 다음 액션 안내
 *     2) 도메인 alert — 고가 / Cert# / 도서산간 / 위탁 등 주의사항
 *     3) 체크리스트 — critical 항목 우선 + 즉시 토글
 *     4) 액션 영역 — CTA 버튼 (체크 완료 시 활성)
 *     5) 고객 알림 미리보기 — 발송될 알림톡 메시지
 *     6) 다음 단계 안내
 */
import { useState, useMemo } from 'react'
import Icon from '@/components/common/Icon'
import {
  loadChecklist, saveChecklist, toggleCheck, stageProgress,
  getDomainAlerts, renderCustomerMessage,
} from '@/lib/fulfillment'

const ALERT_TONE = {
  critical: { bg: 'bg-rose-50',    border: 'border-rose-300',   icon: 'text-rose-700',   title: 'text-rose-900' },
  warning:  { bg: 'bg-amber-50',   border: 'border-amber-300',  icon: 'text-amber-700',  title: 'text-amber-900' },
  info:     { bg: 'bg-blue-50',    border: 'border-blue-200',   icon: 'text-blue-700',   title: 'text-blue-900' },
}

export default function FulfillmentGuide({ order, stage, onAdvance }) {
  const orderId = order._id || order.id
  const [checklist, setChecklist] = useState(() => loadChecklist(orderId))
  const alerts = useMemo(() => getDomainAlerts(order), [order])
  const customerMsg = useMemo(() => renderCustomerMessage(stage, order), [stage, order])
  const progress = useMemo(() => stageProgress(checklist, stage.id), [checklist, stage.id])

  // 체크리스트의 critical 항목이 모두 체크됐는지 → CTA 활성화 조건
  const criticalDone = useMemo(() => {
    if (!stage.checklist) return true
    return stage.checklist
      .filter((c) => c.critical)
      .every((c) => checklist[`${stage.id}.${c.id}`])
  }, [checklist, stage])

  function handleToggle(checkId) {
    const next = toggleCheck(orderId, stage.id, checkId)
    setChecklist(next)
  }

  function handleSkipAll() {
    // 모든 체크를 한 번에 — '여유 있을 때 일일이 확인했어요' 케이스
    if (!stage.checklist) return
    const next = { ...checklist }
    stage.checklist.forEach((c) => { next[`${stage.id}.${c.id}`] = true })
    saveChecklist(orderId, next)
    setChecklist(next)
  }

  return (
    <div className="space-y-3">
      {/* 단계 헤더 */}
      <header className="bg-paper border-2 border-ink/10 rounded-xl p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-ink text-paper text-[10px] font-bold font-mono">
            {stage.step}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-mute">현재 단계 · 지금 할 일</div>
            <div className="text-base font-bold text-ink">{stage.label}</div>
          </div>
          {stage.checklist && (
            <div className="text-right">
              <div className="text-[10px] font-bold tracking-wider uppercase text-mute">진행률</div>
              <div className="text-sm font-mono tabular-nums font-bold text-ink">{Math.round(progress * 100)}%</div>
            </div>
          )}
        </div>
        {stage.operatorAction && (
          <div className="text-xs text-mute font-medium">
            <span className="font-bold text-ink">운영자 액션:</span> {stage.operatorAction}
          </div>
        )}
        {stage.automatic && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md">
            <Icon name="bolt" size={10} strokeWidth={2.4} />
            자동 단계 — 캐리어/시스템이 처리
          </div>
        )}
      </header>

      {/* 도메인 주의사항 */}
      {alerts.length > 0 && (
        <section className="space-y-2">
          {alerts.map((a, i) => {
            const tone = ALERT_TONE[a.level] || ALERT_TONE.info
            return (
              <div key={i} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${tone.bg} ${tone.border}`}>
                <Icon name={a.icon} size={14} strokeWidth={2.2} className={`shrink-0 mt-0.5 ${tone.icon}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-bold ${tone.title}`}>{a.title}</div>
                  <div className="text-[11px] text-mute font-medium mt-0.5">{a.desc}</div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* 체크리스트 */}
      {stage.checklist && stage.checklist.length > 0 && (
        <section className="bg-paper border-2 border-ink/10 rounded-xl overflow-hidden">
          <div className="px-3.5 py-2 bg-bone-2/40 border-b border-ink/10 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">체크리스트</span>
            <button
              type="button"
              onClick={handleSkipAll}
              className="text-[10px] font-mono text-mute hover:text-ink font-bold"
              title="모든 항목 한 번에 체크"
            >
              모두 확인 ✓
            </button>
          </div>
          <ul className="divide-y divide-ink/5">
            {stage.checklist.map((c) => {
              const checked = !!checklist[`${stage.id}.${c.id}`]
              return (
                <li key={c.id}>
                  <label className="flex items-center gap-2.5 px-3.5 py-2 cursor-pointer hover:bg-bone-2/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggle(c.id)}
                      className="w-4 h-4 accent-ink shrink-0"
                    />
                    <span className={`flex-1 text-sm font-medium ${checked ? 'text-mute line-through' : 'text-ink'}`}>
                      {c.label}
                    </span>
                    {c.critical && !checked && (
                      <span className="text-[9px] font-bold tracking-wider uppercase text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                        필수
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* CTA — 다음 단계로 진행 */}
      {!stage.automatic && !stage.final && stage.cta && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAdvance?.({ stage, checklist })}
            disabled={!criticalDone}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-ink text-sm font-bold shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_5px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all ${
              criticalDone
                ? 'bg-ink text-paper'
                : 'bg-bone-2 text-mute cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-[0_3px_0_#1a1a1a]'
            }`}
          >
            <Icon name="arrow" size={12} strokeWidth={2.6} />
            {stage.cta}
          </button>
          {!criticalDone && (
            <span className="text-[10px] text-rose-700 font-bold">
              필수 항목을 모두 확인하세요
            </span>
          )}
        </div>
      )}

      {/* 고객 알림 미리보기 */}
      {stage.customerNotify && customerMsg && (
        <section className="bg-emerald-50 border-2 border-emerald-200 rounded-xl overflow-hidden">
          <div className="px-3.5 py-2 bg-emerald-100 border-b border-emerald-200 flex items-center gap-2">
            <Icon name="bolt" size={12} strokeWidth={2.4} className="text-emerald-700" />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-800">
              자동 발송될 고객 알림
            </span>
          </div>
          <div className="px-3.5 py-2.5 text-[12px] text-emerald-900 leading-relaxed">
            <span className="text-[10px] text-emerald-700 font-mono font-bold">to {order.shipping?.phone || '(번호 없음)'}</span>
            <div className="mt-1">{customerMsg}</div>
          </div>
        </section>
      )}

      {/* 다음 단계 힌트 */}
      {stage.nextHint && (
        <div className="text-[11px] text-mute font-medium px-1 flex items-start gap-1.5">
          <Icon name="arrow" size={10} strokeWidth={2.2} className="text-mute mt-0.5 shrink-0" />
          <span><span className="font-bold text-ink">다음:</span> {stage.nextHint}</span>
        </div>
      )}
    </div>
  )
}
