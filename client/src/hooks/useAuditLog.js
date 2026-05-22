/**
 * useAuditLog — 운영자 변경을 감사 로그에 기록.
 *
 * 사용 패턴
 *   const audit = useAuditLog()
 *   await audit.record({
 *     entity: 'order', entityId: orderId,
 *     action: 'refund',
 *     before: { status: 'paid' }, after: { status: 'refunded' },
 *     reason: '고객 변심',
 *   })
 *
 * 정책
 *   1) UI 변경은 옵티미스틱으로 이미 반영됨 → audit은 백그라운드 (await 안 해도 됨)
 *   2) 네트워크 실패 시 sessionStorage 큐에 적재 → 5분마다 재시도
 *   3) 작성자, 시점, IP, user-agent는 서버에서 보강 (클라이언트는 핵심 페이로드만)
 *
 * 백엔드 계약 (가정)
 *   POST /admin/audit
 *   { entity, entityId, action, before?, after?, reason?, metadata? }
 *
 *   서버는 audit_log 테이블에 적재 + AdminAuditLog 페이지에서 조회.
 */
import { useCallback, useMemo } from 'react'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'

const FAILED_QUEUE = 'pokevault:admin:audit:failed'

export function useAuditLog() {
  const user = useAuthStore((s) => s.user)

  const record = useCallback(async (entry) => {
    const payload = {
      ...entry,
      // 클라이언트가 보낼 수 있는 최소 메타 (서버가 신뢰하지 않으므로 cross-check 가능하게만)
      _client_user_id: user?.id || user?._id,
      _client_ts: Date.now(),
    }

    // localStorage에 즉시 기록 — 서버 도달 여부와 무관하게 AdminAuditLog 페이지에 즉시 표시
    // (서버가 audit_log 테이블을 가지면 서버 응답이 진실, 클라이언트는 캐시 역할)
    pushToLocalAudit(entry, user)

    try {
      await api.post('/admin/audit', payload)
    } catch (err) {
      // 실패 시 큐에 적재 — 다음 세션에서 재시도
      const cur = loadQueue()
      saveQueue([...cur, { payload, failedAt: Date.now() }].slice(-100)) // 최대 100건
      if (import.meta.env?.DEV) {
        console.warn('[audit] enqueued (will retry):', payload, err?.message)
      }
    }
  }, [user])

  /** 한 번에 여러 변경 기록 (bulk 액션) */
  const recordBatch = useCallback(async (entries) => {
    if (!entries?.length) return
    try {
      await api.post('/admin/audit/batch', { entries })
    } catch {
      // 실패 시 개별로 fallback
      for (const e of entries) await record(e)
    }
  }, [record])

  /** 실패 큐 재시도 (앱 시작 시 또는 timer로) */
  const retryFailed = useCallback(async () => {
    const queue = loadQueue()
    if (!queue.length) return
    const remaining = []
    for (const item of queue) {
      try { await api.post('/admin/audit', item.payload) }
      catch { remaining.push(item) }
    }
    saveQueue(remaining)
  }, [])

  return useMemo(() => ({ record, recordBatch, retryFailed }), [record, recordBatch, retryFailed])
}

function loadQueue() {
  try { return JSON.parse(sessionStorage.getItem(FAILED_QUEUE) || '[]') } catch { return [] }
}

function saveQueue(arr) {
  try { sessionStorage.setItem(FAILED_QUEUE, JSON.stringify(arr)) } catch { /* noop */ }
}

// ─── localStorage 적재 — 기존 ui.jsx logAudit과 동일한 key·format으로 통합 ─
//
// 기존 logAudit({ actor, action, entity, entityId, summary, meta }) 와 통합되도록
// useAuditLog.record({ entity, entityId, action, before, after, reason, metadata })를
// 같은 shape으로 변환해 'vault-admin-audit' 배열에 push.
//
// AdminAuditLog 페이지가 readAudit()로 이 배열을 읽어 표시 — 즉시 가시.
const LOCAL_KEY = 'vault-admin-audit'
const LOCAL_MAX = 500

function pushToLocalAudit(entry, user) {
  try {
    const arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
    // summary 자동 생성 — reason이 있으면 우선, 없으면 before→after 짧은 표현
    const summary = entry.reason
      || (entry.after ? Object.entries(entry.after).map(([k, v]) => `${k}=${formatVal(v)}`).join(', ') : '')
      || '-'
    arr.unshift({
      id:        crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      at:        new Date().toISOString(),
      actor:     user?.name || user?.email || 'admin',
      action:    entry.action || '-',
      entity:    entry.entity || '-',
      entityId:  String(entry.entityId ?? ''),
      summary,
      // 풍부한 메타 — 드로어에서 diff/reason/metadata 모두 표시 가능
      meta: {
        before:   entry.before ?? null,
        after:    entry.after ?? null,
        reason:   entry.reason ?? null,
        metadata: entry.metadata ?? null,
      },
    })
    localStorage.setItem(LOCAL_KEY, JSON.stringify(arr.slice(0, LOCAL_MAX)))
  } catch { /* noop */ }
}

function formatVal(v) {
  if (v == null) return '-'
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 30)
  return String(v).slice(0, 30)
}

// ─── 자주 쓰이는 액션 헬퍼 ─────────────────────────────
export function diffFields(before, after) {
  const out = {}
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])
  keys.forEach((k) => {
    if (before?.[k] !== after?.[k]) {
      out[k] = { from: before?.[k], to: after?.[k] }
    }
  })
  return out
}
