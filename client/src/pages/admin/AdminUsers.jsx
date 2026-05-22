import { useState, useEffect, useMemo } from 'react'
import api from '@/api/axios'
import Icon from '@/components/common/Icon'
import {
  PageHeader, StatGrid, StatCard, FilterBar, SearchInput, Select, Spacer,
  FilterChips, DataTable, Pagination, StatusPill,
  Cell, Avatar, RowActions, IconBtn, Drawer, DSection, KV, EmptyState,
} from '@/components/admin/ui'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')        // user_type
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [drawer, setDrawer] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.get('/users', { params: { limit: 500 } })
      .then(({ data }) => setUsers(data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { setPage(1) }, [filter, search])

  const filtered = useMemo(() => {
    let rows = users.slice()
    if (filter !== 'all') rows = rows.filter((u) => u.user_type === filter)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter((u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q)
      )
    }
    rows.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const get = (u) => ({
        name: u.name || '',
        email: u.email || '',
        createdAt: new Date(u.createdAt || 0).getTime(),
        user_type: u.user_type || '',
      }[sort.key])
      const av = get(a), bv = get(b)
      if (av < bv) return -1 * dir
      if (av > bv) return  1 * dir
      return 0
    })
    return rows
  }, [users, filter, search, sort])

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const kpis = useMemo(() => {
    const today = new Date().toDateString()
    return {
      total: users.length,
      customer: users.filter((u) => u.user_type === 'customer').length,
      admin: users.filter((u) => u.user_type === 'admin').length,
      todayNew: users.filter((u) => u.createdAt && new Date(u.createdAt).toDateString() === today).length,
    }
  }, [users])

  const handleSort = (key) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  return (
    <div className="space-y-4 max-w-[1400px]">
      <PageHeader
        kicker="USERS · 회원"
        ledTone="blue"
        title="고객 관리"
        subtitle={`등록 회원 ${users.length.toLocaleString()}명`}
        breadcrumb={['Admin', '회원', '고객 관리']}
      />

      <StatGrid cols={4}>
        <StatCard label="전체 회원" value={kpis.total.toLocaleString()} sub="등록 누적" icon="shield" />
        <StatCard label="일반 회원" value={kpis.customer.toLocaleString()} sub="CUSTOMER" icon="cart" tone="blue" />
        <StatCard label="관리자" value={kpis.admin} sub="ADMIN" icon="lock" tone="red" />
        <StatCard label="오늘 신규" value={kpis.todayNew} sub="가입" icon="trophy" tone="emerald" />
      </StatGrid>

      <FilterBar>
        <SearchInput value={search} onSubmit={setSearch} placeholder="이름 / 이메일 / 연락처 검색" width={280} />
        <Spacer />
        <Select label="페이지당" value={pageSize} onChange={(v) => setPageSize(Number(v))}
          options={PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: `${n}건` }))} />
      </FilterBar>

      <FilterChips value={filter} onChange={setFilter} options={[
        { value: 'all', label: '전체', count: kpis.total },
        { value: 'customer', label: '일반', led: 'blue', count: kpis.customer },
        { value: 'admin', label: '관리자', led: 'red', count: kpis.admin },
      ]} />

      <DataTable
        density="compact"
        loading={loading}
        rows={paged}
        rowKey={(r) => r._id}
        sort={sort}
        onSort={handleSort}
        onRowClick={(r) => setDrawer(r)}
        empty={<EmptyState icon="shield" title="회원이 없습니다" />}
        columns={[
          { key: 'name', label: '이름', sortable: true, render: (u) =>
            <div className="flex items-center gap-2">
              <Avatar name={u.name} size={26} />
              <Cell primary={u.name} secondary={u.user_type === 'admin' ? '관리자' : '일반 회원'} />
            </div>
          },
          { key: 'email', label: '이메일', sortable: true, render: (u) =>
            <span className="font-mono text-[11px] text-mute">{u.email}</span>
          },
          { key: 'phone', label: '연락처', render: (u) =>
            <span className="text-[11px] text-mute">{u.phone || '—'}</span>
          },
          { key: 'user_type', label: '권한', align: 'center', sortable: true, render: (u) =>
            u.user_type === 'admin'
              ? <StatusPill tone="red">ADMIN</StatusPill>
              : <StatusPill tone="blue">CUSTOMER</StatusPill>
          },
          { key: 'wishlist', label: '위시', align: 'center', render: (u) =>
            <span className="font-mono text-[11px] text-mute tabular-nums">{u.wishlist?.length || 0}</span>
          },
          { key: 'createdAt', label: '가입일', sortable: true, render: (u) =>
            <span className="font-mono text-[11px] text-mute">
              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ko-KR') : '—'}
            </span>
          },
          { key: 'actions', label: '', align: 'right', render: (u) =>
            <RowActions>
              <IconBtn icon="arrow" label="상세" onClick={() => setDrawer(u)} />
            </RowActions>
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />

      {drawer && <UserDrawer user={drawer} onClose={() => setDrawer(null)} />}
    </div>
  )
}

function UserDrawer({ user, onClose }) {
  return (
    <Drawer
      open
      onClose={onClose}
      title={user.name}
      subtitle={user.email}
      width={480}
      footer={<button onClick={onClose} className="text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md hover:bg-bone-2">닫기</button>}
    >
      <div className="flex items-center gap-3 mb-5 p-3 bg-bone-2/40 rounded-lg border border-ink/10">
        <Avatar name={user.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-bold text-ink">{user.name}</div>
          <div className="text-[11px] text-mute font-mono mt-0.5">{user.email}</div>
          <div className="mt-1">
            {user.user_type === 'admin'
              ? <StatusPill tone="red">ADMIN</StatusPill>
              : <StatusPill tone="blue">CUSTOMER</StatusPill>}
          </div>
        </div>
      </div>

      <DSection title="기본 정보">
        <KV k="이름" v={user.name} />
        <KV k="이메일" v={user.email} mono />
        <KV k="연락처" v={user.phone || '—'} />
        <KV k="가입일" v={user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '—'} mono />
      </DSection>

      <DSection title="활동">
        <KV k="위시리스트" v={`${user.wishlist?.length || 0}개`} mono />
      </DSection>
    </Drawer>
  )
}
