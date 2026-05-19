import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'
import Icon from '@/components/common/Icon'
import {
  PageHeader, StatGrid, StatCard, FilterBar, SearchInput, Select, Spacer,
  FilterChips, DataTable, Pagination, BulkBar, BulkButton, StatusPill,
  Cell, RowActions, IconBtn, Drawer, DSection, KV, EmptyState, logAudit,
} from '@/components/admin/ui'

const COUNTRY_FLAG = { USA: '🇺🇸', JPN: '🇯🇵', KOR: '🇰🇷' }

const STATUS = {
  pending:  { label: '검수 대기', tone: 'amber', led: 'yellow' },
  approved: { label: '승인됨',   tone: 'blue',  led: 'blue' },
  live:     { label: '진행 중',  tone: 'emerald', led: 'green' },
  ended:    { label: '종료',     tone: 'gray',  led: 'green' },
  rejected: { label: '거절됨',   tone: 'red',   led: 'red' },
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

export default function AdminAuctions() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.push)

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [saleType, setSaleType] = useState('all')
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState([])
  const [drawer, setDrawer] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    const params = filter ? { status: filter, limit: 500 } : { limit: 500 }
    api.get('/auctions', { params })
      .then(({ data }) => { setList(data.data || []); setTotal(data.total || 0) })
      .catch(() => toast({ type: 'error', title: '불러오기 실패', message: '경매 목록을 가져오지 못했습니다.' }))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1); setSelected([]) }, [filter, search, saleType])

  // local filter + sort
  const filtered = useMemo(() => {
    let rows = list.slice()
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.nameKo || '').toLowerCase().includes(q) ||
        (r.user?.name || '').toLowerCase().includes(q) ||
        (r.user?.email || '').toLowerCase().includes(q)
      )
    }
    if (saleType !== 'all') rows = rows.filter((r) => r.saleType === saleType)
    rows.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const get = (r) => ({
        createdAt: new Date(r.createdAt).getTime(),
        startPrice: r.startPrice || 0,
        currentBid: r.currentBid || 0,
        bidCount: r.bidCount || 0,
        status: r.status,
      }[sort.key])
      const av = get(a), bv = get(b)
      if (av < bv) return -1 * dir
      if (av > bv) return  1 * dir
      return 0
    })
    return rows
  }, [list, search, saleType, sort])

  const paged = useMemo(() =>
    filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const kpis = useMemo(() => ({
    pending: list.filter((i) => i.status === 'pending').length,
    live: list.filter((i) => i.status === 'live').length,
    bidValue: list.reduce((s, i) => s + (i.currentBid || 0), 0),
    today: list.filter((i) => new Date(i.createdAt).toDateString() === new Date().toDateString()).length,
  }), [list])

  const handleSort = (key) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  const handleStatusChange = async (id, status, adminNote) => {
    try {
      await api.patch(`/auctions/${id}/status`, { status, adminNote })
      logAudit({ actor: user?.name, action: `auction.${status}`, entity: 'auction', entityId: id, summary: `${STATUS[status]?.label}${adminNote ? ` (${adminNote})` : ''}` })
      toast({ type: 'success', title: '상태 변경 완료', message: STATUS[status]?.label })
      setDrawer(null)
      fetchList()
    } catch {
      toast({ type: 'error', title: '변경 실패', message: '상태 변경에 실패했습니다.' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('신청을 삭제할까요?\n(게시된 매물이 있으면 함께 삭제됩니다. 입찰 진행 중인 매물은 삭제 불가)')) return
    try {
      await api.delete(`/auctions/${id}`)
      logAudit({ actor: user?.name, action: 'auction.delete', entity: 'auction', entityId: id, summary: '신청 + 게시 매물 삭제' })
      toast({ type: 'success', title: '삭제 완료', message: '신청 내역이 삭제되었습니다.' })
      setDrawer(null)
      fetchList()
    } catch (err) {
      toast({ type: 'error', title: '삭제 실패', message: err?.response?.data?.message || '삭제할 수 없습니다.' })
    }
  }

  const handleBulk = async (status) => {
    if (!selected.length) return
    if (!confirm(`${selected.length}건을 [${STATUS[status]?.label}](으)로 변경할까요?`)) return
    for (const id of selected) {
      try { await api.patch(`/auctions/${id}/status`, { status }) } catch {}
    }
    logAudit({ actor: user?.name, action: `auction.bulk.${status}`, entity: 'auction', entityId: `${selected.length}건`, summary: `→ ${STATUS[status]?.label}`, meta: { ids: selected } })
    toast({ type: 'success', title: '일괄 변경 완료', message: `${selected.length}건 → ${STATUS[status]?.label}` })
    setSelected([])
    fetchList()
  }

  const filterOptions = [
    { value: '', label: '전체' },
    { value: 'pending', label: '검수 대기', led: 'yellow', count: kpis.pending },
    { value: 'approved', label: '승인됨', led: 'blue' },
    { value: 'live', label: '진행 중', led: 'green', count: kpis.live },
    { value: 'ended', label: '종료' },
    { value: 'rejected', label: '거절됨', led: 'red' },
  ]

  return (
    <div className="space-y-4 max-w-[1400px]">
      <PageHeader
        kicker="AUCTIONS"
        ledTone="red"
        title="경매 관리"
        subtitle={`총 ${total.toLocaleString()}건의 경매 신청/진행`}
        breadcrumb={['Admin', '거래', '경매 관리']}
        actions={
          <>
            {kpis.pending > 0 && (
              <Link to="/admin/auctions/review"
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 animate-pulse">
                <Icon name="bolt" size={12} strokeWidth={2.5} />
                검수 인박스 ({kpis.pending})
              </Link>
            )}
            <button onClick={fetchList} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-ink/15 bg-paper hover:bg-bone-2">
              <Icon name="arrow" size={12} strokeWidth={2.2} /> 새로고침
            </button>
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard label="검수 대기" value={kpis.pending} sub="클릭 → 인박스" icon="flame" tone="red" urgent={kpis.pending > 0}
          onClick={() => navigate('/admin/auctions/review')} />
        <StatCard label="진행 중" value={kpis.live} sub="실시간 입찰 중" icon="trophy" tone="emerald" />
        <StatCard label="누적 입찰가" value={`₩${(kpis.bidValue / 10000).toFixed(0)}만`} sub="현재 최고가 합" icon="package" />
        <StatCard label="오늘 신청" value={kpis.today} sub="신규 등록" icon="cart" tone="blue" />
      </StatGrid>

      <FilterBar>
        <SearchInput value={search} onSubmit={setSearch} placeholder="카드명 / 신청자 검색" width={260} />
        <Select label="유형" value={saleType} onChange={setSaleType} options={[
          { value: 'all', label: '전체' },
          { value: 'auction', label: '경매' },
          { value: 'buynow', label: '즉시구매' },
        ]} />
        <Spacer />
        <Select label="페이지당" value={pageSize} onChange={(v) => setPageSize(Number(v))}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: `${n}건` }))} />
      </FilterBar>

      <FilterChips value={filter} onChange={setFilter} options={filterOptions} />

      <BulkBar count={selected.length} onClear={() => setSelected([])}
        actions={
          <>
            <BulkButton tone="success" onClick={() => handleBulk('approved')}>일괄 승인</BulkButton>
            <BulkButton tone="success" onClick={() => handleBulk('live')}>경매 시작</BulkButton>
            <BulkButton tone="danger"  onClick={() => handleBulk('rejected')}>거절</BulkButton>
          </>
        }
      />

      <DataTable
        density="compact"
        loading={loading}
        rows={paged}
        rowKey={(r) => r._id}
        selected={selected}
        onSelect={setSelected}
        sort={sort}
        onSort={handleSort}
        onRowClick={(r) => setDrawer(r)}
        empty={<EmptyState icon="flame" title="해당 건이 없습니다" />}
        columns={[
          { key: 'user', label: '신청자', render: (r) =>
            <Cell primary={r.user?.name} secondary={r.user?.email} />
          },
          { key: 'name', label: '카드', render: (r) =>
            <Cell primary={r.nameKo || r.name} secondary={r.set ? `${r.set}${r.year ? ` · ${r.year}` : ''}` : r.name} />
          },
          { key: 'grade', label: '등급', render: (r) =>
            <div className="flex items-center gap-1.5">
              {r.cardCountry && <span>{COUNTRY_FLAG[r.cardCountry]}</span>}
              <span className="font-mono font-bold text-ink text-[11px]">{r.gradeCompany} {r.gradeScore}</span>
            </div>
          },
          { key: 'saleType', label: '유형', align: 'center', render: (r) =>
            r.saleType === 'auction'
              ? <StatusPill tone="red" led="red">AUCTION</StatusPill>
              : <StatusPill tone="blue">BUY NOW</StatusPill>
          },
          { key: 'startPrice', label: '시작가', align: 'right', sortable: true, render: (r) =>
            <span className="font-mono text-xs font-bold tabular-nums">₩{r.startPrice?.toLocaleString()}</span>
          },
          { key: 'currentBid', label: '현재가', align: 'right', sortable: true, render: (r) =>
            r.currentBid
              ? <span className="font-mono text-xs font-bold tabular-nums text-dex">₩{r.currentBid.toLocaleString()}</span>
              : <span className="text-mute text-[11px]">—</span>
          },
          { key: 'bidCount', label: '입찰', align: 'center', sortable: true, render: (r) =>
            <span className="font-mono text-[11px] font-bold tabular-nums">{r.bidCount || 0}</span>
          },
          { key: 'status', label: '상태', align: 'center', sortable: true, render: (r) => {
            const s = STATUS[r.status] || STATUS.pending
            return <StatusPill tone={s.tone} led={s.led}>{s.label}</StatusPill>
          }},
          { key: 'createdAt', label: '신청일', sortable: true, render: (r) =>
            <span className="text-[11px] text-mute font-mono">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</span>
          },
          { key: 'actions', label: '', align: 'right', render: (r) =>
            <RowActions>
              <IconBtn icon="arrow" label="상세" onClick={() => setDrawer(r)} />
            </RowActions>
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />

      {drawer && (
        <AuctionDrawer
          item={drawer}
          onClose={() => setDrawer(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function AuctionDrawer({ item, onClose, onStatusChange, onDelete }) {
  const [note, setNote] = useState(item.adminNote || '')
  const s = STATUS[item.status] || STATUS.pending
  return (
    <Drawer
      open
      onClose={onClose}
      title={item.nameKo || item.name}
      subtitle={item.nameKo ? item.name : item.set}
      width={560}
      footer={
        <>
          <button onClick={onClose} className="text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md hover:bg-bone-2">닫기</button>
        </>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <StatusPill tone={s.tone} led={s.led}>{s.label}</StatusPill>
        <span className="text-[11px] text-mute font-mono">신청일 {new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DSection title="신청자">
          <KV k="이름" v={item.user?.name} />
          <KV k="이메일" v={item.user?.email} />
          {item.user?.phone && <KV k="연락처" v={item.user.phone} />}
        </DSection>
        <DSection title="카드 정보">
          <KV k="영문명" v={item.name} />
          {item.nameKo && <KV k="한글명" v={item.nameKo} />}
          {item.set && <KV k="세트" v={item.set} />}
          {item.year && <KV k="연도" v={item.year} />}
          {item.number && <KV k="번호" v={item.number} mono />}
        </DSection>
        <DSection title="등급">
          <KV k="언어판" v={item.cardCountry ? `${COUNTRY_FLAG[item.cardCountry]} ${item.cardCountry}` : '-'} />
          <KV k="등급사" v={item.gradeCompany} />
          <KV k="점수" v={item.gradeScore} mono />
          {item.gradeCert && <KV k="인증서" v={`#${item.gradeCert}`} mono />}
        </DSection>
        <DSection title="판매 조건">
          <KV k="유형" v={item.saleType === 'auction' ? '경매' : '즉시 구매'} />
          <KV k="시작가" v={`₩${item.startPrice?.toLocaleString()}`} mono />
          {item.buyNowPrice && <KV k="즉시낙찰" v={`₩${item.buyNowPrice?.toLocaleString()}`} mono />}
          <KV k="최소호가" v={`₩${item.minIncrement?.toLocaleString()}`} mono />
          {item.endsAt && <KV k="종료" v={new Date(item.endsAt).toLocaleString('ko-KR')} />}
        </DSection>
      </div>

      {item.status === 'live' && (
        <DSection title="입찰 현황">
          <KV k="현재 최고가" v={item.currentBid ? `₩${item.currentBid.toLocaleString()}` : '없음'} mono highlight />
          <KV k="총 입찰 수" v={`${item.bidCount || 0}회`} mono />
        </DSection>
      )}

      <DSection title="어드민 메모">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
          placeholder="검수 메모, 거절 사유 등"
          className="w-full bg-bone-2/50 border border-ink/15 rounded-md px-3 py-2 text-xs text-ink focus:border-ink outline-none" />
      </DSection>

      <DSection title="상태 변경">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(STATUS).filter(([k]) => k !== item.status).map(([k, v]) => (
            <button key={k} onClick={() => onStatusChange(item._id, k, note)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-md border ${k === 'rejected' ? 'border-red-300 text-red-700 hover:bg-red-50' : k === 'live' ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' : k === 'approved' ? 'border-blue-300 text-blue-700 hover:bg-blue-50' : 'border-ink/15 text-mute hover:bg-bone-2'}`}>
              → {v.label}
            </button>
          ))}
        </div>
      </DSection>

      {/* 위험 액션 영역 — 신청 + 게시 매물 영구 삭제 */}
      <DSection title="위험 작업">
        <button
          type="button"
          onClick={() => onDelete?.(item._id)}
          className="text-[11px] font-bold px-3 py-1.5 rounded-md border border-red-500 text-white bg-red-600 hover:bg-red-700 transition-colors"
        >
          신청 삭제
        </button>
        <p className="text-[10px] text-mute mt-1.5 leading-relaxed">
          신청 내역과 게시된 매물을 함께 영구 삭제합니다. 입찰 진행 중인 매물은 삭제할 수 없습니다.
        </p>
      </DSection>
    </Drawer>
  )
}
