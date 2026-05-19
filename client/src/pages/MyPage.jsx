import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useWishlistStore from '@/store/wishlistStore'
import useCollectionStore from '@/store/collectionStore'
import { formatKRWFull } from '@/api/cards'
import { normalizeProduct } from '@/api/normalize'
import { getMyOrders } from '@/api/orderApi'
import api from '@/api/axios'
import { POKEDEX, ARTWORK_URL, TYPE_TOKEN, TYPE_CHIP } from '@/constants/pokedex'
import CardTile from '@/components/common/CardTile'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import Icon from '@/components/common/Icon'

export default function MyPage() {
  const { user, isAuthenticated, verified } = useAuthStore()
  const wishlistIds = useWishlistStore((s) => s.ids)
  const collectionIds = useCollectionStore((s) => s.ids)
  const toggleCollection = useCollectionStore((s) => s.toggle)
  const [tab, setTab] = useState('collection')

  // ─── 실데이터 ─────────────────────────────────────────
  const [orders, setOrders] = useState([])
  const [wishlistItems, setWishlistItems] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState({ orders: false, wish: false, listings: false })

  // 1) 컬렉션: collectionStore에 저장된 도감 ID → POKEDEX 항목으로 매핑
  const ownedPokemon = useMemo(
    () => POKEDEX.filter((p) => collectionIds.includes(p.id)),
    [collectionIds]
  )

  // 2) 주문 — 한 번에 가져와서 카운트/리스트 양쪽에 사용
  useEffect(() => {
    if (!isAuthenticated) return
    setLoading((s) => ({ ...s, orders: true }))
    getMyOrders({ page: 1, limit: 20 })
      .then(({ data }) => setOrders(data.data || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading((s) => ({ ...s, orders: false })))
  }, [isAuthenticated])

  // 3) 위시리스트 — 보관된 product ID들을 한 번에 fetch
  useEffect(() => {
    if (!isAuthenticated || wishlistIds.length === 0) {
      setWishlistItems([])
      return
    }
    setLoading((s) => ({ ...s, wish: true }))
    Promise.all(
      wishlistIds.map((id) =>
        api.get(`/products/${id}`)
          .then(({ data }) => normalizeProduct(data.data))
          .catch(() => null)
      )
    )
      .then((items) => setWishlistItems(items.filter(Boolean)))
      .finally(() => setLoading((s) => ({ ...s, wish: false })))
  }, [isAuthenticated, wishlistIds])

  // 4) 내 출품 — /auctions/me
  useEffect(() => {
    if (!isAuthenticated) return
    setLoading((s) => ({ ...s, listings: true }))
    api.get('/auctions/me')
      .then(({ data }) => setListings(data.data || []))
      .catch(() => setListings([]))
      .finally(() => setLoading((s) => ({ ...s, listings: false })))
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="surface-pop p-10 sparkle-host relative bg-confetti">
          <Sparkles always />
          <h2 className="font-display text-2xl font-bold text-ink mb-3">로그인이 필요해요</h2>
          <p className="text-sm text-mute mb-6 font-medium">마이페이지를 보려면 로그인해주세요.</p>
          <Link to="/login" className="btn-pop px-6 py-3 rounded-xl inline-flex items-center gap-2 font-bold">
            로그인 <Icon name="arrow" size={14} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    )
  }

  // ─── 통계 ─────────────────────────────────────────────
  const totalSpent = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total_amount || o.totalPrice || 0), 0)
  const liveListings = listings.filter((l) => ['approved', 'live', 'pending'].includes(l.status)).length

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* ── 헤더 + 통계 ────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 surface-pop p-8 relative sparkle-host">
          <Sparkles always />
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-ink text-electric flex items-center justify-center font-display text-3xl font-bold border-2 border-ink shadow-[0_4px_0_#1a1a1a]">
              {user?.name?.[0]?.toUpperCase() || 'T'}
            </div>
            <div>
              <Eyebrow tone="fire" led="red" pulse>TRAINER · 트레이너</Eyebrow>
              <div className="font-display text-3xl font-bold text-ink mt-2">{user?.name}</div>
              <div className="text-sm text-mute font-medium">{user?.email}</div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Badge tone={verified ? 'green' : 'mute'}>{verified ? '✓ 본인 인증 완료' : '미인증'}</Badge>
                <Badge tone="gold">LV.{Math.max(1, Math.floor(ownedPokemon.length / 3) + 1)} Collector</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="dex-casing p-6 text-paper relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="led led-green led-pulse" />
            <span className="pixel-label text-gold">총 결제 금액</span>
          </div>
          <div className="font-display text-4xl font-bold leading-none tabular-nums">
            {formatKRWFull(totalSpent)}
          </div>
          <div className="text-xs font-bold mt-3 text-led-g">
            완료 주문 {orders.filter((o) => o.status !== 'cancelled').length}건
          </div>
        </div>
      </div>

      {/* ── 탭 ───────────────────────────────────────────── */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {[
          ['collection', '내 도감',    ownedPokemon.length],
          ['wishlist',   '위시리스트', wishlistItems.length],
          ['orders',     '주문',       orders.length],
          ['listings',   '내 출품',    listings.length],
          ['profile',    '프로필',     null],
        ].map(([id, label, count]) => {
          const active = tab === id
          return (
            <button key={id} onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold whitespace-nowrap rounded-full border-2 transition-all ${
                active
                  ? 'bg-ink text-electric border-ink shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                  : 'bg-paper border-ink/20 text-ink hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
              }`}>
              {label}
              {count !== null && (
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                  active ? 'bg-electric/20 text-electric' : 'bg-bone-2 text-mute'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ═══════════════════ COLLECTION ═══════════════════ */}
      {tab === 'collection' && (
        ownedPokemon.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {ownedPokemon.map((p) => (
              <div key={p.id} className="surface-pop p-5 text-center relative">
                <button
                  onClick={() => toggleCollection(p.id)}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-psychic border-2 border-psychic text-paper flex items-center justify-center shadow-sm hover:bg-rose-500 hover:border-rose-500 transition-colors"
                  aria-label={`${p.nameKo} 도감 해제`}
                  title="도감 해제"
                >
                  <span className="text-[12px] leading-none">★</span>
                </button>
                <img
                  src={ARTWORK_URL(p.id)}
                  alt={`${p.nameKo} 일러스트`}
                  className="w-24 h-24 object-contain mx-auto drop-shadow-md"
                  loading="lazy"
                />
                <div className="font-mono text-[10px] text-mute font-bold mt-1">#{String(p.id).padStart(3, '0')}</div>
                <div className="font-display text-lg font-bold text-ink leading-tight">{p.nameKo}</div>
                <div className="text-[10px] text-mute font-bold italic mb-2">{p.name}</div>
                <div className="flex justify-center gap-1 flex-wrap">
                  {p.types.map((t) => {
                    const tok = TYPE_TOKEN[t] || 'mute'
                    return (
                      <span key={t} className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full ${TYPE_CHIP[tok]}`}>
                        {t}
                      </span>
                    )
                  })}
                </div>
                <Link
                  to="/dex"
                  className="mt-3 inline-block text-[11px] font-bold text-dex hover:underline"
                >
                  도감에서 보기 →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📖"
            title="도감이 아직 비어있어요"
            desc="도감 페이지에서 별을 눌러 좋아하는 포켓몬을 모아보세요."
            cta={<Link to="/dex" className="btn-pop px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 font-bold text-sm">도감 가기 →</Link>}
          />
        )
      )}

      {/* ═══════════════════ WISHLIST ═══════════════════ */}
      {tab === 'wishlist' && (
        loading.wish ? (
          <SkeletonCards />
        ) : wishlistItems.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((c) => <CardTile key={c.id} card={c} />)}
          </div>
        ) : (
          <EmptyState
            icon="⭐"
            title="아직 관심 카드가 없어요"
            desc="카탈로그에서 별 아이콘을 눌러 담아보세요."
            cta={<Link to="/products" className="btn-pop px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 font-bold text-sm">카탈로그 가기 →</Link>}
          />
        )
      )}

      {/* ═══════════════════ ORDERS ═══════════════════ */}
      {tab === 'orders' && (
        loading.orders ? (
          <SkeletonRows />
        ) : orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((o) => (
              <OrderRow key={o._id || o.id} order={o} />
            ))}
            <div className="text-center pt-3">
              <Link to="/my-orders" className="text-xs font-bold text-mute hover:text-ink underline underline-offset-2">
                전체 주문 보기 →
              </Link>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="📦"
            title="아직 주문 내역이 없어요"
            desc="첫 카드를 데려가보세요."
            cta={<Link to="/products" className="btn-pop px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 font-bold text-sm">쇼핑하기 →</Link>}
          />
        )
      )}

      {/* ═══════════════════ MY LISTINGS ═══════════════════ */}
      {tab === 'listings' && (
        loading.listings ? (
          <SkeletonRows />
        ) : listings.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MetricBox label="대기" val={listings.filter((l) => l.status === 'pending').length} tone="mute" />
              <MetricBox label="진행중" val={liveListings} tone="grass" />
              <MetricBox label="종료" val={listings.filter((l) => ['ended', 'rejected'].includes(l.status)).length} tone="mute" />
            </div>
            {listings.map((l) => (
              <ListingRow key={l._id || l.id} listing={l} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🪪"
            title="아직 출품한 카드가 없어요"
            desc="가지고 계신 카드를 트레이너들과 거래해보세요."
            cta={<Link to="/sell" className="btn-pop px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 font-bold text-sm">출품하기 →</Link>}
          />
        )
      )}

      {/* ═══════════════════ PROFILE ═══════════════════ */}
      {tab === 'profile' && (
        <div className="max-w-lg space-y-4">
          <Field label="이름" value={user?.name || ''} />
          <Field label="이메일" value={user?.email || ''} />
          <Field label="본인 인증" value={verified ? '인증 완료' : '미인증'} />
          <Field label="가입일" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'} />
          <div className="pt-2 text-xs text-mute font-medium">
            정보 수정은 곧 지원될 예정이에요.
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════

function Badge({ tone, children }) {
  const tones = {
    green: 'bg-grass/20 text-grass border-2 border-grass',
    gold:  'bg-electric/30 text-ink border-2 border-electric',
    mute:  'bg-bone-2 text-mute border-2 border-ink/20',
  }
  return <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${tones[tone]}`}>{children}</span>
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-ink font-bold mb-1.5 tracking-wide">{label}</div>
      <div className="bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-3 text-sm text-ink font-bold">{value}</div>
    </div>
  )
}

function EmptyState({ icon, title, desc, cta }) {
  return (
    <div className="surface-pop p-16 text-center bg-confetti relative sparkle-host">
      <Sparkles always />
      <div className="text-5xl mb-4">{icon}</div>
      <p className="font-display text-xl font-bold text-ink mb-1.5">{title}</p>
      <p className="text-sm text-mute font-medium mb-5">{desc}</p>
      {cta}
    </div>
  )
}

function SkeletonCards() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface-pop p-6 animate-pulse">
          <div className="aspect-[3/4] bg-bone-2 rounded-lg mb-3" />
          <div className="h-3 w-20 bg-bone-2 rounded mb-2" />
          <div className="h-4 w-32 bg-bone-2 rounded" />
        </div>
      ))}
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface-pop p-5 animate-pulse">
          <div className="h-3 w-20 bg-bone-2 rounded mb-2" />
          <div className="h-5 w-48 bg-bone-2 rounded" />
        </div>
      ))}
    </div>
  )
}

function OrderRow({ order }) {
  const id = order._id || order.id
  const items = order.items || []
  const firstItem = items[0]
  const more = items.length - 1
  const total = order.total_amount || order.totalPrice || 0
  const status = order.status || 'paid'
  const date = order.createdAt || order.created_at

  const STATUS_LABEL = {
    paid: ['결제완료', 'gold'],
    ready: ['배송준비', 'gold'],
    shipped: ['배송중', 'gold'],
    delivered: ['배송완료', 'green'],
    cancelled: ['취소됨', 'mute'],
  }
  const [label, tone] = STATUS_LABEL[status] || [status, 'mute']

  return (
    <Link
      to={`/my-orders`}
      className="surface-pop p-5 flex items-center justify-between gap-4 hover:-translate-y-0.5 transition-transform"
    >
      <div className="min-w-0">
        <div className="font-mono text-[10px] text-mute font-bold">
          PV-{String(id).slice(-8).toUpperCase()}
        </div>
        <div className="font-display text-base font-bold text-ink mt-0.5 truncate">
          {firstItem?.name || '주문'} {more > 0 && <span className="text-mute font-medium">외 {more}건</span>}
        </div>
        <div className="text-[11px] text-mute font-bold mt-0.5">
          {date ? new Date(date).toLocaleDateString('ko-KR') : '-'}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-ink font-bold tabular-nums">{formatKRWFull(total)}</div>
        <div className="mt-1.5"><Badge tone={tone}>{label}</Badge></div>
      </div>
    </Link>
  )
}

function ListingRow({ listing }) {
  const id = listing._id || listing.id
  const name = listing.cardName || listing.name || listing.title || '제목 없음'
  const startPrice = listing.startPrice || listing.expectedPrice || listing.price || 0
  const status = listing.status || 'pending'

  const STATUS = {
    pending:  ['검토 대기', 'mute'],
    approved: ['승인됨', 'gold'],
    live:     ['경매 진행중', 'green'],
    ended:    ['종료', 'mute'],
    rejected: ['반려', 'mute'],
  }
  const [label, tone] = STATUS[status] || [status, 'mute']

  return (
    <div className="surface-pop p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="font-mono text-[10px] text-mute font-bold">
          LST-{String(id).slice(-8).toUpperCase()}
        </div>
        <div className="font-display text-base font-bold text-ink mt-0.5 truncate">{name}</div>
        <div className="text-[11px] text-mute font-bold mt-0.5">
          시작가 <span className="text-ink font-mono">{formatKRWFull(startPrice)}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <Badge tone={tone}>{label}</Badge>
      </div>
    </div>
  )
}

function MetricBox({ label, val, tone }) {
  const toneCls = {
    grass: 'border-grass/40 bg-grass/10 text-grass',
    mute:  'border-ink/15 bg-bone-2 text-mute',
  }[tone] || 'border-ink/15 bg-bone-2 text-mute'
  return (
    <div className={`rounded-xl border-2 px-4 py-3 ${toneCls}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider">{label}</div>
      <div className="font-display text-2xl font-bold tabular-nums leading-none mt-1 text-ink">{val}</div>
    </div>
  )
}
