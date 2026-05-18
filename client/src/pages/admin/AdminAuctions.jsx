import { useState, useEffect } from 'react'
import api from '@/api/axios'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import useToastStore from '@/store/toastStore'

const COUNTRY_FLAG = { USA: '🇺🇸', JPN: '🇯🇵', KOR: '🇰🇷' }

const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'pending', label: '검토 대기' },
  { value: 'approved', label: '승인됨' },
  { value: 'live', label: '진행 중' },
  { value: 'ended', label: '종료' },
  { value: 'rejected', label: '거절됨' },
]

const STATUS_STYLE = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-blue-50 text-blue-700 border-blue-200',
  live:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  ended:    'bg-bone-2 text-mute border-line',
  rejected: 'bg-red-50 text-red-700 border-red-200',
}
const STATUS_LABEL = {
  pending: '검토 대기', approved: '승인됨', live: '진행 중', ended: '종료', rejected: '거절됨',
}

const PAGE_SIZE = 8

export default function AdminAuctions() {
  const toast = useToastStore((s) => s.push)
  const [tab, setTab] = useState('')
  const [list, setList] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)

  const fetchList = async (status = '') => {
    setLoading(true)
    try {
      const params = status ? { status } : {}
      const { data } = await api.get('/auctions', { params })
      setList(data.data)
      setTotal(data.total)
    } catch {
      toast({ type: 'error', title: '불러오기 실패', message: '경매 목록을 가져오지 못했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchList(tab); setPage(1) }, [tab])

  const handleStatusChange = async (id, status, adminNote) => {
    try {
      await api.patch(`/auctions/${id}/status`, { status, adminNote })
      toast({ type: 'success', title: '상태 변경 완료', message: `${STATUS_LABEL[status]}(으)로 변경됐습니다.` })
      setSelected(null)
      fetchList(tab)
    } catch {
      toast({ type: 'error', title: '변경 실패', message: '상태 변경에 실패했습니다.' })
    }
  }

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const paged = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="pixel-label text-mute mb-3">Auctions</div>
          <h1 className="font-display text-4xl font-bold text-ink tracking-tight">경매 관리</h1>
        </div>
        <div className="text-sm text-mute font-bold">총 <span className="text-ink">{total}</span>건</div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(({ value, label }) => (
          <button key={value} onClick={() => setTab(value)}
            className={`px-4 py-2 text-sm font-bold rounded-full border transition-all ${
              tab === value ? 'bg-ink text-paper border-ink' : 'bg-paper border-line text-ink hover:border-ink/30'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="surface-soft overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-mute text-sm font-bold">불러오는 중...</div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-mute text-sm font-bold">해당 건이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bone-2/50 border-b border-line">
              <tr className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">
                <th className="text-left p-4">신청자</th>
                <th className="text-left p-4">카드</th>
                <th className="text-left p-4">등급</th>
                <th className="text-left p-4">유형</th>
                <th className="text-right p-4">시작가</th>
                <th className="text-left p-4">상태</th>
                <th className="text-left p-4">신청일</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((item) => (
                <tr key={item._id} className="border-b border-line last:border-0 hover:bg-bone-2/30">
                  <td className="p-4">
                    <div className="font-bold text-ink">{item.user?.name}</div>
                    <div className="text-xs text-mute">{item.user?.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-ink">{item.nameKo || item.name}</div>
                    {item.nameKo && <div className="text-xs text-mute italic">{item.name}</div>}
                    {item.set && <div className="text-xs text-mute">{item.set} {item.year && `· ${item.year}`}</div>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      {item.cardCountry && <span className="text-lg">{COUNTRY_FLAG[item.cardCountry]}</span>}
                      <span className="font-mono font-bold text-ink">{item.gradeCompany} {item.gradeScore}</span>
                    </div>
                    {item.gradeCert && <div className="text-xs text-mute">#{item.gradeCert}</div>}
                  </td>
                  <td className="p-4">
                    {item.saleType === 'auction' ? (
                      <span className="text-[10px] font-bold bg-dex/10 text-dex border border-dex/30 px-2 py-1 rounded-full tracking-wider inline-flex items-center gap-1.5">
                        <span className="led led-red led-pulse" style={{ width: 5, height: 5 }} /> AUCTION
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue border border-blue/30 px-2 py-1 rounded-full tracking-wider">BUY NOW</span>
                    )}
                  </td>
                  <td className="p-4 text-right font-mono font-bold tabular-nums">
                    ₩{item.startPrice?.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold border px-2 py-1 rounded-full ${STATUS_STYLE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-mute whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="p-4">
                    <button onClick={() => setSelected(item)}
                      className="text-xs text-ink hover:text-dex font-bold whitespace-nowrap">
                      상세 →
                    </button>
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

      {selected && (
        <DetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
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

function DetailModal({ item, onClose, onStatusChange }) {
  const [note, setNote] = useState(item.adminNote || '')

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="surface-soft max-w-2xl w-full p-8 elev-3 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="pixel-label text-dex mb-2">Auction Detail</div>
            <h2 className="font-display text-2xl font-bold text-ink">{item.nameKo || item.name}</h2>
            {item.nameKo && <div className="text-sm text-mute italic">{item.name}</div>}
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink">
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-5">
          <Section title="신청자">
            <Row k="이름" v={item.user?.name} />
            <Row k="이메일" v={item.user?.email} />
            {item.user?.phone && <Row k="연락처" v={item.user.phone} />}
          </Section>

          <Section title="카드 정보">
            <Row k="카드명 (영문)" v={item.name} />
            {item.nameKo && <Row k="카드명 (한글)" v={item.nameKo} />}
            {item.set && <Row k="세트" v={item.set} />}
            {item.year && <Row k="발매년도" v={item.year} />}
            {item.number && <Row k="카드 번호" v={item.number} />}
          </Section>

          <Section title="등급">
            <Row k="언어판" v={item.cardCountry ? `${COUNTRY_FLAG[item.cardCountry]} ${item.cardCountry}` : '-'} />
            <Row k="등급사" v={item.gradeCompany} />
            <Row k="점수" v={item.gradeScore} />
            {item.gradeCert && <Row k="인증서 번호" v={`#${item.gradeCert}`} />}
          </Section>

          <Section title="판매 조건">
            <Row k="유형" v={item.saleType === 'auction' ? '경매' : '즉시 구매'} />
            <Row k="시작가" v={`₩${item.startPrice?.toLocaleString()}`} />
            {item.buyNowPrice && <Row k="즉시 낙찰가" v={`₩${item.buyNowPrice?.toLocaleString()}`} />}
            {item.endsAt && <Row k="종료 예정" v={new Date(item.endsAt).toLocaleString('ko-KR')} />}
            <Row k="최소 호가" v={`₩${item.minIncrement?.toLocaleString()}`} />
          </Section>

          {(item.status === 'live') && (
            <Section title="입찰 현황">
              <Row k="현재 최고가" v={item.currentBid ? `₩${item.currentBid.toLocaleString()}` : '없음'} />
              <Row k="입찰 수" v={`${item.bidCount}회`} />
            </Section>
          )}

          <div>
            <div className="font-display font-bold text-ink mb-2">어드민 메모</div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="검수 메모, 거절 사유 등"
              className="w-full bg-bone-2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:border-ink outline-none transition-colors" />
          </div>

          <div>
            <div className="font-display font-bold text-ink mb-3">상태 변경</div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'approved', label: '승인', style: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
                { value: 'live', label: '경매 시작', style: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50' },
                { value: 'ended', label: '종료 처리', style: 'border-line text-mute hover:bg-bone-2' },
                { value: 'rejected', label: '거절', style: 'border-red-300 text-red-700 hover:bg-red-50' },
              ].filter(({ value }) => value !== item.status).map(({ value, label, style }) => (
                <button key={value}
                  onClick={() => onStatusChange(item._id, value, note)}
                  className={`px-4 py-2 text-xs font-bold border rounded-lg transition-colors ${style}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-line">
          <Button variant="ghost" onClick={onClose}>닫기</Button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="font-display font-bold text-ink mb-2">{title}</div>
      <div className="space-y-0">{children}</div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between py-2 border-b border-line text-sm">
      <span className="text-mute font-bold">{k}</span>
      <span className="font-bold text-ink">{v}</span>
    </div>
  )
}
