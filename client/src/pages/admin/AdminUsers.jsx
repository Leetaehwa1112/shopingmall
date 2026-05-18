import { useState, useEffect } from 'react'
import api from '@/api/axios'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'

const PAGE_SIZE = 8

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.get('/users')
      .then(({ data }) => setUsers(data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  const list = filter === 'all' ? users : users.filter((u) => u.user_type === filter)

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const paged = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilter = (v) => { setFilter(v); setPage(1) }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <div className="pixel-label text-mute mb-3">Users</div>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight">고객 관리</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KPI label="전체 회원" value={users.length} led="blue" />
        <KPI label="일반 회원" value={users.filter((u) => u.user_type === 'customer').length} led="green" />
        <KPI label="관리자" value={users.filter((u) => u.user_type === 'admin').length} led="red" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['all', '전체'], ['customer', '일반 회원'], ['admin', '관리자']].map(([v, label]) => (
          <button key={v} onClick={() => handleFilter(v)}
            className={`px-4 py-2 text-sm font-bold rounded-full border transition-all ${
              filter === v ? 'bg-ink text-paper border-ink' : 'bg-paper border-line text-ink hover:border-ink/30'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="surface-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bone-2/50 border-b border-line">
            <tr className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">
              <th className="text-left p-4">이름</th>
              <th className="text-left p-4">이메일</th>
              <th className="text-left p-4">연락처</th>
              <th className="text-center p-4">권한</th>
              <th className="text-left p-4">가입일</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-mute font-bold">불러오는 중...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-mute font-bold">회원이 없습니다.</td></tr>
            ) : paged.map((u) => (
              <tr key={u._id} className="border-b border-line last:border-0 hover:bg-bone-2/30">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="font-bold text-ink">{u.name}</span>
                  </div>
                </td>
                <td className="p-4 text-mute font-mono text-xs">{u.email}</td>
                <td className="p-4 text-mute text-xs">{u.phone || '—'}</td>
                <td className="p-4 text-center">
                  {u.user_type === 'admin' ? (
                    <span className="text-[10px] font-bold bg-dex/10 text-dex border border-dex/30 px-2 py-1 rounded-full">ADMIN</span>
                  ) : (
                    <span className="text-[10px] font-bold bg-blue-50 text-blue border border-blue/30 px-2 py-1 rounded-full">CUSTOMER</span>
                  )}
                </td>
                <td className="p-4 text-mute font-mono text-xs">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '—'}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => setSelected(u)} className="text-xs text-ink hover:text-dex font-bold inline-flex items-center gap-1">
                    상세 <Icon name="arrow" size={11} strokeWidth={2.2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={list.length} onPage={setPage} />
      )}

      {selected && <UserModal user={selected} onClose={() => setSelected(null)} />}
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

function UserModal({ user, onClose }) {
  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="surface-soft max-w-md w-full p-8 elev-3">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="pixel-label text-dex mb-2">User Detail</div>
            <h2 className="font-display text-2xl font-bold text-ink">회원 상세</h2>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink">
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6 p-4 bg-bone-2 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center text-xl font-bold">
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-display text-lg font-bold text-ink">{user.name}</div>
            <div className="text-xs text-mute mt-0.5">{user.email}</div>
            <div className="mt-1.5">
              {user.user_type === 'admin' ? (
                <span className="text-[10px] font-bold bg-dex/10 text-dex border border-dex/30 px-2 py-1 rounded-full">ADMIN</span>
              ) : (
                <span className="text-[10px] font-bold bg-blue-50 text-blue border border-blue/30 px-2 py-1 rounded-full">CUSTOMER</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <KV k="이름" v={user.name} />
          <KV k="이메일" v={user.email} />
          <KV k="연락처" v={user.phone || '—'} />
          <KV k="가입일" v={user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '—'} />
          <KV k="위시리스트" v={`${user.wishlist?.length || 0}개`} />
        </div>

        <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-line">
          <Button variant="ghost" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, led }) {
  return (
    <div className="surface-soft p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={`led led-${led}`} style={{ width: 6, height: 6 }} />
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">{label}</div>
      </div>
      <div className="font-display text-3xl font-bold text-ink tabular-nums">{value}</div>
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div className="flex justify-between py-2 border-b border-line last:border-0">
      <span className="text-mute font-bold">{k}</span>
      <span className="font-mono font-bold text-ink">{v}</span>
    </div>
  )
}
