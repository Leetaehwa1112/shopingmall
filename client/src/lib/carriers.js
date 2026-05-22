/**
 * Carriers — 배송 캐리어별 메타데이터 + 추적 URL 자동 생성.
 *
 * 운영 의도
 *   운송장 번호만 있으면 운영자/고객 모두 한 클릭으로 캐리어 사이트에서 추적.
 *   캐리어마다 URL 패턴 다름 → 중앙화된 매핑.
 *
 *   미지원 캐리어는 fallback으로 Google 검색.
 */

export const CARRIERS = {
  FedEx: {
    name: 'FedEx',
    short: 'FDX',
    logo: '✈️',
    tone: 'purple',
    trackingUrl: (no) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(no)}`,
    avgDays: '3~5일',
    coverage: '국제 + 국내 익일',
    notes: 'PSA·BGS·CGC 인증 카드 표준. 보험 옵션 권장.',
  },
  "Brink's": {
    name: "Brink's",
    short: 'BRK',
    logo: '🚛',
    tone: 'red',
    trackingUrl: (no) => `https://www.brinksglobal.com/track-shipment?trackingNumber=${encodeURIComponent(no)}`,
    avgDays: '1~3일',
    coverage: '국제 무장 호송',
    notes: '₩100만 이상 고가 카드 — 무장 호송 + 보험 100% 커버.',
  },
  'CJ대한통운': {
    name: 'CJ대한통운',
    short: 'CJ',
    logo: '📦',
    tone: 'red',
    trackingUrl: (no) => `https://trace.cjlogistics.com/web/detail.jsp?slipno=${encodeURIComponent(no)}`,
    avgDays: '익일',
    coverage: '국내 전 지역',
    notes: '국내 표준. 도서산간 +1일.',
  },
  '우체국': {
    name: '우체국 택배',
    short: 'POST',
    logo: '🇰🇷',
    tone: 'blue',
    trackingUrl: (no) => `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?sid1=${encodeURIComponent(no)}`,
    avgDays: '익일~2일',
    coverage: '국내 + 도서산간 강점',
    notes: '도서산간 도달 신뢰도 ↑.',
  },
  '한진택배': {
    name: '한진택배',
    short: 'HJ',
    logo: '📦',
    tone: 'amber',
    trackingUrl: (no) => `https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?wblnumText=${encodeURIComponent(no)}`,
    avgDays: '익일~2일',
    coverage: '국내',
    notes: '국내 일반.',
  },
  '롯데택배': {
    name: '롯데택배',
    short: 'LT',
    logo: '📦',
    tone: 'red',
    trackingUrl: (no) => `https://www.lotteglogis.com/home/reservation/tracking/index?InvNo=${encodeURIComponent(no)}`,
    avgDays: '익일~2일',
    coverage: '국내',
    notes: '국내 일반.',
  },
}

export const CARRIER_NAMES = Object.keys(CARRIERS)

/** 캐리어 추적 URL 생성. 미지원이면 Google 검색 fallback. */
export function trackingUrl(carrier, trackingNumber) {
  if (!trackingNumber) return null
  const c = CARRIERS[carrier]
  if (c?.trackingUrl) return c.trackingUrl(trackingNumber)
  // fallback — 정확한 URL 모르면 Google
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier} 운송장 ${trackingNumber}`)}`
}

/** 캐리어 메타 (UI 표시용) */
export function carrierMeta(carrier) {
  return CARRIERS[carrier] || {
    name: carrier || 'Unknown',
    short: '?',
    logo: '📦',
    tone: 'ink',
    avgDays: '-',
    coverage: '-',
    notes: '-',
  }
}

/** 고가 주문(₩100만+)에 권장 캐리어 — UI 안내용 */
export function recommendCarrier(totalAmount) {
  if (totalAmount >= 1_000_000) return "Brink's"
  if (totalAmount >= 300_000)   return 'FedEx'
  return 'CJ대한통운'
}
