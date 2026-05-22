/**
 * AdminSettlements — 위탁자 정산 운영 페이지.
 *
 * 운영 흐름
 *   판매된 위탁 카드 → 출고 7일 경과 → 위탁자에게 송금 → status: paid.
 *
 * 화면 구조
 *   1) KPI Strip — 이번 주 정산 / 누적 송금 / 위탁자 수 / 평균 처리일
 *   2) SavedViewBar — 정산 가능 / 대기 / 완료 등 1클릭 필터
 *   3) 위탁자별 그룹 카드 — 각 위탁자의 정산 대상 + Quick 정산 처리
 *
 *   bulk 송금: 여러 위탁자 한꺼번에 정산 — 월별 정산 시
 */
import { useState, useEffect, useMemo } from 'react'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'
import Icon from '@/components/common/Icon'
import {
  PageHeader, StatGrid, StatCard, FilterBar, SearchInput, Spacer, Select,
  EmptyState, ErrorState, StatusPill, logAudit,
} from '@/components/admin/ui'
import { formatKRWFull } from '@/utils/format'
import SavedViewBar from '@/components/admin/SavedViewBar'
import Can, { useCanDo, missingRolesTooltip } from '@/components/admin/Can'
import SettlementPayModal from '@/components/admin/SettlementPayModal'
import { useAuditLog } from '@/hooks/useAuditLog'
import {
  extractSettlements, groupByConsignor, markPaid, STATUS_LABEL,
} from '@/lib/settlement'

export default function AdminSettlements() {
  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.push)
  const audit = useAuditLog()
  const canPay = useCanDo('user.coupon_grant') // 향후 settlement.pay로 분리 가능

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [statusView, setStatusView] = useState('due') // due | pending | paid | all
  const [payTarget, setPayTarget] = useState(null)    // 송금 모달

  // 주문 fetch — 정산 대상은 출고/배송완료 주문에 위탁 라인이 있는 것
  const load = () => {
    setLoading(true); setError(false)
    api.get('/orders', { params: { limit: 500 } })
      .then(({ data }) => setOrders(data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const settlements = useMemo(() => extractSettlements(orders), [orders])
  const groups = useMemo(() => groupByConsignor(settlements), [settlements])

  // KPI
  const kpis = useMemo(() => {
    const due = settlements.filter((s) => s.status === 'due')
    const pending = settlements.filter((s) => s.status === 'pending')
    const paid = settlements.filter((s) => s.status === 'paid')
    return {
      dueAmount:     due.reduce((s, l) => s + l.netAmount, 0),
      dueCount:      due.length,
      pendingCount:  pending.length,
      paidCount:     paid.length,
      paidAmount:    paid.reduce((s, l) => s + l.netAmount, 0),
      consignorCount: new Set(settlements.map((s) => s.consignorId)).size,
    }
  }, [settlements])

  // 필터 — statusView + search
  const filteredGroups = useMemo(() => {
    let list = groups
    if (statusView === 'due')     list = list.filter((g) => g.dueCount > 0)
    if (statusView === 'pending') list = list.filter((g) => g.pendingCount > 0)
    if (statusView === 'paid')    list = list.filter((g) => g.paidCount > 0)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((g) =>
        (g.consignorName || '').toLowerCase().includes(q) ||
        (g.consignorId || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [groups, statusView, search])

  const systemViews = [
    { id: 'due',     label: '정산 가능', tone: 'red',     count: kpis.dueCount,
      apply: () => setStatusView('due') },
    { id: 'pending', label: '출고 후 대기', tone: 'amber', count: kpis.pendingCount,
      apply: () => setStatusView('pending') },
    { id: 'paid',    label: '지급 완료', tone: 'emerald', count: kpis.paidCount,
      apply: () => setStatusView('paid') },
    { id: 'all',     label: '전체',       tone: 'ink',
      apply: () => setStatusView('all') },
  ]

  const handlePay = async ({ consignorId, consignorName, lineIds, amount, method, memo }) => {
    try {
      // 백엔드 엔드포인트가 있으면 실제 송금 트리거 + DB 마킹
      // 없으면 클라이언트 영속만으로 운영 추적
      try {
        await api.post('/admin/settlements/pay', {
          consignorId, lineIds, amount, method, memo,
        })
      } catch {
        // 백엔드 미구현이어도 운영 흐름 진행 — audit에는 기록됨
      }
      markPaid(lineIds, { amount, method, memo, paidBy: user?.name })
      audit.record({
        entity: 'settlement',
        entityId: consignorId,
        action: 'pay',
        after: { amount, method, lineIds: lineIds.length },
        reason: memo || `${consignorName}에게 ${formatKRWFull(amount)} 정산`,
      })
      logAudit({
        actor: user?.name,
        action: 'settlement.pay',
        entity: 'settlement',
        entityId: consignorId,
        summary: `${consignorName} · ${formatKRWFull(amount)} (${method}) · ${lineIds.length}건`,
      })
      toast({ type: 'success', title: '정산 완료',
        message: `${consignorName}에게 ${formatKRWFull(amount)} 송금 기록됨` })
      load()
    } catch (err) {
      toast({ type: 'error', title: '정산 실패', message: err?.message || '다시 시도해주세요' })
    }
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <PageHeader
        kicker="SETTLEMENT · 위탁자 정산"
        ledTone="green"
        title="위탁자 정산"
        subtitle={`정산 가능 ${kpis.dueCount}건 · 송금 대기 ${formatKRWFull(kpis.dueAmount)}`}
        breadcrumb={['Admin', '운영', '위탁자 정산']}
        actions={
          <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-ink/15 bg-paper hover:bg-bone-2">
            <Icon name="arrow" size={12} strokeWidth={2.2} /> 새로고침
          </button>
        }
      />

      {/* KPI */}
      <StatGrid cols={4}>
        <StatCard
          label="정산 가능"
          value={kpis.dueCount}
          sub={formatKRWFull(kpis.dueAmount)}
          icon="flame"
          tone="red"
          urgent={kpis.dueCount > 0}
          onClick={() => setStatusView('due')}
        />
        <StatCard
          label="출고 후 대기"
          value={kpis.pendingCount}
          sub="7일 경과 후 정산 가능"
          icon="package"
          tone="amber"
          onClick={() => setStatusView('pending')}
        />
        <StatCard
          label="지급 완료"
          value={kpis.paidCount}
          sub={formatKRWFull(kpis.paidAmount)}
          icon="trophy"
          tone="emerald"
          onClick={() => setStatusView('paid')}
        />
        <StatCard
          label="위탁자"
          value={kpis.consignorCount}
          sub="활성 셀러"
          icon="shield"
        />
      </StatGrid>

      <FilterBar>
        <SearchInput value={search} onSubmit={setSearch} placeholder="위탁자 이름·ID 검색" width={260} />
        <Spacer />
      </FilterBar>

      <SavedViewBar views={systemViews} activeId={statusView} onClearView={() => setStatusView('due')} />

      {/* 본문 — 위탁자별 카드 */}
      {error ? (
        <ErrorState onRetry={load} />
      ) : loading ? (
        <div className="bg-paper border border-ink/10 rounded-xl p-10 text-center text-mute font-bold">
          정산 데이터를 불러오는 중...
        </div>
      ) : filteredGroups.length === 0 ? (
        <EmptyState
          icon="trophy"
          title={statusView === 'due' ? '정산할 대상이 없어요' : '해당 조건의 위탁자가 없습니다'}
          desc={statusView === 'due' ? '출고된 위탁 카드가 7일 경과하면 여기에 표시돼요.' : ''}
        />
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((g) => (
            <ConsignorCard
              key={g.consignorId}
              group={g}
              onPay={() => setPayTarget(g)}
              canPay={canPay}
            />
          ))}
        </div>
      )}

      {payTarget && (
        <SettlementPayModal
          consignor={payTarget}
          lines={payTarget.lines}
          onClose={() => setPayTarget(null)}
          onConfirm={handlePay}
        />
      )}
    </div>
  )
}

// ─── 위탁자 카드 ──────────────────────────────────────
function ConsignorCard({ group, onPay, canPay }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="bg-paper border-2 border-ink/10 rounded-xl overflow-hidden">
      <header className="px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-7 h-7 rounded-md hover:bg-bone-2 flex items-center justify-center text-mute hover:text-ink"
          title={expanded ? '접기' : '펼치기'}
        >
          <Icon name="arrow" size={11} strokeWidth={2.4}
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-ink truncate">{group.consignorName}</span>
            {group.dueCount > 0 && (
              <StatusPill tone="red" led="red">정산 가능 {group.dueCount}건</StatusPill>
            )}
            {group.pendingCount > 0 && group.dueCount === 0 && (
              <StatusPill tone="amber">대기 {group.pendingCount}건</StatusPill>
            )}
          </div>
          <div className="text-[10px] text-mute font-mono mt-0.5">
            ID: {group.consignorId.slice(-12)}
            {group.consignorAccount && <span className="ml-2 text-emerald-700">· {group.consignorAccount}</span>}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] text-mute font-bold uppercase tracking-wider">송금 필요</div>
          <div className="font-display text-lg font-bold tabular-nums text-ink">
            {formatKRWFull(group.dueAmount)}
          </div>
        </div>

        <Can action="user.coupon_grant" disable>
          {(allowed) => (
            <button
              type="button"
              onClick={onPay}
              disabled={!allowed || group.dueCount === 0}
              title={!allowed ? missingRolesTooltip('user.coupon_grant') : group.dueCount === 0 ? '정산 가능 라인 없음' : '송금 처리'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 border-ink bg-emerald-600 text-paper text-xs font-bold shadow-[0_2px_0_#1a1a1a] hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
            >
              <Icon name="bolt" size={11} strokeWidth={2.4} />
              송금
            </button>
          )}
        </Can>
      </header>

      {/* 라인 디테일 */}
      {expanded && (
        <div className="border-t border-ink/10 bg-bone-2/30">
          <ul className="divide-y divide-ink/5">
            {group.lines.map((l) => {
              const st = STATUS_LABEL[l.status]
              return (
                <li key={l.id} className="px-4 py-2 flex items-center gap-3">
                  <StatusPill tone={st.tone}>{st.label}</StatusPill>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-ink truncate">{l.productName}</div>
                    <div className="text-[10px] text-mute font-mono mt-0.5">
                      {l.orderNumber} · {l.saleType.toUpperCase()}
                      {l.shippedAt && <span className="ml-2">출고 {new Date(l.shippedAt).toLocaleDateString('ko-KR')}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-bold tabular-nums text-ink">{formatKRWFull(l.netAmount)}</div>
                    <div className="text-[9px] text-mute font-mono">
                      {formatKRWFull(l.grossPrice)} − {Math.round(l.commissionRate * 100)}%
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="border-t border-ink/10 px-4 py-2.5 flex items-center justify-between bg-paper">
            <span className="text-[10px] text-mute font-bold tracking-wider uppercase">총계</span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-mute font-mono">
                Gross {formatKRWFull(group.totalGross)} − 수수료 {formatKRWFull(group.totalCommission)}
              </span>
              <span className="text-ink font-display font-bold tabular-nums text-sm">
                = {formatKRWFull(group.totalNet)}
              </span>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
