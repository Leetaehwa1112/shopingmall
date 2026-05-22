/**
 * KakaoPay Online Single-Payment client.
 *
 * 신 API base: https://open-api.kakaopay.com
 * 인증: Authorization: SECRET_KEY ${KAKAOPAY_SECRET_KEY}
 * 문서: https://developers.kakaopay.com/docs/payment/online/single-payment
 *
 * 환경 변수:
 *   KAKAOPAY_SECRET_KEY  — 시크릿키 (kakaopay 비즈 콘솔 → 가맹점 키 발급)
 *   KAKAOPAY_CID         — 가맹점 코드. 미설정 시 'TC0ONETIME' (테스트 CID)
 *   KAKAOPAY_BASE_URL    — (선택) 호출 베이스 URL 오버라이드
 */

const KAKAOPAY_BASE = process.env.KAKAOPAY_BASE_URL || 'https://open-api.kakaopay.com'

class PgError extends Error {
  constructor(message, pgResponse) {
    super(message)
    this.name = 'PgError'
    this.pgResponse = pgResponse
    this.isPgError = true
  }
}

/**
 * KakaoPay 결제 취소 (전액 또는 부분).
 *
 * @param {string} tid - 결제 고유 번호 (결제 승인 시 받은 tid; Order.payment.pgTxId 에 저장된 값)
 * @param {number} cancelAmount - 취소 금액 (정수, 원 단위)
 * @param {number} [cancelTaxFreeAmount=0] - 취소 비과세 금액
 * @returns {Promise<object>} KakaoPay 응답 객체 (approved_cancel_amount 등 포함)
 * @throws {PgError} 환경 변수 누락 / 인자 누락 / KakaoPay 측 오류
 */
async function cancelPayment(tid, cancelAmount, cancelTaxFreeAmount = 0) {
  const SECRET_KEY = process.env.KAKAOPAY_SECRET_KEY
  const CID = process.env.KAKAOPAY_CID || 'TC0ONETIME'

  if (!SECRET_KEY) {
    throw new PgError(
      'KAKAOPAY_SECRET_KEY 환경 변수가 없습니다. ' +
      'kakaopay 비즈 콘솔에서 시크릿키를 받아 server/.env 에 추가하세요.',
    )
  }
  if (!tid) {
    throw new PgError('취소할 결제의 TID(payment.pgTxId)가 비어있습니다.')
  }
  const amt = Number(cancelAmount)
  if (!Number.isFinite(amt) || amt <= 0) {
    throw new PgError('환불 금액은 0보다 큰 정수여야 합니다.')
  }

  const url = `${KAKAOPAY_BASE}/online/v1/payment/cancel`
  const body = {
    cid: CID,
    tid,
    cancel_amount: amt,
    cancel_tax_free_amount: Number(cancelTaxFreeAmount) || 0,
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `SECRET_KEY ${SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // KakaoPay API는 보통 빠르지만 안전망 — 10s
      signal: AbortSignal.timeout(10000),
    })
  } catch (err) {
    throw new PgError(`KakaoPay API 호출 실패: ${err.message}`)
  }

  let data = null
  try { data = await response.json() } catch { /* non-JSON 응답 */ }

  if (!response.ok) {
    const msg = data?.error_message || data?.errorMessage || `HTTP ${response.status}`
    throw new PgError(`KakaoPay 환불 실패: ${msg}`, data)
  }
  return data
}

module.exports = { cancelPayment, PgError }
