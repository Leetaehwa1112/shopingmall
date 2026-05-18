// DB 응답 → CardTile/PackTile이 기대하는 shape로 변환
export function normalizeProduct(p) {
  return {
    ...p,
    id: p._id || p.id,
    type: p.sale_type || p.type,
    image: p.images?.[0] || p.image || '',
    endsAt: p.endsAt ? new Date(p.endsAt).getTime() : undefined,
  }
}

export function normalizePack(p) {
  return {
    ...p,
    id: p._id || p.id,
  }
}
