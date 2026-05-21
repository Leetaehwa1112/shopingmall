import { useState, useEffect } from 'react'
import api from '@/api/axios'
import { formatKRW } from '@/api/cards'
import Countdown from '@/components/common/Countdown'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/stats/dashboard')
      .then(({ data }) => setStats(data.data))
      .catch(() => setStats(null))
  }, [])

  const auctions = stats?.auctions || []
  const totalBidValue = stats?.totalBidValue ?? 0
  const activeAuctions = stats?.activeAuctions ?? '—'
  const totalProducts = stats?.totalProducts ?? '—'
  const totalPacks = stats?.totalPacks ?? '—'

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <div className="pixel-label text-mute mb-3">Overview</div>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight">대시보드</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="활성 상품" value={totalProducts} sub="등록된 카드" led="blue" />
        <KPI label="진행중 옥션" value={activeAuctions} sub="활성 입찰" led="yellow" />
        <KPI label="총 입찰가치" value={stats ? formatKRW(totalBidValue) : '—'} led="red" />
        <KPI label="카드팩" value={totalPacks} sub="활성 팩" led="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface-soft p-7">
          <div className="flex justify-between items-end mb-5">
            <div>
              <div className="pixel-label text-dex mb-1.5">Live Auctions</div>
              <h3 className="font-display text-xl font-bold text-ink">진행중 경매</h3>
            </div>
            <span className="text-xs font-bold text-mute inline-flex items-center gap-1.5">
              <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} />
              실시간
            </span>
          </div>
          <div className="space-y-2">
            {auctions.length === 0 && (
              <div className="text-sm text-mute py-4 text-center">진행중인 경매가 없습니다</div>
            )}
            {auctions.map((c) => (
              <div key={c._id} className="flex justify-between items-center py-3 px-4 bg-bone-2/50 rounded-lg">
                <div>
                  <div className="font-bold text-ink">{c.nameKo || '—'}</div>
                  <div className="text-xs text-mute font-mono mt-0.5">{c.bidCount ?? 0} bids · {c.watchers ?? 0} watching</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-ink font-bold tabular-nums">{formatKRW(c.currentBid)}</div>
                  {c.endsAt && <Countdown endsAt={c.endsAt} size="sm" label={false} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="surface-soft p-6">
            <div className="pixel-label text-mute mb-4">Recent Activity</div>
            <div className="space-y-2.5 text-sm">
              {[
                ['새 입찰', 'Charizard 1st PSA 10', '₩142M', 'red'],
                ['결제 완료', 'Mewtwo 1st PSA 10', '₩15.8M', 'green'],
                ['회원 가입', 'collector_999', '', 'blue'],
                ['인증 요청', 'Blastoise', '', 'yellow'],
              ].map(([type, item, amount, c], i) => (
                <div key={i} className="flex justify-between gap-2 pb-2 border-b border-line last:border-0">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={`led led-${c}`} style={{ width: 6, height: 6 }} />
                    <div className="min-w-0">
                      <div className="text-[10px] text-mute font-bold tracking-wider uppercase">{type}</div>
                      <div className="text-ink truncate text-xs font-bold">{item}</div>
                    </div>
                  </div>
                  {amount && <div className="font-mono text-xs text-ink font-bold whitespace-nowrap tabular-nums">{amount}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="dex-casing p-6 text-paper">
            <div className="flex items-center gap-2 mb-2">
              <span className="led led-red led-pulse" />
              <span className="pixel-label text-gold">검수 대기</span>
            </div>
            <div className="font-display text-3xl font-bold tabular-nums">3건</div>
            <div className="text-xs mt-1 text-paper/80">신규 등록된 카드</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, sub, delta, trend, led }) {
  return (
    <div className="surface-soft p-6">
      <div className="flex items-center gap-2 mb-2">
        <span className={`led led-${led}`} style={{ width: 6, height: 6 }} />
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">{label}</div>
      </div>
      <div className="font-display text-3xl font-bold text-ink tabular-nums">{value}</div>
      {(sub || delta) && (
        <div className={`text-xs font-bold mt-2 ${trend === 'up' ? 'text-emerald-600' : 'text-mute'}`}>
          {delta && <span className="mr-2 font-mono">{delta}</span>}
          {sub}
        </div>
      )}
    </div>
  )
}
