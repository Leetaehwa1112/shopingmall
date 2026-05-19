import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatKRWFull } from '@/api/cards'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'
import Icon from '@/components/common/Icon'
import {
  PageHeader, StatGrid, StatCard, FilterBar, SearchInput, Select, Spacer,
  FilterChips, DataTable, Pagination, BulkBar, BulkButton, StatusPill,
  Cell, ImgThumb, RowActions, IconBtn, EmptyState, InlineNumberCell, logAudit,
} from '@/components/admin/ui'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const LOW_STOCK = 3

export default function AdminPacks() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.push)

  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')   // type pack|box|all
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    const params = { status: '', limit: 200 }
    if (filter !== 'all') params.type = filter
    api.get('/packs', { params })
      .then(({ data }) => { setList(data.data || []); setTotal(data.total || 0) })
      .catch(() => toast({ type: 'error', title: '불러오기 실패', message: '팩 목록 로딩 실패' }))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1); setSelected([]) }, [filter, search, stockFilter])

  const filtered = useMemo(() => {
    let rows = list.slice()
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.nameKo || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        (r.setShort || '').toLowerCase().includes(q)
      )
    }
    if (stockFilter === 'in')  rows = rows.filter((r) => (r.stock || 0) > LOW_STOCK)
    if (stockFilter === 'low') rows = rows.filter((r) => (r.stock || 0) > 0 && (r.stock || 0) <= LOW_STOCK)
    if (stockFilter === 'out') rows = rows.filter((r) => (r.stock || 0) <= 0)
    rows.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const get = (r) => ({
        name: r.nameKo || r.name || '',
        sku: r.sku || '',
        price: r.price || 0,
        stock: r.stock || 0,
        year: r.year || 0,
        createdAt: new Date(r.createdAt).getTime() || 0,
      }[sort.key])
      const av = get(a), bv = get(b)
      if (av < bv) return -1 * dir
      if (av > bv) return  1 * dir
      return 0
    })
    return rows
  }, [list, search, stockFilter, sort])

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const kpis = useMemo(() => ({
    total: list.length,
    low: list.filter((r) => (r.stock || 0) > 0 && (r.stock || 0) <= LOW_STOCK).length,
    out: list.filter((r) => (r.stock || 0) <= 0).length,
    box: list.filter((r) => r.type === 'box').length,
  }), [list])

  const handleSort = (key) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  const patchPack = async (id, body, summary) => {
    setList((rows) => rows.map((r) => r._id === id ? { ...r, ...body } : r))
    try {
      await api.put(`/packs/${id}`, body)
      logAudit({ actor: user?.name, action: 'pack.update', entity: 'pack', entityId: id, summary })
    } catch (e) {
      fetchList()
      throw e
    }
  }

  const handleDelete = async (id, name) => {
    try {
      await api.delete(`/packs/${id}`)
      logAudit({ actor: user?.name, action: 'pack.delete', entity: 'pack', entityId: id, summary: name })
      toast({ type: 'success', title: '삭제 완료' })
      setDeleteTarget(null)
      fetchList()
    } catch { toast({ type: 'error', title: '삭제 실패' }) }
  }

  const handleBulkDelete = async () => {
    if (!selected.length) return
    if (!confirm(`${selected.length}개 팩을 삭제할까요?`)) return
    let ok = 0, fail = 0
    for (const id of selected) {
      try { await api.delete(`/packs/${id}`); ok++ } catch { fail++ }
    }
    logAudit({ actor: user?.name, action: 'pack.bulk.delete', entity: 'pack', entityId: `${ok}개`, meta: { ids: selected, fail } })
    if (fail === 0)      toast({ type: 'success', title: `${ok}개 삭제 완료` })
    else if (ok === 0)   toast({ type: 'error',   title: '삭제 실패', message: `${fail}건 모두 실패했습니다.` })
    else                 toast({ type: 'warning', title: '부분 삭제', message: `성공 ${ok}건 · 실패 ${fail}건` })
    setSelected([])
    fetchList()
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <PageHeader
        kicker="PACKS · 카드팩"
        ledTone="yellow"
        title="카드팩 관리"
        subtitle={`총 ${total.toLocaleString()}개 팩/박스`}
        breadcrumb={['Admin', '카탈로그', '카드팩 관리']}
        actions={
          <>
            <button onClick={fetchList} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-gray-900/15 bg-paper hover:bg-bone-2">
              <Icon name="arrow" size={12} strokeWidth={2.2} /> 새로고침
            </button>
            <button onClick={() => navigate('/admin/packs/new')} className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800">
              <Icon name="plus" size={12} strokeWidth={2.5} /> 카드팩 등록
            </button>
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard label="전체 팩/박스" value={kpis.total} sub="등록 SKU" icon="star" />
        <StatCard label="재고 부족" value={kpis.low} sub={`≤ ${LOW_STOCK}개`} icon="flame" tone="amber" urgent={kpis.low > 0} onClick={() => setStockFilter('low')} />
        <StatCard label="품절" value={kpis.out} sub="재고 0" icon="lock" tone="red" urgent={kpis.out > 0} onClick={() => setStockFilter('out')} />
        <StatCard label="박스 상품" value={kpis.box} sub="BOX 타입" icon="package" />
      </StatGrid>

      <FilterBar>
        <SearchInput value={search} onSubmit={setSearch} placeholder="이름 / SKU / 세트 검색" width={260} />
        <Select label="재고" value={stockFilter} onChange={setStockFilter} options={[
          { value: 'all', label: '전체' },
          { value: 'in',  label: '정상' },
          { value: 'low', label: '부족' },
          { value: 'out', label: '품절' },
        ]} />
        <Spacer />
        <Select label="페이지당" value={pageSize} onChange={(v) => setPageSize(Number(v))}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: `${n}건` }))} />
      </FilterBar>

      <FilterChips value={filter} onChange={setFilter} options={[
        { value: 'all', label: '전체' },
        { value: 'pack', label: '부스터팩' },
        { value: 'box', label: '박스' },
      ]} />

      <button
        onClick={() => navigate('/admin/packs/new')}
        style={{ backgroundColor: '#dc2626', color: '#ffffff', borderColor: '#7f1d1d' }}
        className="group w-full flex items-center justify-between gap-4 rounded-xl px-5 py-4 hover:opacity-90 transition-all shadow-[0_3px_0_#7f1d1d] hover:shadow-[0_5px_0_#7f1d1d] hover:-translate-y-0.5 transform border-2"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-lg bg-white/20 border-2 border-white/40 flex items-center justify-center flex-shrink-0">
            <Icon name="plus" size={20} strokeWidth={3} />
          </span>
          <div className="text-left min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-white">+ 새 카드팩 등록</div>
            <div className="text-xs text-white/90 font-medium mt-0.5">팩/박스 정보 · 히어로 아트 · 가격 · 재고 입력</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-white bg-white/15 border border-white/40 px-3 py-1.5 rounded-md">
          시작 <Icon name="arrow" size={13} strokeWidth={2.6} />
        </span>
      </button>

      <BulkBar count={selected.length} onClear={() => setSelected([])}
        actions={<BulkButton tone="danger" onClick={handleBulkDelete}>일괄 삭제</BulkButton>} />

      <DataTable
        density="compact"
        loading={loading}
        rows={paged}
        rowKey={(r) => r._id}
        selected={selected}
        onSelect={setSelected}
        sort={sort}
        onSort={handleSort}
        empty={<EmptyState icon="star" title="등록된 팩이 없습니다" />}
        columns={[
          { key: 'img', label: '', render: (r) => <ImgThumb src={r.heroArt} alt={r.name} /> },
          { key: 'sku', label: 'SKU', sortable: true, render: (r) =>
            <span className="font-mono text-[11px] text-mute font-bold">{r.sku}</span>
          },
          { key: 'name', label: '이름', sortable: true, render: (r) =>
            <Cell primary={r.nameKo || r.name} secondary={r.nameKo ? r.name : r.setShort} />
          },
          { key: 'set', label: '세트', render: (r) =>
            <span className="text-[11px] text-mute font-bold">{r.setShort}</span>
          },
          { key: 'year', label: '연도', align: 'center', sortable: true, render: (r) =>
            <span className="font-mono text-[11px] text-mute tabular-nums">{r.year}</span>
          },
          { key: 'type', label: '종류', align: 'center', render: (r) =>
            r.type === 'box'
              ? <StatusPill tone="amber">BOX</StatusPill>
              : <StatusPill tone="emerald">PACK</StatusPill>
          },
          { key: 'stock', label: '재고', align: 'center', sortable: true, render: (r) =>
            <InlineNumberCell
              value={r.stock}
              lowThreshold={LOW_STOCK}
              onSave={(n) => patchPack(r._id, { stock: n }, `재고 ${r.stock} → ${n} · ${r.nameKo || r.name}`)}
            />
          },
          { key: 'price', label: '가격', align: 'right', sortable: true, render: (r) =>
            <InlineNumberCell
              value={r.price}
              format={(v) => formatKRWFull(v)}
              onSave={(n) => patchPack(r._id, { price: n }, `가격 ${r.price} → ${n} · ${r.nameKo || r.name}`)}
            />
          },
          { key: 'actions', label: '', align: 'right', render: (r) =>
            <RowActions>
              <IconBtn icon="arrow" label="수정" onClick={() => navigate(`/admin/packs/${r._id}/edit`)} />
              <IconBtn icon="close" label="삭제" tone="danger" onClick={() => setDeleteTarget(r)} />
            </RowActions>
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />

      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.nameKo || deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget._id, deleteTarget.nameKo || deleteTarget.name)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function ConfirmDelete({ name, onConfirm, onCancel }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 bg-ink/65 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        className="bg-paper border-2 border-ink rounded-2xl max-w-md w-full p-6 shadow-[0_6px_0_#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <span className="shrink-0 w-10 h-10 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center">
            <Icon name="close" size={18} strokeWidth={2.8} className="text-rose-600" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-delete-title" className="font-display text-lg font-bold text-ink leading-tight">
              정말 삭제할까요?
            </h3>
            <p className="text-sm text-mute font-medium mt-1 leading-relaxed">
              <span className="font-bold text-ink break-all">"{name}"</span>이(가) 영구 삭제됩니다.
              이 작업은 되돌릴 수 없어요.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 rounded-xl border-2 border-ink bg-paper text-sm font-bold text-ink hover:bg-bone-2 shadow-[0_3px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="px-4 py-3 rounded-xl border-2 border-ink bg-red-600 text-sm font-bold text-white hover:bg-red-700 shadow-[0_3px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all inline-flex items-center justify-center gap-1.5"
          >
            <Icon name="close" size={13} strokeWidth={2.8} />
            영구 삭제
          </button>
        </div>
      </div>
    </div>
  )
}
