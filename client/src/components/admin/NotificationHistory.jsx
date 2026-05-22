/**
 * NotificationHistory — 주문 알림 발송 이력 timeline.
 *
 * 운영 의도
 *   고객 문의 "왜 알림 안 받았어요?" → 한 화면에서 누가/언제/뭘 보냈는지 확인.
 *   각 알림은 단계 전이 시 자동 발송 (FulfillmentGuide의 onAdvance에서 트리거).
 *
 *   채널: 알림톡(카카오) / SMS / 이메일 / 시스템 (운영자 내부 메모)
 *   상태: queued / sent / delivered / read / failed
 *
 *   현재는 클라이언트 localStorage 기반 (백엔드 미구현 가정).
 *   백엔드 /admin/notifications/{orderId} 엔드포인트 생기면 마이그.
 */
import { useEffect, useState } from 'react'
import Icon from '@/components/common/Icon'

const KEY = (orderId) => `notifications:${orderId}`

// ─── 외부 헬퍼 — 알림 기록 (FulfillmentGuide 등에서 호출) ──
export function recordNotification(orderId, entry) {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY(orderId)) || '[]')
    arr.unshift({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      at: new Date().toISOString(),
      channel: 'kakao',
      status: 'sent',
      ...entry,
    })
    localStorage.setItem(KEY(orderId), JSON.stringify(arr.slice(0, 50)))
  } catch { /* noop */ }
}

export function loadNotifications(orderId) {
  try { return JSON.parse(localStorage.getItem(KEY(orderId)) || '[]') } catch { return [] }
}

// ─── 채널/상태 메타 ────────────────────────────────────
const CHANNEL = {
  kakao: { label: '알림톡', icon: '💬', tone: 'amber' },
  sms:   { label: 'SMS',    icon: '📱', tone: 'blue' },
  email: { label: '이메일', icon: '✉️', tone: 'gray' },
  system:{ label: '내부',   icon: '🔒', tone: 'gray' },
}

const STATUS_TONE = {
  queued:    'bg-amber-50 text-amber-700 border-amber-200',
  sent:      'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  read:      'bg-emerald-100 text-emerald-800 border-emerald-300',
  failed:    'bg-rose-50 text-rose-700 border-rose-200',
}

const STATUS_LABEL = {
  queued: '발송 대기', sent: '발송됨', delivered: '도달', read: '확인', failed: '실패',
}

// ─── 컴포넌트 ──────────────────────────────────────────
export default function NotificationHistory({ order, refreshKey = 0 }) {
  const orderId = order._id || order.id
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(loadNotifications(orderId))
  }, [orderId, refreshKey])

  if (!items.length) {
    return (
      <div className="bg-bone-2/40 border border-ink/10 rounded-lg px-3 py-4 text-center text-[11px] text-mute font-medium">
        아직 발송된 알림이 없어요.
        <div className="text-[10px] mt-0.5">단계 진행 시 자동으로 기록됩니다.</div>
      </div>
    )
  }

  return (
    <div className="bg-paper border-2 border-ink/10 rounded-xl overflow-hidden">
      <header className="px-3.5 py-2 border-b border-ink/10 bg-bone-2/40 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">알림 발송 이력</span>
        <span className="text-[10px] font-mono text-mute tabular-nums">{items.length}건</span>
      </header>
      <ul className="divide-y divide-ink/5">
        {items.map((n) => {
          const ch = CHANNEL[n.channel] || CHANNEL.system
          return (
            <li key={n.id} className="px-3.5 py-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-base shrink-0 mt-0.5" aria-hidden>{ch.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-mute">{ch.label}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0 rounded border ${STATUS_TONE[n.status] || STATUS_TONE.sent}`}>
                      {STATUS_LABEL[n.status] || n.status}
                    </span>
                    {n.stage && (
                      <span className="text-[9px] text-mute font-mono">@ {n.stage}</span>
                    )}
                  </div>
                  <div className="text-xs text-ink leading-snug">{n.message}</div>
                  <div className="text-[10px] text-mute font-mono mt-0.5">
                    {timeAgo(n.at)} · to {n.recipient || '(번호 없음)'}
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function timeAgo(at) {
  const t = new Date(at).getTime()
  if (!t) return ''
  const diff = Date.now() - t
  if (diff < 60_000)   return '방금'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}분 전`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}시간 전`
  return new Date(t).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
