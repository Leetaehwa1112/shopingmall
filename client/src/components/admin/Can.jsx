/**
 * <Can> — 권한 기반 렌더 가드.
 *
 * 패턴
 *   1) children-only:  <Can action="order.refund"><RefundBtn/></Can>
 *      권한 없으면 아무것도 렌더 안 함.
 *
 *   2) fallback 제공: <Can action="..." fallback={<Disabled/>}>...</Can>
 *      권한 없으면 fallback 렌더.
 *
 *   3) disable 모드: <Can action="..." disable>{(allowed) => (
 *        <button disabled={!allowed} title={allowed ? '' : '권한 없음'}>...
 *      )}</Can>
 *      "있어야 하지만 비활성으로 보여줘야 할 때" — 가장 많이 쓰이는 패턴.
 *      툴팁으로 어떤 권한 필요한지 안내.
 *
 *   훅 버전:
 *      const canRefund = useCanDo('order.refund')
 *      <button disabled={!canRefund}>환불</button>
 */
import useAuthStore from '@/store/authStore'
import { can, PERMISSIONS, ROLE_LABEL } from '@/lib/permissions'

export default function Can({ action, fallback = null, disable = false, children }) {
  const user = useAuthStore((s) => s.user)
  const allowed = can(user, action)

  // disable 모드: 항상 렌더, allowed 인자만 전달
  if (disable && typeof children === 'function') {
    return children(allowed, missingRolesTooltip(action))
  }

  if (allowed) return typeof children === 'function' ? children(true) : children
  return fallback
}

/** 훅 — JSX 안에서 권한만 빠르게 확인 */
export function useCanDo(action) {
  const user = useAuthStore((s) => s.user)
  if (!action) {
    // 액션 미지정 → fn 반환 (체이닝)
    return (a) => can(user, a)
  }
  return can(user, action)
}

/** 권한 부족 시 사용자에게 보여줄 안내 문구 */
export function missingRolesTooltip(action) {
  const allowed = PERMISSIONS[action]
  if (!allowed?.length) return '권한이 필요한 작업입니다.'
  const labels = allowed.map((r) => ROLE_LABEL[r] || r).join(' / ')
  return `이 작업은 ${labels} 권한이 필요합니다.`
}
