// DB 응답 → CardTile/PackTile이 기대하는 shape로 변환
export function normalizeProduct(p) {
  return {
    ...p,
    id: p._id || p.id,
    type: p.sale_type || p.type,
    image: p.images?.[0] || p.image || '',
    // 일정 필드는 Date → ms 변환 (Countdown/timeUntil이 ms 기반)
    startsAt: p.startsAt ? new Date(p.startsAt).getTime() : undefined,
    endsAt: p.endsAt ? new Date(p.endsAt).getTime() : undefined,
  }
}

export function normalizePack(p) {
  return {
    ...p,
    id: p._id || p.id,
  }
}
