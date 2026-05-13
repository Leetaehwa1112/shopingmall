import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useWishlistStore from '@/store/wishlistStore'
import { ALL_CARDS, AUCTION_CARDS, BUYNOW_CARDS, formatKRWFull } from '@/api/cards'
import PokeCard from '@/components/common/PokeCard'
import CardTile from '@/components/common/CardTile'
import GradeBadge from '@/components/common/GradeBadge'
import Button from '@/components/common/Button'

export default function MyPage() {
  const { user, isAuthenticated, verified } = useAuthStore()
  const wishlistIds = useWishlistStore((s) => s.ids)
  const [tab, setTab] = useState('collection')

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="surface-soft p-10 elev-1">
          <h2 className="font-display text-2xl font-bold text-ink mb-3">로그인이 필요합니다</h2>
          <p className="text-sm text-mute mb-6">마이페이지를 보려면 로그인해주세요.</p>
          <Link to="/login"><Button variant="primary">로그인</Button></Link>
        </div>
      </div>
    )
  }

  const owned = BUYNOW_CARDS.slice(0, 3)
  const totalValue = owned.reduce((s, c) => s + c.price, 0)
  const watching = AUCTION_CARDS.slice(0, 2)
  const wishlist = ALL_CARDS.filter((c) => wishlistIds.includes(c.id))

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 surface-soft p-8 elev-1">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-ink text-paper flex items-center justify-center font-display text-3xl font-bold elev-2">
              {user?.name?.[0]?.toUpperCase() || 'T'}
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-ink">{user?.name}</div>
              <div className="text-sm text-mute">{user?.email}</div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Badge tone={verified ? 'green' : 'mute'}>{verified ? '✓ 본인 인증 완료' : '미인증'}</Badge>
                <Badge tone="gold">LV.2 Collector</Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="dex-casing p-6 text-paper">
          <div className="flex items-center gap-2 mb-3">
            <span className="led led-green led-pulse" />
            <span className="pixel-label text-gold">컬렉션 총 가치</span>
          </div>
          <div className="font-display text-4xl font-bold leading-none tabular-nums">{formatKRWFull(totalValue)}</div>
          <div className="text-xs font-bold mt-3 text-led-g">▲ +5.2% (지난 30일)</div>
        </div>
      </div>

      <div className="flex gap-1 mb-8 overflow-x-auto border-b border-line">
        {[
          ['collection', '내 컬렉션', owned.length],
          ['watching',   '입찰중',    watching.length],
          ['wishlist',   '위시리스트', wishlist.length],
          ['orders',     '주문',      3],
          ['profile',    '프로필',    null],
        ].map(([id, label, count]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-5 py-3.5 text-sm font-bold whitespace-nowrap relative transition-all ${
              tab === id ? 'text-ink' : 'text-mute hover:text-ink'
            }`}>
            {label}
            {count !== null && <span className="ml-1.5 opacity-50 text-xs font-mono">{count}</span>}
            {tab === id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />}
          </button>
        ))}
      </div>

      {tab === 'collection' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {owned.map((c) => (
            <div key={c.id} className="surface-card p-6 text-center">
              <div className="flex justify-center mb-4">
                <PokeCard card={c} size="md" />
              </div>
              <div className="font-display text-xl font-bold text-ink">{c.nameKo}</div>
              <div className="text-xs text-mute font-mono mt-1">{c.setShort}</div>
              <div className="mt-3 flex justify-center"><GradeBadge grade={c.grade} size="sm" /></div>
              <div className="font-mono text-sm text-ink font-bold mt-3 tabular-nums">{formatKRWFull(c.price)}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'watching' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {watching.map((c) => <CardTile key={c.id} card={c} />)}
        </div>
      )}

      {tab === 'wishlist' && (
        wishlist.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlist.map((c) => <CardTile key={c.id} card={c} />)}
          </div>
        ) : (
          <div className="surface-soft p-16 text-center text-mute">
            관심 카드가 없습니다. 카탈로그에서 별 아이콘을 눌러 추가해보세요.
          </div>
        )
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {[
            ['PV-LM4K7Z', '2026-05-12', '뮤츠 1st Edition', 15800000, '운송중', 'gold'],
            ['PV-LK2M9X', '2026-04-22', '갸라도스 Base', 980000, '도착', 'green'],
            ['PV-LJ8N1V', '2026-04-15', '프리져 Fossil', 3800000, '도착', 'green'],
          ].map(([id, date, item, price, status, tone]) => (
            <div key={id} className="surface-soft p-5 flex items-center justify-between">
              <div>
                <div className="font-mono text-xs text-mute">{id}</div>
                <div className="font-display text-lg font-bold text-ink mt-1">{item}</div>
                <div className="text-xs text-mute font-bold">{date}</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-ink font-bold tabular-nums">{formatKRWFull(price)}</div>
                <div className="mt-1.5"><Badge tone={tone}>{status}</Badge></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'profile' && (
        <div className="max-w-lg space-y-4">
          <Field label="이름" value={user?.name || ''} />
          <Field label="이메일" value={user?.email || ''} />
          <Field label="휴대폰" value="010-****-****" />
          <Field label="본인 인증" value={verified ? '인증 완료' : '미인증'} />
          <Button variant="primary">정보 수정</Button>
        </div>
      )}
    </div>
  )
}

function Badge({ tone, children }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    gold:  'bg-gold/15 text-amber-700 border border-gold/40',
    mute:  'bg-bone-2 text-mute border border-line',
  }
  return <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full ${tones[tone]}`}>{children}</span>
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">{label}</div>
      <div className="bg-paper border border-line rounded-lg px-4 py-3 text-sm text-ink font-bold">{value}</div>
    </div>
  )
}
