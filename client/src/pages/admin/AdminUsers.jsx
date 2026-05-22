import { useState, useEffect, useMemo } from 'react'
import api from '@/api/axios'
import Icon from '@/components/common/Icon'
import {
  PageHeader, StatGrid, StatCard, FilterBar, SearchInput, Select, Spacer,
  FilterChips, DataTable, Pagination, StatusPill, BulkBar, BulkButton,
  Cell, Avatar, RowActions, IconBtn, Drawer, DSection, KV, EmptyState, logAudit,
} from '@/components/admin/ui'
import SavedViewBar from '@/components/admin/SavedViewBar'
import QuickCouponModal from '@/components/admin/QuickCouponModal'
import Can, { useCanDo, missingRolesTooltip } from '@/components/admin/Can'
import { useAuditLog } from '@/hooks/useAuditLog'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function AdminUsers() {
  const { user: me } = useAuthStore()
  const toast = useToastStore((s) => s.push)
  const audit = useAuditLog()
  const canGrantCoupon = useCanDo('user.coupon_grant')

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')        // user_type
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [drawer, setDrawer] = useState(null)
  const [selected, setSelected] = useState([])
  const [segmentView, setSegmentView] = useState(null) // 'wished' | 'recent7' | null
  const [couponTarget, setCouponTarget] = useState(null) // 단일/다중 발급 대상

  const fetchUsers = () => {
    setLoading(true)
    api.get('/users', { params: { limit: 500 } })
      .then(({ data }) => setUsers(data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }
  useEffect(fetchUsers, [])

  useEffect(() => { setPage(1); setSelected([]) }, [filter, search, segmentView])

  const filtered = useMemo(() => {
    let rows = users.slice()
    if (filter !== 'all') rows = rows.filter((u) => u.user_type === filter)
    if (segmentView === 'wished') rows = rows.filter((u) => (u.wishlist?.length || 0) > 0)
    if (segmentView === 'recent7') {
      const cutoff = Date.now() - 7 * 86_400_000
      rows = rows.filter((u) => new Date(u.createdAt).getTime() >= cutoff)
    }
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
        wishlist: u.wishlist?.length || 0,
      }[sort.key])
      const av = get(a), bv = get(b)
      if (av < bv) return -1 * dir
      if (av > bv) return  1 * dir
      return 0
    })
    return rows
  }, [users, filter, segmentView, search, sort])

  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  const kpis = useMemo(() => {
    const today = new Date().toDateString()
    const cutoff7 = Date.now() - 7 * 86_400_000
    return {
      total: users.length,
      customer: users.filter((u) => u.user_type === 'customer').length,
      admin: users.filter((u) => u.user_type === 'admin').length,
      todayNew: users.filter((u) => u.createdAt && new Date(u.createdAt).toDateString() === today).length,
      recent7: users.filter((u) => new Date(u.createdAt).getTime() >= cutoff7).length,
      wishlistOwners: users.filter((u) => (u.wishlist?.length || 0) > 0).length,
    }
  }, [users])

  const handleSort = (key) =>
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' })

  // 시스템 saved views — 현재 데이터로 가능한 세그먼트
  // (VIP/휴면/클레임은 백엔드가 lastActiveAt, totalSpent, claimCount 필드 추가하면 활성화)
  const systemViews = useMemo(() => [
    {
      id: 'recent7', label: '최근 7일 신규', tone: 'emerald',
      count: kpis.recent7,
      apply: () => { setSegmentView('recent7'); setFilter('all') },
    },
    {
      id: 'wished', label: '위시리스트 보유', tone: 'violet',
      count: kpis.wishlistOwners,
      apply: () => { setSegmentView('wished'); setFilter('all') },
    },
    {
      id: 'admin', label: '관리자', tone: 'red',
      count: kpis.admin,
      apply: () => { setSegmentView(null); setFilter('admin') },
    },
  ], [kpis])

  const activeViewId = useMemo(() => {
    if (segmentView === 'recent7') return 'recent7'
    if (segmentView === 'wished') return 'wished'
    if (filter === 'admin') return 'admin'
    return null
  }, [segmentView, filter])

  const clearView = () => { setSegmentView(null); setFilter('all'); setSearch('') }

  // 쿠폰 발급 — 백엔드 엔드포인트 없으면 audit만 남기고 시뮬레이션 OK 처리
  const handleGrantCoupon = async ({ recipients, templateId, amount, days, reason, notify }) => {
    let ok = 0, fail = 0
    for (const userId of recipients) {
      try {
        await api.post('/admin/coupons/grant', { userId, templateId, amount, days, notify })
        ok++
      } catch {
        // 백엔드 미구현이어도 운영 흐름은 진행
        fail++
      }
    }
    audit.record({
      entity: 'user', entityId: recipients.length === 1 ? recipients[0] : `${recipients.length}건`,
      action: 'coupon_grant',
      after: { templateId, amount, days, notify, count: recipients.length },
      reason,
    })
    logAudit({
      actor: me?.name, action: 'user.coupon_grant', entity: 'user',
      entityId: `${recipients.length}명`,
      summary: `${templateId} · ${amount.toLocaleString()}원 · ${days}일 · ${reason}`,
    })
    if (fail === recipients.length) {
      // 모두 실패해도 audit은 기록됨. 백엔드 미구현일 가능성을 안내.
      toast({ type: 'warning', title: '백엔드 응답 없음',
        message: '쿠폰 API 미구현 — audit log에만 기록됨' })
    } else if (fail > 0) {
      toast({ type: 'warning', title: '부분 발급', message: `성공 ${ok} · 실패 ${fail}` })
    } else {
      toast({ type: 'success', title: '쿠폰 발급 완료',
        message: `${ok}명에게 ${(amount * ok).toLocaleString()}원 가치 발급` })
    }
    setSelected([])
    setCouponTarget(null)
  }

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

      {/* 시스템 세그먼트 — 1클릭 점프 */}
      <SavedViewBar views={systemViews} activeId={activeViewId} onClearView={clearView} />

      {/* Bulk: 선택 회원에게 캠페인 쿠폰 일괄 발급 */}
      <BulkBar
        count={selected.length}
        onClear={() => setSelected([])}
        actions={
          <Can action="user.coupon_grant" disable>
            {(allowed) => (
              <BulkButton
                tone="success"
                onClick={() => {
                  const targets = users.filter((u) => selected.includes(u._id))
                  setCouponTarget(targets)
                }}
                disabled={!allowed}
                title={allowed ? `${selected.length}명에게 쿠폰 일괄 발급` : missingRolesTooltip('user.coupon_grant')}
              >
                쿠폰 일괄 발급
              </BulkButton>
            )}
          </Can>
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
              {canGrantCoupon && (
                <IconBtn
                  icon="star"
                  label="쿠폰 발급"
                  onClick={(e) => { e.stopPropagation?.(); setCouponTarget([u]) }}
                />
              )}
              <IconBtn icon="arrow" label="상세" onClick={() => setDrawer(u)} />
            </RowActions>
          },
        ]}
      />

      <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />

      {drawer && (
        <UserDrawer
          user={drawer}
          onClose={() => setDrawer(null)}
          onGrantCoupon={canGrantCoupon ? () => setCouponTarget([drawer]) : null}
        />
      )}

      {couponTarget && (
        <QuickCouponModal
          recipients={couponTarget}
          onClose={() => setCouponTarget(null)}
          onConfirm={handleGrantCoupon}
        />
      )}
    </div>
  )
}

function UserDrawer({ user, onClose, onGrantCoupon }) {
  return (
    <Drawer
      open
      onClose={onClose}
      title={user.name}
      subtitle={user.email}
      width={480}
      footer={
        <div className="flex items-center gap-2 w-full">
          {onGrantCoupon && (
            <button
              onClick={onGrantCoupon}
              className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 inline-flex items-center gap-1.5"
            >
              <Icon name="star" size={11} strokeWidth={2.4} />
              쿠폰 발급
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md hover:bg-bone-2">닫기</button>
        </div>
      }
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
