/**
 * RBAC — Role-Based Access Control for Admin operations.
 *
 * 설계 의도
 *   현재 백엔드는 단일 user_type='admin' 플래그만 발급함.
 *   하지만 운영 효율 관점에서 역할 분리는 필수 — MD/CX/Auctioneer/CRM이
 *   "동료의 환불 권한", "다른 도메인 가격 수정 권한" 같은 위험한 액션을
 *   실수로 누르지 않도록 막아야 한다.
 *
 *   따라서 클라이언트 단에서 액션 단위 권한 매트릭스를 정의하고,
 *   user.sub_role 또는 추후 백엔드가 발급할 user.permissions 배열과 매칭한다.
 *   서버는 항상 자체적으로 다시 검증한다 (defense in depth).
 *
 * 사용 예시
 *   const canRefund = useCanDo()('order.refund')
 *   <Can action="user.blacklist"><BlacklistButton /></Can>
 *   permissionGate(user, 'product.price_change') // 함수형
 */

// ─── 액션 → 허용 역할 매트릭스 ────────────────────────────
// 'super_admin'은 모든 액션을 자동 통과 (아래 helper에서 처리).
export const PERMISSIONS = {
  // Order — CX 도메인
  'order.view':         ['admin', 'cx'],
  'order.ship':         ['admin', 'cx'],
  'order.refund':       ['admin', 'cx'],
  'order.partial':      ['admin', 'cx'],
  'order.cancel':       ['admin', 'cx'],
  'order.note':         ['admin', 'cx', 'crm'],

  // Product — MD 도메인
  'product.view':         ['admin', 'md'],
  'product.create':       ['admin', 'md'],
  'product.edit':         ['admin', 'md'],
  'product.price_change': ['admin', 'md'],
  'product.bulk_edit':    ['admin', 'md'],
  'product.delete':       ['admin'],            // 삭제는 super/admin만
  'product.publish':      ['admin', 'md'],

  // Pack — MD 도메인 (동일)
  'pack.view':            ['admin', 'md'],
  'pack.edit':            ['admin', 'md'],

  // User — CRM 도메인
  'user.view':         ['admin', 'crm', 'cx'],   // CX도 응대 위해 조회는 가능
  'user.note':         ['admin', 'crm', 'cx'],
  'user.grade_change': ['admin', 'crm'],
  'user.coupon_grant': ['admin', 'crm'],
  'user.blacklist':    ['admin'],                // 위험 액션 — super/admin만

  // Auction — Auctioneer 도메인
  'auction.view':         ['admin', 'auctioneer'],
  'auction.live_control': ['admin', 'auctioneer'],
  'auction.settle':       ['admin', 'auctioneer'],

  // Audit & 시스템
  'audit.view':       ['admin'],
  'settings.manage':  ['admin'],
}

// ─── helpers ───────────────────────────────────────────
/**
 * user 객체로부터 가지고 있는 역할 배열을 반환.
 *   - user_type === 'admin' 또는 role === 'admin' → 'admin' + 'super_admin'
 *   - user.sub_role (선택) → 추가 (예: 'cx', 'md')
 *   - 향후 user.permissions 배열 직접 지원 가능
 */
export function userRoles(user) {
  if (!user) return []
  const roles = new Set()
  if (user.user_type === 'admin' || user.role === 'admin') {
    roles.add('admin')
    roles.add('super_admin')
  }
  if (user.sub_role)  roles.add(user.sub_role)
  if (Array.isArray(user.roles)) user.roles.forEach((r) => roles.add(r))
  return [...roles]
}

/** 액션 수행 가능 여부 (super_admin은 모든 액션 통과) */
export function can(user, action) {
  const roles = userRoles(user)
  if (roles.includes('super_admin')) return true
  const allowed = PERMISSIONS[action]
  if (!allowed) {
    // 정의되지 않은 액션 — 안전 기본값은 deny + 개발 로그
    if (import.meta.env?.DEV) console.warn('[permissions] unknown action:', action)
    return false
  }
  return roles.some((r) => allowed.includes(r))
}

/** 비-React 컨텍스트에서 사용 (예: 서비스 레이어 가드) */
export function permissionGate(user, action) {
  if (!can(user, action)) {
    const err = new Error(`Permission denied: ${action}`)
    err.code = 'PERMISSION_DENIED'
    err.action = action
    throw err
  }
}

/** 역할 라벨 — UI 표시용 */
export const ROLE_LABEL = {
  super_admin: '시스템 관리자',
  admin:       '관리자',
  md:          'MD',
  cx:          '고객 운영',
  auctioneer:  '옥션 운영',
  crm:         'CRM',
}
