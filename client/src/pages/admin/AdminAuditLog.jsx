import { useState, useEffect, useMemo } from 'react'
import Icon from '@/components/common/Icon'
import {
  PageHeader, StatGrid, StatCard, FilterBar, SearchInput, Select, Spacer,
  FilterChips, DataTable, Pagination, StatusPill, Cell, EmptyState, readAudit,
} from '@/components/admin/ui'

/**
 * Audit Log — every admin action (state change, delete, bulk op, tracking)
 * is recorded via `logAudit()` in components/admin/ui.jsx and surfaced here.
 *
 * Currently sourced from localStorage so it works without server changes —
 * easy to swap for an `/admin/audit` endpoint later by changing readAudit().
 */
const PAGE_SIZE_OPTIONS = [25, 50, 100]

export default function AdminAuditLog() {
  const [log, setLog] = useState([])
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('all')
  const [actor, setActor] = useState('all')
  const [sort, setSort] = useState({ key: 'at', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const load = () => setLog(readAudit())
  useEffect(() => { load() }, [])
  useEffect(() => { setPage(1) }, [search, entity, actor])

  const entities = useMemo(() => Array.from(new Set(log.map((l) => l.entity).filter(Boolean))), [log])
  const actors   = useMemo(() => Array.from(new Set(log.map((l) => l.actor).filter(Boolean))), [log])

  const filtered = useMemo(() => {
    let rows = log.slice()
    if (entity !== 'all') rows = rows.filter((r) => r.entity === entity)
    if (actor !== 'all')  rows = rows.filter((r) => r.actor === actor)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((r) =>
        (r.action || '').toLowerCase().includes(q) ||
        (r.summary || '').toLowerCase().includes(q) ||
        (r.entityId || '').toLowerCase().includes(q) ||
        (r.actor || '').toLowerCase().includes(q)
      )
    }
    rows.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const get = (r) => ({
        at: new Date(r.at).getTime(),
        action: r.action || '',
        entity: r.entity || '',
        actor: r.actor || '',
      }[sort.key])
      const av = get(a), bv = get(b)
      if (av < bv) return -1 * dir
      if (av > bv) return  1 * dir
      return 0
    })
    return rows
  }, [log, entity, actor, search, sort])

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const handleSort = (key) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  const today = new Date().toDateString()
  const kpis = {
    total: log.length,
    today: log.filter((l) => new Date(l.at).toDateString() === today).length,
    delete: log.filter((l) => (l.action || '').includes('delete')).length,
    statusChange: log.filter((l) => (l.action || '').includes('status') || (l.action || '').includes('approved') || (l.action || '').includes('rejected')).length,
  }

  const handleExport = () => {
    const rows = [['시각', '관리자', '액션', '엔티티', 'ID', '요약'].join(',')]
    filtered.forEach((r) => {
      rows.push([
        new Date(r.at).toISOString(),
        r.actor, r.action, r.entity, r.entityId,
        `"${(r.summary || '').replace(/"/g, '""')}"`,
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    if (!confirm('로컬 감사 로그를 모두 삭제할까요?')) return
    localStorage.removeItem('vault-admin-audit')
    load()
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <PageHeader
        kicker="AUDIT · 감사"
        ledTone="yellow"
        title="감사 로그"
        subtitle="관리자 작업 이력을 시간순으로 추적합니다"
        breadcrumb={['Admin', '운영', '감사 로그']}
        actions={
          <>
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-ink/15 bg-paper hover:bg-bone-2">
              <Icon name="package" size={12} strokeWidth={2.2} /> CSV
            </button>
            <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-ink/15 bg-paper hover:bg-bone-2">
              <Icon name="arrow" size={12} strokeWidth={2.2} /> 새로고침
            </button>
            <button onClick={handleClear} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md border border-red-200">
              <Icon name="close" size={12} strokeWidth={2.2} /> 비우기
            </button>
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard label="총 이벤트" value={kpis.total.toLocaleString()} sub="누적" icon="lock" />
        <StatCard label="오늘" value={kpis.today} sub="이벤트" icon="trophy" tone="blue" />
        <StatCard label="상태 변경" value={kpis.statusChange} sub="status/approve/reject" icon="arrow" tone="amber" />
        <StatCard label="삭제 작업" value={kpis.delete} sub="복구 불가" icon="flame" tone="red" urgent={kpis.delete > 0} />
      </StatGrid>

      <FilterBar>
        <SearchInput value={search} onSubmit={setSearch} placeholder="액션 / 요약 / ID 검색" width={280} />
        <Select label="엔티티" value={entity} onChange={setEntity} options={[
          { value: 'all', label: '전체' },
          ...entities.map((e) => ({ value: e, label: e })),
        ]} />
        <Select label="관리자" value={actor} onChange={setActor} options={[
          { value: 'all', label: '전체' },
          ...actors.map((a) => ({ value: a, label: a })),
        ]} />
        <Spacer />
        <Select label="페이지당" value={pageSize} onChange={(v) => setPageSize(Number(v))}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: `${n}건` }))} />
      </FilterBar>

      <DataTable
        density="compact"
        rows={paged}
        rowKey={(r) => r.id}
        sort={sort}
        onSort={handleSort}
        empty={<EmptyState icon="lock" title="기록된 작업이 없습니다" desc="관리자가 상태 변경/삭제를 수행하면 여기에 자동으로 기록됩니다." />}
        columns={[
          { key: 'at', label: '시각', sortable: true, render: (r) => {
            const d = new Date(r.at)
            return (
              <div className="font-mono text-[11px] tabular-nums">
                <div className="text-ink font-bold">{d.toLocaleDateString('ko-KR')}</div>
                <div className="text-mute">{d.toLocaleTimeString('ko-KR')}</div>
              </div>
            )
          }},
          { key: 'actor', label: '관리자', sortable: true, render: (r) =>
            <Cell primary={r.actor} secondary="ADMIN" />
          },
          { key: 'action', label: '액션', sortable: true, render: (r) =>
            <StatusPill tone={toneFor(r.action)}>{r.action}</StatusPill>
          },
          { key: 'entity', label: '엔티티', sortable: true, render: (r) =>
            <span className="font-mono text-[11px] text-mute font-bold uppercase">{r.entity}</span>
          },
          { key: 'entityId', label: 'ID', render: (r) =>
            <span className="font-mono text-[10px] text-mute truncate inline-block max-w-[140px]" title={r.entityId}>{r.entityId}</span>
          },
          { key: 'summary', label: '요약', render: (r) =>
            <span className="text-xs text-ink font-medium">{r.summary || '—'}</span>
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />
    </div>
  )
}

function toneFor(action = '') {
  if (action.includes('delete')) return 'red'
  if (action.includes('reject')) return 'red'
  if (action.includes('approve')) return 'emerald'
  if (action.includes('live'))    return 'emerald'
  if (action.includes('status'))  return 'amber'
  if (action.includes('bulk'))    return 'ink'
  return 'blue'
}
