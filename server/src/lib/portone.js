/**
 * PortOne V2 Payment client.
 *
 * Base: https://api.portone.io
 * 인증: Authorization: PortOne ${PORTONE_API_SECRET}
 * 문서: https://developers.portone.io/api/rest-v2
 *
 * 환경 변수:
 *   PORTONE_API_SECRET — PortOne 관리자 콘솔 → API Keys → V2 API 시크릿
 *   PORTONE_BASE_URL   — (선택) 호출 베이스 오버라이드 (예: 스테이징)
 */

const PORTONE_BASE = process.env.PORTONE_BASE_URL || 'https://api.portone.io'

class PgError extends Error {
  constructor(message, pgResponse) {
    super(message)
    this.name = 'PgError'
    this.pgResponse = pgResponse
    this.isPgError = true
  }
}

/**
 * PortOne V2 결제 취소 (전액 또는 부분).
 *
 * paymentId는 결제 생성 시 가맹점이 지정한 unique ID — 우리 시스템에서는
 * Order.payment.pgTxId에 저장된 값(보통 orderNumber 또는 ObjectId 문자열).
 *
 * @param {string} paymentId
 * @param {object} options
 * @param {number} options.amount         - 취소 금액 (정수, 원)
 * @param {string} options.reason         - 취소 사유 (최대 100자)
 * @param {number} [options.taxFreeAmount=0]
 * @returns {Promise<object>} PortOne 응답 ({ cancellation: { id, ... } } 형태)
 * @throws {PgError}
 */
async function cancelPayment(paymentId, { amount, reason, taxFreeAmount = 0 } = {}) {
  const SECRET = process.env.PORTONE_API_SECRET
  if (!SECRET) {
    throw new PgError(
      'PORTONE_API_SECRET 환경 변수가 없습니다. ' +
      'PortOne 관리자 콘솔 → API Keys 에서 V2 API 시크릿을 발급받아 server/.env 에 추가하세요.',
    )
  }
  if (!paymentId) throw new PgError('취소할 결제의 paymentId(pgTxId)가 비어있습니다.')
  const amt = Number(amount)
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new PgError('환불 금액은 0보다 큰 정수여야 합니다.')
  }

  const url = `${PORTONE_BASE}/payments/${encodeURIComponent(paymentId)}/cancel`
  const body = {
    amount: amt,
    reason: String(reason || '운영자 처리').slice(0, 100),
    taxFreeAmount: Number(taxFreeAmount) || 0,
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `PortOne ${SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // PortOne 내부에서 실제 PG(카카오/토스/카드사)로 라우팅하므로 여유 있게.
      signal: AbortSignal.timeout(15000),
    })
  } catch (err) {
    throw new PgError(`PortOne API 호출 실패: ${err.message}`)
  }

  let data = null
  try { data = await response.json() } catch { /* non-JSON 응답 무시 */ }

  if (!response.ok) {
    const msg = data?.message || data?.error?.message || `HTTP ${response.status}`
    const code = data?.code || data?.error?.code
    throw new PgError(`PortOne 환불 실패: ${msg}${code ? ` (${code})` : ''}`, data)
  }
  return data
}

module.exports = { cancelPayment, PgError }
