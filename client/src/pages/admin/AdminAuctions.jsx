import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'
import Icon from '@/components/common/Icon'
import {
  PageHeader, StatGrid, StatCard, FilterBar, SearchInput, Select, Spacer,
  FilterChips, DataTable, Pagination, BulkBar, BulkButton, StatusPill,
  Cell, RowActions, IconBtn, Drawer, DSection, KV, EmptyState, logAudit,
} from '@/components/admin/ui'
import SavedViewBar from '@/components/admin/SavedViewBar'
import { useCanDo } from '@/components/admin/Can'

const COUNTRY_FLAG = { USA: '🇺🇸', JPN: '🇯🇵', KOR: '🇰🇷' }

const STATUS = {
  pending:  { label: '검수 대기',   tone: 'amber',   led: 'yellow' },
  approved: { label: '승인됨',     tone: 'blue',    led: 'blue' },
  upcoming: { label: '경매 예정',  tone: 'amber',   led: 'yellow' },
  live:     { label: '진행 중',    tone: 'emerald', led: 'green' },
  ended:    { label: '종료',       tone: 'gray',    led: 'green' },
  rejected: { label: '거절됨',     tone: 'red',     led: 'red' },
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]

export default function AdminAuctions() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.push)
  const canLiveControl = useCanDo('auction.live_control')

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
        lotOrder: r.lotOrder || 9999, // 미지정은 뒤로
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
    upcoming: list.filter((i) => i.status === 'upcoming').length,
    ended: list.filter((i) => i.status === 'ended').length,
    rejected: list.filter((i) => i.status === 'rejected').length,
    bidValue: list.reduce((s, i) => s + (i.currentBid || 0), 0),
    today: list.filter((i) => new Date(i.createdAt).toDateString() === new Date().toDateString()).length,
  }), [list])

  // ?view= URL 동기화 — 대시보드/⌘K에서 정확한 옥션 view로 점프
  useEffect(() => {
    const view = searchParams.get('view')
    if (!view) return
    const map = {
      live: 'live', upcoming: 'upcoming', pending: 'pending',
      ended: 'ended', rejected: 'rejected', approved: 'approved',
    }
    if (map[view]) setFilter(map[view])
    const next = new URLSearchParams(searchParams)
    next.delete('view')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 시스템 saved views — Auctioneer 페르소나의 운영 큐
  const systemViews = useMemo(() => [
    { id: 'live',     label: '진행 중 LIVE', tone: 'emerald', count: kpis.live,
      apply: () => setFilter('live') },
    { id: 'upcoming', label: '예정',         tone: 'amber',   count: kpis.upcoming,
      apply: () => setFilter('upcoming') },
    { id: 'pending',  label: '검수 대기',    tone: 'red',     count: kpis.pending,
      apply: () => setFilter('pending') },
    { id: 'ended',    label: '종료 (정산)',  tone: 'blue',    count: kpis.ended,
      apply: () => setFilter('ended') },
    { id: 'rejected', label: '거절됨',       tone: 'red',     count: kpis.rejected,
      apply: () => setFilter('rejected') },
  ], [kpis])

  const activeViewId = useMemo(() => filter || null, [filter])
  const clearView = () => { setFilter(''); setSearch(''); setSaleType('all') }

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

  const handleDelete = async (id, opts = {}) => {
    const { skipConfirm = false, fromRow = false } = opts
    if (!skipConfirm && !confirm('신청을 삭제할까요?\n(게시된 매물이 있으면 함께 삭제됩니다)')) return

    // 낙관적 업데이트 — 화면에서 즉시 제거 (서버 실패 시 롤백)
    const prev = list
    setList((cur) => cur.filter((r) => r._id !== id))
    setSelected((cur) => cur.filter((sid) => sid !== id))

    try {
      await api.delete(`/auctions/${id}`)
      logAudit({ actor: user?.name, action: 'auction.delete', entity: 'auction', entityId: id, summary: '신청 + 게시 매물 삭제' })
      toast({ type: 'success', title: '삭제 완료', message: '신청 내역이 삭제되었습니다.' })
      if (!fromRow) setDrawer(null)
      // 총개수 갱신을 위해 백그라운드 리프레시
      fetchList()
    } catch (err) {
      // 입찰이 있어서 거부된 경우 — 강제 삭제 옵션 제공
      if (err?.response?.data?.requireForce) {
        if (!confirm('이미 입찰이 진행된 매물입니다.\n그래도 강제 삭제하시겠어요? (입찰 기록 영구 손실)')) {
          setList(prev) // 사용자가 취소 → 롤백
          return
        }
        try {
          await api.delete(`/auctions/${id}?force=true`)
          logAudit({ actor: user?.name, action: 'auction.force_delete', entity: 'auction', entityId: id, summary: '강제 삭제 (입찰 기록 포함)' })
          toast({ type: 'success', title: '강제 삭제 완료', message: '신청과 입찰 기록이 영구 삭제되었습니다.' })
          if (!fromRow) setDrawer(null)
          fetchList()
        } catch (e2) {
          setList(prev) // 롤백
          toast({ type: 'error', title: '강제 삭제 실패', message: e2?.response?.data?.message || '삭제할 수 없습니다.' })
        }
        return
      }
      setList(prev) // 롤백
      toast({ type: 'error', title: '삭제 실패', message: err?.response?.data?.message || '삭제할 수 없습니다.' })
    }
  }

  const handleEdit = async (id, patch) => {
    try {
      await api.patch(`/auctions/${id}`, patch)
      logAudit({ actor: user?.name, action: 'auction.edit', entity: 'auction', entityId: id, summary: `필드 수정: ${Object.keys(patch).join(', ')}` })
      toast({ type: 'success', title: '수정 완료', message: '경매 정보가 업데이트되었습니다.' })
      setDrawer(null)
      fetchList()
    } catch (err) {
      const msg = err?.response?.data?.message
      toast({ type: 'error', title: '수정 실패', message: Array.isArray(msg) ? msg.join(', ') : msg || '수정에 실패했습니다.' })
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
    { value: 'upcoming', label: '예정', led: 'yellow', count: kpis.upcoming },
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
        <StatCard label="진행 중" value={kpis.live} sub="동시 LIVE 1건 권장" icon="trophy" tone="emerald" />
        <StatCard label="예정" value={kpis.upcoming} sub="대기열 — 일정 확정됨" icon="clock" tone="amber" />
        <StatCard label="누적 입찰가" value={`₩${(kpis.bidValue / 10000).toFixed(0)}만`} sub="현재 최고가 합" icon="package" />
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

      {/* 시스템 saved views — Auctioneer 워크플로우 (LIVE → 예정 → 검수 → 종료/정산) */}
      <SavedViewBar views={systemViews} activeId={activeViewId} onClearView={clearView} />

      <BulkBar count={selected.length} onClear={() => setSelected([])}
        actions={
          <>
            <BulkButton tone="success" onClick={() => handleBulk('approved')}>일괄 승인</BulkButton>
            <BulkButton tone="info"    onClick={() => handleBulk('upcoming')}>예정으로</BulkButton>
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
          { key: 'lotOrder', label: 'LOT', align: 'center', sortable: true, render: (r) =>
            r.lotOrder
              ? <span className="font-mono text-[11px] font-extrabold tabular-nums px-1.5 py-0.5 rounded bg-ink text-electric border border-ink">#{r.lotOrder}</span>
              : <span className="text-mute text-[11px]">—</span>
          },
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
          { key: 'actions', label: '', align: 'right', render: (r) => {
            const hasBids = (r.bidCount || 0) > 0 || r.currentBid
            const danger = r.status === 'rejected' || r.status === 'ended' || (r.status === 'pending' && !hasBids)
            return (
              <RowActions>
                <IconBtn icon="arrow" label="상세" onClick={(e) => { e?.stopPropagation?.(); setDrawer(r) }} />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(r._id, { fromRow: true })
                  }}
                  title={danger ? '삭제' : '삭제 (입찰 진행 중일 수 있음)'}
                  className={`inline-flex items-center justify-center w-6 h-6 rounded border text-[10px] font-bold transition-all ${
                    danger
                      ? 'border-red-300 text-red-700 hover:bg-red-50 hover:border-red-500'
                      : 'border-ink/15 text-mute hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  ✕
                </button>
              </RowActions>
            )
          }},
        ]}
      />

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />

      {drawer && (
        <AuctionDrawer
          item={drawer}
          onClose={() => setDrawer(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      )}
    </div>
  )
}

function AuctionDrawer({ item, onClose, onStatusChange, onDelete, onEdit }) {
  const [note, setNote] = useState(item.adminNote || '')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: item.name || '',
    nameKo: item.nameKo || '',
    set: item.set || '',
    year: item.year || '',
    number: item.number || '',
    gradeCompany: item.gradeCompany || 'PSA',
    gradeScore: item.gradeScore || '',
    gradeCert: item.gradeCert || '',
    cardCountry: item.cardCountry || 'USA',
    saleType: item.saleType || 'auction',
    startPrice: item.startPrice ?? '',
    buyNowPrice: item.buyNowPrice ?? '',
    startsAt: item.startsAt ? toLocalInput(item.startsAt) : '',
    endsAt: item.endsAt ? toLocalInput(item.endsAt) : '',
    lotOrder: item.lotOrder ?? '',
    minIncrement: item.minIncrement ?? '',
    description: item.description || '',
  })
  const s = STATUS[item.status] || STATUS.pending
  const hasBids = (item.bidCount || 0) > 0 || item.currentBid
  const setF = (k) => (v) => setForm((p) => ({ ...p, [k]: v }))

  const submitEdit = () => {
    const patch = {
      name: form.name,
      nameKo: form.nameKo,
      set: form.set,
      year: form.year,
      number: form.number,
      gradeCompany: form.gradeCompany,
      gradeScore: form.gradeScore,
      gradeCert: form.gradeCert,
      cardCountry: form.cardCountry,
      saleType: form.saleType,
      startPrice: form.startPrice === '' ? undefined : Number(form.startPrice),
      buyNowPrice: form.buyNowPrice === '' || form.buyNowPrice == null ? null : Number(form.buyNowPrice),
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      lotOrder: form.lotOrder === '' || form.lotOrder == null ? 0 : Number(form.lotOrder),
      minIncrement: form.minIncrement === '' ? undefined : Number(form.minIncrement),
      description: form.description,
      adminNote: note,
    }
    onEdit?.(item._id, patch)
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={item.nameKo || item.name}
      subtitle={item.nameKo ? item.name : item.set}
      width={620}
      footer={
        <div className="flex items-center gap-2 w-full justify-between">
          <div className="flex gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="text-xs font-bold bg-ink text-white px-3 py-1.5 rounded-md hover:bg-ink/85">
                ✎ 수정 모드
              </button>
            )}
            {editing && (
              <>
                <button onClick={submitEdit}
                  className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700">
                  💾 저장하기
                </button>
                <button onClick={() => setEditing(false)}
                  className="text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md hover:bg-bone-2">
                  수정 취소
                </button>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md hover:bg-bone-2">닫기</button>
        </div>
      }
    >
      <div className="mb-4 flex items-center gap-2">
        <StatusPill tone={s.tone} led={s.led}>{s.label}</StatusPill>
        <span className="text-[11px] text-mute font-mono">신청일 {new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
        {hasBids && <StatusPill tone="amber" led="yellow">입찰 진행됨</StatusPill>}
      </div>

      {!editing ? (
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
            {item.lotOrder ? <KV k="LOT 순번" v={`#${item.lotOrder}`} mono highlight /> : null}
            <KV k="시작가" v={`₩${item.startPrice?.toLocaleString()}`} mono />
            {item.buyNowPrice && <KV k="즉시낙찰" v={`₩${item.buyNowPrice?.toLocaleString()}`} mono />}
            <KV k="최소호가" v={`₩${item.minIncrement?.toLocaleString()}`} mono />
            {item.startsAt && <KV k="시작 일정" v={new Date(item.startsAt).toLocaleString('ko-KR')} />}
            {item.endsAt && <KV k="종료 일정" v={new Date(item.endsAt).toLocaleString('ko-KR')} />}
          </DSection>
        </div>
      ) : (
        <div className="space-y-4">
          <DSection title="카드 정보 (수정)">
            <div className="grid grid-cols-2 gap-2">
              <DInput label="영문명 *" value={form.name} onChange={setF('name')} />
              <DInput label="한글명" value={form.nameKo} onChange={setF('nameKo')} />
              <DInput label="세트" value={form.set} onChange={setF('set')} />
              <DInput label="연도" value={form.year} onChange={setF('year')} />
              <DInput label="번호" value={form.number} onChange={setF('number')} />
            </div>
          </DSection>
          <DSection title="등급 (수정)">
            <div className="grid grid-cols-3 gap-2">
              <DSelect label="등급사" value={form.gradeCompany} onChange={setF('gradeCompany')}
                options={[{value:'PSA',label:'PSA'},{value:'BGS',label:'BGS'},{value:'CGC',label:'CGC'}]} />
              <DInput label="점수" value={form.gradeScore} onChange={setF('gradeScore')} />
              <DSelect label="언어판" value={form.cardCountry} onChange={setF('cardCountry')}
                options={[{value:'USA',label:'🇺🇸 USA'},{value:'JPN',label:'🇯🇵 JPN'},{value:'KOR',label:'🇰🇷 KOR'}]} />
              <div className="col-span-3">
                <DInput label="인증서 번호" value={form.gradeCert} onChange={setF('gradeCert')} />
              </div>
            </div>
          </DSection>
          <DSection title="판매 조건 (수정)">
            {hasBids && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
                ⚠️ 입찰이 진행 중 — 시작가/판매유형은 변경 불가. 즉시낙찰가/시작·종료시각은 조정 가능.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <DSelect label="유형" value={form.saleType} onChange={setF('saleType')} disabled={hasBids}
                options={[{value:'auction',label:'경매'},{value:'buynow',label:'즉시구매'}]} />
              <DInput label="LOT 순번 (1·2·3…)" type="number" value={form.lotOrder} onChange={setF('lotOrder')} />
              <DInput label="시작가 (원)" type="number" value={form.startPrice} onChange={setF('startPrice')} disabled={hasBids} />
              <DInput label="즉시낙찰가 (원, 비우면 해제)" type="number" value={form.buyNowPrice} onChange={setF('buyNowPrice')} />
              <DInput label="최소 호가 (원)" type="number" value={form.minIncrement} onChange={setF('minIncrement')} />
              <div className="col-span-2 grid grid-cols-2 gap-2">
                <DInput label="시작 시각" type="datetime-local" value={form.startsAt} onChange={setF('startsAt')} />
                <DInput label="종료 시각" type="datetime-local" value={form.endsAt} onChange={setF('endsAt')} />
              </div>
              <p className="col-span-2 text-[10px] text-mute leading-relaxed">
                정책: 동시 LIVE 1건. 다른 LOT을 LIVE로 올리기 전 현재 LIVE를 ended로 내리거나, 이 LOT을 'upcoming'으로 두고 시작 시각을 미리 정해두세요.
              </p>
            </div>
          </DSection>
          <DSection title="설명 (수정)">
            <textarea value={form.description} onChange={(e) => setF('description')(e.target.value)} rows={3}
              className="w-full bg-bone-2/50 border border-ink/15 rounded-md px-3 py-2 text-xs text-ink focus:border-ink outline-none" />
          </DSection>
        </div>
      )}

      {!editing && item.status === 'live' && (
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

      {!editing && (
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
      )}

      {/* 위험 액션 영역 — 신청 + 게시 매물 영구 삭제 */}
      {!editing && (
        <DSection title="위험 작업">
          <button
            type="button"
            onClick={() => onDelete?.(item._id)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-md border border-red-500 text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            신청 삭제
          </button>
          <p className="text-[10px] text-mute mt-1.5 leading-relaxed">
            신청 내역과 게시된 매물을 함께 영구 삭제합니다. 입찰이 진행된 매물은 추가 확인 후 강제 삭제 가능합니다.
          </p>
        </DSection>
      )}
    </Drawer>
  )
}

// Date|string → datetime-local input 값 (로컬 타임존, "YYYY-MM-DDTHH:mm")
function toLocalInput(d) {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  const off = dt.getTimezoneOffset() * 60000
  return new Date(dt.getTime() - off).toISOString().slice(0, 16)
}

function DInput({ label, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="block">
      <div className="text-[10px] text-mute font-bold mb-1 tracking-wide">{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className={`w-full bg-bone-2/50 border border-ink/15 rounded-md px-2.5 py-1.5 text-xs text-ink focus:border-ink outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
    </label>
  )
}
function DSelect({ label, value, onChange, options, disabled = false }) {
  return (
    <label className="block">
      <div className="text-[10px] text-mute font-bold mb-1 tracking-wide">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className={`w-full bg-bone-2/50 border border-ink/15 rounded-md px-2.5 py-1.5 text-xs text-ink focus:border-ink outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}
