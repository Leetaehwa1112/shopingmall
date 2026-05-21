/**
 * MiniBroadcastPlayer — 우측 하단 PiP 라이브 미니 플레이어 (YouTube 스타일).
 *
 * 사용처:
 *   1) /auctions (ProductsPage): 본 BroadcastStream이 뷰포트를 벗어나면 토글
 *      → visible/onExpand/onClose는 부모(스크롤 감지)가 관리.
 *   2) /products/:id (ProductDetailPage): LIVE 경매 상세에서 항상 표시
 *      → visible=true 고정. onExpand는 page top scroll, onClose는 dismiss.
 *
 * 디자인: dex-casing(빨간 Pokédex 띠) 상단 + 16:9 미니 화면(turntable + card-sway)
 *         + 종이 바닥에 카드명/가격/카운트다운 + bg-dex CTA.
 */
import { formatKRWFull } from '@/api/cards'
import Icon from './Icon'
import Sparkles from './Sparkles'

export default function MiniBroadcastPlayer({
  visible = true,
  lot,
  viewers,
  current,
  clockText,
  isCritical = false,
  isUrgent = false,
  onBid,
  onClose,
  onExpand,
}) {
  if (!lot) return null
  const img = lot.images?.[0] || lot.image
  return (
    <div
      // 모바일: 우측 하단 PIP (youtube 스타일). 하단 탭바(64) + sticky CTA 위로 띄움.
      // 데스크탑(lg+): 우측 하단 300px, bottom 16px.
      className={`mini-broadcast fixed right-3 lg:right-4 z-50 w-[180px] lg:w-[300px] rounded-2xl border-2 border-ink bg-paper overflow-hidden transition-all duration-300 ease-out ${
        visible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto shadow-[0_6px_0_#1a1a1a,0_12px_30px_rgba(13,23,48,0.25)]'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none shadow-none'
      }`}
      role="region"
      aria-label="라이브 미니 플레이어"
      aria-hidden={!visible}
    >
      {/* 상단 — Pokédex 빨간 띠 (LED + 시청자 + 컨트롤) */}
      <div
        className="dex-casing px-2.5 py-1.5 flex items-center justify-between gap-2"
        style={{ borderRadius: 0, border: 'none', borderBottom: '2px solid #1a1a1a' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} aria-hidden="true" />
          <span className="pixel-label text-white">LIVE</span>
        </span>
        {viewers != null && (
          <span className="font-mono text-[10px] font-extrabold text-paper tabular-nums inline-flex items-center gap-1">
            <Icon name="eye" size={10} strokeWidth={2.6} className="text-electric" />
            {viewers.toLocaleString()}
          </span>
        )}
        <div className="inline-flex items-center gap-1">
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="원래 크기로 보기"
              className="focus-ring w-6 h-6 rounded inline-flex items-center justify-center bg-paper/20 hover:bg-paper/35 transition-colors text-paper"
            >
              <span className="text-[11px] font-extrabold" aria-hidden="true">⤢</span>
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="미니 플레이어 닫기"
              className="focus-ring w-6 h-6 rounded inline-flex items-center justify-center bg-paper/20 hover:bg-paper/35 transition-colors text-paper"
            >
              <Icon name="close" size={10} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* 미니 화면 — Pokédex 화면 인셋 + 카드 회전 단상 */}
      <button
        type="button"
        onClick={onExpand}
        className="focus-ring relative block w-full overflow-hidden text-left sparkle-host"
        style={{ aspectRatio: '16 / 9', cursor: onExpand ? 'pointer' : 'default' }}
        aria-label="라이브 방송 펼치기"
        disabled={!onExpand}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, var(--color-dex-d) 0%, var(--color-dex-dd) 100%)' }}
        />
        <Sparkles always />
        <div className="spotlight" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="turntable-disc"
          style={{ width: '55%', aspectRatio: '1', bottom: '5%', left: '50%', transform: 'translateX(-50%)' }}
        />
        {img && (
          <div className="absolute inset-0 flex items-center justify-center p-3 z-10">
            <div className="card-sway">
              <img
                src={img}
                alt=""
                className="max-h-full rounded border-2 border-ink"
                style={{ boxShadow: '0 8px 16px rgba(0,0,0,0.5), 0 0 0 2px #ffffff' }}
              />
            </div>
          </div>
        )}
        <span className="absolute top-1.5 left-1.5 z-20 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-paper/15 backdrop-blur-sm border border-paper/30">
          <span className="led led-yellow led-pulse" style={{ width: 4, height: 4 }} aria-hidden="true" />
          <span className="pixel-label text-electric" style={{ fontSize: 8 }}>NOW BIDDING</span>
        </span>
      </button>

      {/* 자막 + 가격 — 종이 베이스 */}
      <div className="px-3 py-2.5 bg-paper">
        <div className="font-display text-[13px] font-bold text-ink truncate leading-tight">
          {lot.nameKo || lot.name}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="font-display text-[15px] font-extrabold text-ink tabular-nums leading-none">
            {formatKRWFull(current ?? lot.currentBid ?? lot.startPrice ?? 0)}
          </span>
          {clockText && (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[10.5px] font-extrabold tabular-nums ${
                isCritical ? 'text-dex' : isUrgent ? 'text-fire' : 'text-mute'
              }`}
              style={isCritical ? { animation: 'shake-soft 0.6s ease-in-out infinite' } : undefined}
            >
              <Icon name="clock" size={10} strokeWidth={2.6} />
              {clockText}
            </span>
          )}
        </div>
      </div>

      {/* CTA — btn-pop 톤 */}
      {onBid && (
        <button
          type="button"
          onClick={onBid}
          className="focus-ring relative overflow-hidden w-full inline-flex items-center justify-center gap-1.5 py-2.5 font-extrabold text-sm border-t-2 border-ink bg-dex text-paper hover:bg-dex-d transition-colors"
          aria-label="지금 입찰 참여하기"
        >
          <Icon name="gavel" size={13} strokeWidth={2.6} />
          지금 입찰하기
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-1/3 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              animation: 'shine-sweep 3.4s ease-in-out infinite',
            }}
          />
        </button>
      )}
    </div>
  )
}
