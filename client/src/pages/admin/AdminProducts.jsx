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
import SavedViewBar from '@/components/admin/SavedViewBar'
import BulkPriceModal from '@/components/admin/BulkPriceModal'
import Can, { useCanDo, missingRolesTooltip } from '@/components/admin/Can'
import { useAuditLog } from '@/hooks/useAuditLog'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const LOW_STOCK = 3

export default function AdminProducts() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.push)

  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')        // sale_type
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')  // all|in|low|out
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selected, setSelected] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)
  const canEditPrice = useCanDo('product.price_change')
  const canBulkEdit = useCanDo('product.bulk_edit')
  const canDelete = useCanDo('product.delete')
  const audit = useAuditLog()

  const fetchList = useCallback(() => {
    setLoading(true)
    const params = { status: '', limit: 200 }
    if (filter !== 'all') params.sale_type = filter
    api.get('/products', { params })
      .then(({ data }) => { setList(data.data || []); setTotal(data.total || 0) })
      .catch(() => toast({ type: 'error', title: '불러오기 실패', message: '카드 목록 로딩 실패' }))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { fetchList() }, [fetchList])
  useEffect(() => { setPage(1); setSelected([]) }, [filter, search, stockFilter, category])

  const filtered = useMemo(() => {
    let rows = list.slice()
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((r) =>
        (r.name || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
      )
    }
    if (category !== 'all') rows = rows.filter((r) => r.category === category)
    if (stockFilter === 'in')  rows = rows.filter((r) => (r.stock || 0) > LOW_STOCK)
    if (stockFilter === 'low') rows = rows.filter((r) => (r.stock || 0) > 0 && (r.stock || 0) <= LOW_STOCK)
    if (stockFilter === 'out') rows = rows.filter((r) => (r.stock || 0) <= 0)
    rows.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const get = (r) => ({
        name: r.name || '',
        sku: r.sku || '',
        price: r.price || 0,
        stock: r.stock || 0,
        createdAt: new Date(r.createdAt).getTime() || 0,
      }[sort.key])
      const av = get(a), bv = get(b)
      if (av < bv) return -1 * dir
      if (av > bv) return  1 * dir
      return 0
    })
    return rows
  }, [list, search, category, stockFilter, sort])

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const kpis = useMemo(() => ({
    total: list.length,
    low: list.filter((r) => (r.stock || 0) > 0 && (r.stock || 0) <= LOW_STOCK).length,
    out: list.filter((r) => (r.stock || 0) <= 0).length,
    auction: list.filter((r) => r.sale_type === 'auction').length,
  }), [list])

  const categories = useMemo(() => Array.from(new Set(list.map((r) => r.category).filter(Boolean))), [list])

  const handleSort = (key) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  const patchProduct = async (id, body, summary) => {
    // optimistic
    setList((rows) => rows.map((r) => r._id === id ? { ...r, ...body } : r))
    try {
      await api.put(`/products/${id}`, body)
      logAudit({ actor: user?.name, action: 'product.update', entity: 'product', entityId: id, summary })
    } catch (e) {
      // revert by re-fetching
      fetchList()
      throw e
    }
  }

  const handleDelete = async (id, name) => {
    try {
      await api.delete(`/products/${id}`)
      logAudit({ actor: user?.name, action: 'product.delete', entity: 'product', entityId: id, summary: name })
      toast({ type: 'success', title: '삭제 완료' })
      setDeleteTarget(null)
      fetchList()
    } catch {
      toast({ type: 'error', title: '삭제 실패' })
    }
  }

  const handleBulkDelete = async () => {
    if (!selected.length) return
    if (!confirm(`${selected.length}개 카드를 삭제할까요? 되돌릴 수 없습니다.`)) return
    let ok = 0, fail = 0
    for (const id of selected) {
      try { await api.delete(`/products/${id}`); ok++ } catch { fail++ }
    }
    logAudit({ actor: user?.name, action: 'product.bulk.delete', entity: 'product', entityId: `${ok}개`, meta: { ids: selected, fail } })
    if (fail === 0)      toast({ type: 'success', title: `${ok}개 삭제 완료` })
    else if (ok === 0)   toast({ type: 'error',   title: '삭제 실패', message: `${fail}건 모두 실패했습니다.` })
    else                 toast({ type: 'warning', title: '부분 삭제', message: `성공 ${ok}건 · 실패 ${fail}건` })
    setSelected([])
    fetchList()
  }

  // 일괄 가격 변경 — BulkPriceModal에서 호출. changes: [{ id, from, to }]
  const handleBulkPrice = async ({ changes, mode, value, reason }) => {
    let ok = 0, fail = 0
    const auditEntries = []
    for (const ch of changes) {
      try {
        await api.put(`/products/${ch.id}`, { price: ch.to })
        ok++
        auditEntries.push({
          entity: 'product', entityId: ch.id, action: 'price_change',
          before: { price: ch.from }, after: { price: ch.to }, reason,
        })
      } catch {
        fail++
      }
    }
    if (auditEntries.length) {
      audit.recordBatch(auditEntries)
      logAudit({ actor: user?.name, action: 'product.bulk.price_change', entity: 'product',
        entityId: `${ok}개`, summary: `${mode} ${value} (${reason})`, meta: { ok, fail } })
    }
    if (fail === 0)    toast({ type: 'success', title: `${ok}개 가격 변경 완료` })
    else if (ok === 0) toast({ type: 'error',   title: '가격 변경 실패', message: `${fail}건 모두 실패` })
    else               toast({ type: 'warning', title: '부분 변경', message: `성공 ${ok}건 · 실패 ${fail}건` })
    setSelected([])
    fetchList()
  }

  // 시스템 saved views — 포케볼트 도메인에 맞춰 의도된 기본 제공
  // 현재 stockFilter/filter 기반으로 활성 view 추론
  const activeViewId = useMemo(() => {
    if (filter === 'all' && stockFilter === 'out') return 'oos'
    if (filter === 'all' && stockFilter === 'low') return 'low'
    if (filter === 'auction' && stockFilter === 'all') return 'auction'
    if (filter === 'buynow'  && stockFilter === 'all') return 'buynow'
    return null
  }, [filter, stockFilter])

  const systemViews = useMemo(() => [
    {
      id: 'oos', label: '재고 0', tone: 'red',
      count: kpis.out, apply: () => { setStockFilter('out'); setFilter('all'); },
    },
    {
      id: 'low', label: '재고 부족', tone: 'amber',
      count: kpis.low, apply: () => { setStockFilter('low'); setFilter('all'); },
    },
    {
      id: 'auction', label: '경매 출품', tone: 'red',
      count: kpis.auction, apply: () => { setFilter('auction'); setStockFilter('all'); },
    },
    {
      id: 'buynow', label: '즉시구매', tone: 'blue',
      apply: () => { setFilter('buynow'); setStockFilter('all'); },
    },
  ], [kpis])

  const clearView = () => { setStockFilter('all'); setFilter('all'); setSearch(''); setCategory('all') }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <PageHeader
        kicker="CARDS · CATALOG"
        ledTone="blue"
        title="카드 관리"
        subtitle={`총 ${total.toLocaleString()}개 카드`}
        breadcrumb={['Admin', '카탈로그', '카드 관리']}
        actions={
          <>
            <button onClick={fetchList} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-gray-900/15 bg-paper hover:bg-bone-2">
              <Icon name="arrow" size={12} strokeWidth={2.2} /> 새로고침
            </button>
            <button onClick={() => navigate('/admin/products/new')} className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800">
              <Icon name="plus" size={12} strokeWidth={2.5} /> 카드 등록
            </button>
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard label="전체 카드" value={kpis.total.toLocaleString()} sub="등록 SKU" icon="package" />
        <StatCard label="재고 부족" value={kpis.low} sub={`≤ ${LOW_STOCK}개`} icon="flame" tone="amber" urgent={kpis.low > 0}
          onClick={() => setStockFilter('low')} />
        <StatCard label="품절" value={kpis.out} sub="재고 0" icon="lock" tone="red" urgent={kpis.out > 0}
          onClick={() => setStockFilter('out')} />
        <StatCard label="경매 출품" value={kpis.auction} sub="진행 중 입찰" icon="trophy" />
      </StatGrid>

      <FilterBar>
        <SearchInput value={search} onSubmit={setSearch} placeholder="이름 / SKU / 카테고리" width={260} />
        <Select label="카테고리" value={category} onChange={setCategory}
          options={[{ value: 'all', label: '전체' }, ...categories.map((c) => ({ value: c, label: c }))]} />
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
        { value: 'auction', label: '경매', led: 'red' },
        { value: 'buynow', label: '즉시구매', led: 'blue' },
      ]} />

      {/* 시스템 + 저장된 뷰 (1클릭 점프) */}
      <SavedViewBar views={systemViews} activeId={activeViewId} onClearView={clearView} />

      <button
        onClick={() => navigate('/admin/products/new')}
        style={{ backgroundColor: '#dc2626', color: '#ffffff', borderColor: '#7f1d1d' }}
        className="group w-full flex items-center justify-between gap-4 rounded-xl px-5 py-4 hover:opacity-90 transition-all shadow-[0_3px_0_#7f1d1d] hover:shadow-[0_5px_0_#7f1d1d] hover:-translate-y-0.5 transform border-2"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-lg bg-white/20 border-2 border-white/40 flex items-center justify-center flex-shrink-0">
            <Icon name="plus" size={20} strokeWidth={3} />
          </span>
          <div className="text-left min-w-0">
            <div className="font-display text-base font-bold tracking-tight text-white">+ 새 카드 등록</div>
            <div className="text-xs text-white/90 font-medium mt-0.5">SKU · 이미지 · 가격 · 재고를 입력해 카탈로그에 추가</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-white bg-white/15 border border-white/40 px-3 py-1.5 rounded-md">
          시작 <Icon name="arrow" size={13} strokeWidth={2.6} />
        </span>
      </button>

      <BulkBar count={selected.length} onClear={() => setSelected([])}
        actions={
          <>
            <Can action="product.bulk_edit" disable>
              {(allowed) => (
                <BulkButton
                  onClick={() => setBulkPriceOpen(true)}
                  disabled={!allowed}
                  title={allowed ? '⇧+P · 선택 항목 가격 일괄 변경' : missingRolesTooltip('product.bulk_edit')}
                >
                  가격 일괄 변경
                </BulkButton>
              )}
            </Can>
            <Can action="product.delete" disable>
              {(allowed) => (
                <BulkButton
                  tone="danger"
                  onClick={handleBulkDelete}
                  disabled={!allowed}
                  title={allowed ? '선택 항목 영구 삭제' : missingRolesTooltip('product.delete')}
                >
                  일괄 삭제
                </BulkButton>
              )}
            </Can>
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
        empty={<EmptyState icon="package" title="등록된 카드가 없습니다" />}
        columns={[
          { key: 'img', label: '', render: (r) => <ImgThumb src={r.images?.[0]} alt={r.name} /> },
          { key: 'sku', label: 'SKU', sortable: true, render: (r) =>
            <span className="font-mono text-[11px] text-mute font-bold">{r.sku}</span>
          },
          { key: 'name', label: 'Name', sortable: true, render: (r) =>
            <Cell primary={r.name} secondary={r.category} />
          },
          { key: 'type', label: '유형', align: 'center', render: (r) =>
            r.sale_type === 'auction' ? (
              <div className="inline-flex flex-col items-center gap-1">
                <StatusPill tone="red" led="red">AUCTION</StatusPill>
                {r.buyNowPrice ? (
                  <span className="text-[9px] font-bold text-emerald-600 tracking-wide">💎 즉시낙찰 ON</span>
                ) : null}
              </div>
            ) : <StatusPill tone="blue">BUY NOW</StatusPill>
          },
          { key: 'stock', label: '재고', align: 'center', sortable: true, render: (r) =>
            <InlineNumberCell
              value={r.stock}
              lowThreshold={LOW_STOCK}
              onSave={(n) => patchProduct(r._id, { stock: n }, `재고 ${r.stock} → ${n} · ${r.name}`)}
            />
          },
          { key: 'price', label: '가격', align: 'right', sortable: true, render: (r) =>
            <InlineNumberCell
              value={r.price}
              format={(v) => formatKRWFull(v)}
              onSave={(n) => patchProduct(r._id, { price: n }, `가격 ${r.price} → ${n} · ${r.name}`)}
            />
          },
          { key: 'actions', label: '', align: 'right', render: (r) =>
            <RowActions>
              <IconBtn icon="arrow" label="수정" onClick={() => navigate(`/admin/products/${r._id}/edit`)} />
              <IconBtn icon="close" label="삭제" tone="danger" onClick={() => setDeleteTarget(r)} />
            </RowActions>
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />

      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget._id, deleteTarget.name)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {bulkPriceOpen && (
        <BulkPriceModal
          rows={list.filter((r) => selected.includes(r._id))}
          onClose={() => setBulkPriceOpen(false)}
          onConfirm={handleBulkPrice}
        />
      )}
    </div>
  )
}

function ConfirmDelete({ name, onConfirm, onCancel }) {
  // ESC로 닫기
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

        {/* 큰 버튼 2개 — 사이트 chunky/pop 톤 일치 */}
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
