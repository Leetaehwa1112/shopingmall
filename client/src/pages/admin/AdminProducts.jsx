import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatKRWFull } from '@/api/cards'
import api from '@/api/axios'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import useToastStore from '@/store/toastStore'

const PAGE_SIZE = 8

export default function AdminProducts() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.push)
  const [filter, setFilter] = useState('all')
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [page, setPage] = useState(1)

  const fetchList = async (saleType) => {
    setLoading(true)
    try {
      const params = { status: '', limit: 100 }
      if (saleType && saleType !== 'all') params.sale_type = saleType
      const { data } = await api.get('/products', { params })
      setList(data.data)
      setTotal(data.total)
    } catch {
      toast({ type: 'error', title: '불러오기 실패', message: '카드 목록을 가져오지 못했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList(filter); setPage(1) }, [filter])

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`)
      toast({ type: 'success', title: '삭제 완료', message: '카드가 삭제되었습니다.' })
      setDeleteTarget(null)
      fetchList(filter)
    } catch {
      toast({ type: 'error', title: '삭제 실패', message: '카드 삭제에 실패했습니다.' })
    }
  }

  const counts = {
    all: total,
    auction: list.filter((c) => c.sale_type === 'auction').length,
    buynow: list.filter((c) => c.sale_type === 'buynow').length,
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const paged = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="pixel-label text-mute mb-3">Cards</div>
          <h1 className="font-display text-4xl font-bold text-ink tracking-tight">카드 관리</h1>
        </div>
        <Button variant="accent" onClick={() => navigate('/admin/products/new')}>
          <Icon name="plus" size={14} strokeWidth={2.5} /> 카드 등록
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', '전체'], ['auction', '경매'], ['buynow', '즉시구매']].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-2 text-sm font-bold rounded-full border transition-all ${
              filter === v ? 'bg-ink text-paper border-ink' : 'bg-paper border-line text-ink hover:border-ink/30'
            }`}>
            {label} <span className="opacity-60 font-mono text-xs">{counts[v] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="surface-soft overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-mute text-sm font-bold">불러오는 중...</div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-mute text-sm font-bold">등록된 카드가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bone-2/50 border-b border-line">
              <tr className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">
                <th className="text-left p-4">img</th>
                <th className="text-left p-4">SKU</th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Type</th>
                <th className="text-center p-4">Stock</th>
                <th className="text-right p-4">Price</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c._id} className="border-b border-line last:border-0 hover:bg-bone-2/30">
                  <td className="p-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-bone-2 flex items-center justify-center">
                      {c.images?.[0]
                        ? <img src={c.images[0]} alt={c.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                        : <span className="text-mute text-xs">—</span>}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs text-mute font-bold">{c.sku}</td>
                  <td className="p-4">
                    <div className="font-bold text-ink">{c.name}</div>
                    <div className="text-xs text-mute">{c.category}</div>
                  </td>
                  <td className="p-4 text-mute text-xs font-bold uppercase">{c.category}</td>
                  <td className="p-4">
                    {c.sale_type === 'auction' ? (
                      <span className="text-[10px] font-bold bg-dex/10 text-dex border border-dex/30 px-2 py-1 rounded-full tracking-wider inline-flex items-center gap-1.5">
                        <span className="led led-red led-pulse" style={{ width: 5, height: 5 }} /> AUCTION
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue border border-blue/30 px-2 py-1 rounded-full tracking-wider">BUY NOW</span>
                    )}
                  </td>
                  <td className="p-4 text-center font-mono font-bold text-sm">
                    <span className={c.stock <= 0 ? 'text-dex' : 'text-ink'}>{c.stock}</span>
                    {c.stock <= 0 && <span className="ml-1 text-[10px] text-dex font-bold">SOLD</span>}
                  </td>
                  <td className="p-4 text-right font-mono text-ink font-bold tabular-nums">{formatKRWFull(c.price)}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button onClick={() => navigate(`/admin/products/${c._id}/edit`)}
                      className="text-xs text-ink hover:text-dex font-bold mr-3">수정</button>
                    <button onClick={() => setDeleteTarget(c)}
                      className="text-xs text-mute hover:text-dex font-bold">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={list.length} onPage={setPage} />
      )}

      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          onConfirm={() => handleDelete(deleteTarget._id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

function Pagination({ page, totalPages, total, onPage }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-2">
      <span className="text-xs text-mute font-mono">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}건
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onPage((p) => Math.max(1, p - 1))} disabled={page === 1}
          className="w-8 h-8 rounded-lg border border-line bg-paper text-ink font-bold hover:bg-bone-2 disabled:opacity-30 disabled:cursor-not-allowed text-sm">‹</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onPage(n)}
            className={`w-8 h-8 rounded-lg border text-sm font-bold transition-all ${
              n === page ? 'bg-ink text-paper border-ink' : 'bg-paper border-line text-ink hover:bg-bone-2'
            }`}>{n}</button>
        ))}
        <button onClick={() => onPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
          className="w-8 h-8 rounded-lg border border-line bg-paper text-ink font-bold hover:bg-bone-2 disabled:opacity-30 disabled:cursor-not-allowed text-sm">›</button>
      </div>
    </div>
  )
}

function ConfirmDelete({ name, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="surface-soft max-w-sm w-full p-8 elev-3 text-center">
        <div className="font-display text-xl font-bold text-ink mb-2">정말 삭제하시겠습니까?</div>
        <div className="text-sm text-mute mb-6">
          <span className="font-bold text-ink">"{name}"</span> 이(가) 영구적으로 삭제됩니다.
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="ghost" onClick={onCancel}>취소</Button>
          <Button variant="accent" onClick={onConfirm}>삭제</Button>
        </div>
      </div>
    </div>
  )
}
