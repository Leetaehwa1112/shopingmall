import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '@/api/axios'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'
import Icon from '@/components/common/Icon'
import { PageHeader, StatusPill, EmptyState, ErrorState, logAudit } from '@/components/admin/ui'

/**
 * 경매 검수 인박스 (Inbox-mode review)
 * ─────────────────────────────────────────────────────────────
 * 일반 테이블이 아니라 "이메일 인박스"처럼 동작:
 *  - 좌측: 검수 대기 큐 (현재 선택은 강조)
 *  - 우측: 카드 풀뷰 (이미지 + 정보 + 신청자 신뢰도 + 동일 카드 시세)
 *  - 하단: 키보드 단축키 안내 + 빠른 액션 바
 *
 * Frictionless features:
 *  - J/K: 이전/다음, A: 승인, R: 거절, S: 보류, /: 검색
 *  - 거절 사유 6종 칩 (한 클릭 → 자동 입력 + 거절)
 *  - 메모 자동 저장 (localStorage draft, 30s debounce)
 *  - 액션 후 자동으로 다음 항목 진행 (스크롤 유지)
 *  - 신청자 이전 승인률, 동일 카드 진행 중 경매 표시
 */

const REJECT_REASONS = [
  { id: 'image',    label: '이미지 불선명 — 재업로드 필요' },
  { id: 'cert',     label: '등급 인증서 번호 확인 불가' },
  { id: 'price',    label: '시작가 시세 대비 과도하게 낮음/높음' },
  { id: 'dup',      label: '동일 카드 진행 중 경매 존재' },
  { id: 'auth',     label: '본인 인증 정보 부족' },
  { id: 'forgery',  label: '위조 의심 — 추가 검증 필요' },
]

const COUNTRY_FLAG = { USA: '🇺🇸', JPN: '🇯🇵', KOR: '🇰🇷' }
const DRAFT_KEY = 'vault-admin-auction-drafts'

export default function AdminAuctionReview() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const toast = useToastStore((s) => s.push)

  const [queue, setQueue] = useState([])           // pending only
  const [allAuctions, setAllAuctions] = useState([]) // for trust score + comparables
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const noteRef = useRef(null)
  const queueRef = useRef(null)

  const load = useCallback(() => {
    setLoading(true); setError(false)
    Promise.all([
      api.get('/auctions', { params: { status: 'pending' } }),
      api.get('/auctions'),
    ])
      .then(([p, all]) => {
        setQueue(p.data.data || [])
        setAllAuctions(all.data.data || [])
        setActiveIdx(0)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // ─── derived: filtered queue + active item ────────────────
  const visible = useMemo(() => {
    if (!search.trim()) return queue
    const q = search.toLowerCase()
    return queue.filter((it) =>
      (it.name || '').toLowerCase().includes(q) ||
      (it.nameKo || '').toLowerCase().includes(q) ||
      (it.user?.name || '').toLowerCase().includes(q) ||
      (it.user?.email || '').toLowerCase().includes(q) ||
      (it.gradeCompany || '').toLowerCase().includes(q)
    )
  }, [queue, search])

  const active = visible[activeIdx] || null

  // ─── load draft on active change ──────────────────────────
  useEffect(() => {
    if (!active) { setNote(''); return }
    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
      setNote(drafts[active._id] || active.adminNote || '')
    } catch { setNote(active.adminNote || '') }
  }, [active?._id])

  // ─── draft autosave (debounced) ───────────────────────────
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => {
      try {
        const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
        if (note.trim()) drafts[active._id] = note
        else delete drafts[active._id]
        localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
      } catch {}
    }, 400)
    return () => clearTimeout(t)
  }, [note, active?._id])

  // ─── trust score for current submitter ────────────────────
  const trust = useMemo(() => {
    if (!active) return null
    const userId = active.user?._id || active.user
    const mine = allAuctions.filter((a) => (a.user?._id || a.user) === userId && a._id !== active._id)
    const approved = mine.filter((a) => a.status === 'approved' || a.status === 'live' || a.status === 'ended').length
    const rejected = mine.filter((a) => a.status === 'rejected').length
    const total = approved + rejected
    return {
      total: mine.length,
      approved, rejected,
      rate: total > 0 ? Math.round((approved / total) * 100) : null,
    }
  }, [active, allAuctions])

  // ─── comparable live auctions (same card name) ────────────
  const comparables = useMemo(() => {
    if (!active) return []
    const key = (active.name || '').toLowerCase().slice(0, 10)
    if (!key) return []
    return allAuctions
      .filter((a) => a._id !== active._id && (a.status === 'live' || a.status === 'ended'))
      .filter((a) => (a.name || '').toLowerCase().includes(key))
      .slice(0, 4)
  }, [active, allAuctions])

  // ─── actions ──────────────────────────────────────────────
  const advance = () => {
    // 큐에서 현재 항목 제거 후 다음으로 (idx 유지)
    setQueue((q) => q.filter((it) => it._id !== active._id))
    // visible은 useMemo로 재계산되므로 idx는 동일하면 자동으로 다음 항목
  }

  const clearDraft = (id) => {
    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')
      delete drafts[id]
      localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts))
    } catch {}
  }

  const doApprove = useCallback(async () => {
    if (!active || busy) return
    setBusy(true)
    try {
      await api.patch(`/auctions/${active._id}/status`, { status: 'approved', adminNote: note })
      logAudit({ actor: user?.name, action: 'auction.approve', entity: 'auction', entityId: active._id, summary: `${active.nameKo || active.name}${note ? ` · ${note}` : ''}` })
      toast({ type: 'success', title: '승인 완료', message: active.nameKo || active.name })
      clearDraft(active._id)
      advance()
    } catch {
      toast({ type: 'error', title: '승인 실패', message: '다시 시도해주세요' })
    } finally { setBusy(false) }
  }, [active, busy, note, user, toast])

  const doReject = useCallback(async (reasonText) => {
    if (!active || busy) return
    const finalNote = (reasonText || note || '').trim()
    if (!finalNote) {
      toast({ type: 'warning', title: '거절 사유 필요', message: '사유 칩을 선택하거나 메모를 입력하세요' })
      noteRef.current?.focus()
      return
    }
    setBusy(true)
    try {
      await api.patch(`/auctions/${active._id}/status`, { status: 'rejected', adminNote: finalNote })
      logAudit({ actor: user?.name, action: 'auction.reject', entity: 'auction', entityId: active._id, summary: `${active.nameKo || active.name} · ${finalNote}` })
      toast({ type: 'success', title: '거절 처리', message: active.nameKo || active.name })
      clearDraft(active._id)
      advance()
    } catch {
      toast({ type: 'error', title: '거절 실패', message: '다시 시도해주세요' })
    } finally { setBusy(false) }
  }, [active, busy, note, user, toast])

  const doSkip = useCallback(() => {
    if (!active) return
    // 보류: 큐 끝으로 이동 (UX: 잠깐 미뤘다가 끝에 다시 마주침)
    setQueue((q) => {
      const rest = q.filter((it) => it._id !== active._id)
      return [...rest, active]
    })
    toast({ type: 'info', title: '보류', message: '큐 끝으로 이동했어요' })
  }, [active, toast])

  const moveActive = useCallback((dir) => {
    setActiveIdx((i) => {
      const next = i + dir
      if (next < 0) return 0
      if (next >= visible.length) return visible.length - 1
      // 부드러운 스크롤
      setTimeout(() => {
        queueRef.current?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }, 0)
      return next
    })
  }, [visible.length])

  // ─── keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const isTyping = () => {
      const t = document.activeElement?.tagName
      return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'
    }
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTyping() && e.key !== 'Escape') return
      switch (e.key) {
        case 'j': case 'ArrowDown': e.preventDefault(); moveActive(1); break
        case 'k': case 'ArrowUp':   e.preventDefault(); moveActive(-1); break
        case 'a': case 'A': e.preventDefault(); doApprove(); break
        case 'r': case 'R': e.preventDefault(); noteRef.current?.focus(); break
        case 's': case 'S': e.preventDefault(); doSkip(); break
        case '/': e.preventDefault(); document.getElementById('inbox-search')?.focus(); break
        case 'Escape': if (isTyping()) document.activeElement.blur(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moveActive, doApprove, doSkip])

  // adjust activeIdx if it overflows after queue mutation
  useEffect(() => {
    if (activeIdx >= visible.length && visible.length > 0) setActiveIdx(visible.length - 1)
  }, [visible.length, activeIdx])

  return (
    <div className="space-y-4 max-w-[1500px]">
      <PageHeader
        kicker="REVIEW INBOX · 검수 인박스"
        ledTone="red"
        title="경매 검수"
        subtitle={`처리 대기 ${visible.length}건${queue.length !== visible.length ? ` / 전체 ${queue.length}건` : ''}`}
        breadcrumb={['Admin', '거래', '경매 관리', '검수 인박스']}
        actions={
          <>
            <Link to="/admin/auctions" className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-gray-900/15 bg-paper hover:bg-bone-2">
              <Icon name="arrow" size={12} strokeWidth={2.2} /> 전체 목록
            </Link>
            <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-mute hover:text-ink px-3 py-1.5 rounded-md border border-gray-900/15 bg-paper hover:bg-bone-2">
              새로고침
            </button>
          </>
        }
      />

      {/* Inbox shell: 2-column */}
      <div className="grid grid-cols-[340px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[640px]">
        {/* ── Left: queue ─────────────────────────────────── */}
        <aside className="bg-paper border border-gray-900/15 rounded-xl overflow-hidden flex flex-col">
          <div className="p-2.5 border-b border-gray-900/10 bg-bone-2/40">
            <div className="relative">
              <Icon name="search" size={12} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
              <input
                id="inbox-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="큐 검색 ( / )"
                className="w-full bg-paper border border-gray-900/15 rounded-md pl-7 pr-2 py-1.5 text-xs text-ink placeholder:text-mute focus:border-gray-900 outline-none"
              />
            </div>
          </div>
          <div ref={queueRef} className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-mute font-bold">로딩 중...</div>
            ) : error ? (
              <ErrorState onRetry={load} />
            ) : visible.length === 0 ? (
              <EmptyState icon="trophy" title="검수 대기가 없어요" desc="모든 경매 신청이 처리되었습니다." action={
                <Link to="/admin" className="text-xs font-bold text-mute hover:text-ink underline">대시보드로</Link>
              } />
            ) : (
              visible.map((it, idx) => {
                const isActive = idx === activeIdx
                return (
                  <button
                    key={it._id}
                    data-idx={idx}
                    onClick={() => setActiveIdx(idx)}
                    className={`w-full text-left p-3 border-b border-gray-900/8 transition-colors ${
                      isActive ? 'bg-electric/15 border-l-[3px] border-l-ink' : 'hover:bg-bone-2/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="led led-yellow led-pulse" style={{ width: 5, height: 5 }} />
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">대기</span>
                      <span className="ml-auto text-[10px] text-mute font-mono">
                        {new Date(it.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-ink truncate leading-snug">
                      {it.nameKo || it.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-mute">
                      {it.cardCountry && <span>{COUNTRY_FLAG[it.cardCountry]}</span>}
                      <span className="font-mono font-bold">{it.gradeCompany} {it.gradeScore}</span>
                      <span className="text-mute/50">·</span>
                      <span className="truncate">{it.user?.name}</span>
                    </div>
                    <div className="mt-1 text-[11px] font-mono font-bold text-ink tabular-nums">
                      ₩{it.startPrice?.toLocaleString()}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {/* ── Right: detail ────────────────────────────────── */}
        <main className="bg-paper border border-gray-900/15 rounded-xl overflow-hidden flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center p-10">
              <EmptyState
                icon="trophy"
                title={loading ? '큐 로딩 중' : '처리할 항목이 없어요'}
                desc={loading ? '' : '왼쪽 큐에서 항목을 선택하세요.'}
              />
            </div>
          ) : (
            <>
              <DetailBody
                item={active}
                trust={trust}
                comparables={comparables}
                note={note}
                onNoteChange={setNote}
                noteRef={noteRef}
              />
              <ActionBar
                onApprove={doApprove}
                onReject={doReject}
                onSkip={doSkip}
                onReasonClick={(label) => { setNote(label); doReject(label) }}
                busy={busy}
                rejectReady={!!note.trim()}
              />
            </>
          )}
        </main>
      </div>

      {/* Keyboard hint */}
      <KbdHint />
    </div>
  )
}

/* ─── Detail body ─────────────────────────────────────────── */
function DetailBody({ item, trust, comparables, note, onNoteChange, noteRef }) {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      {/* Top: title + status */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusPill tone="amber" led="yellow">검수 대기</StatusPill>
            <span className="text-[11px] text-mute font-mono">
              신청 {new Date(item.createdAt).toLocaleString('ko-KR')}
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-ink leading-tight">{item.nameKo || item.name}</h2>
          {item.nameKo && <div className="text-xs text-mute italic mt-0.5">{item.name}</div>}
        </div>
      </div>

      {/* Card visual + key facts grid */}
      <div className="grid grid-cols-[200px_1fr] gap-4 mb-5">
        <div className="bg-bone-2/40 border border-gray-900/10 rounded-lg overflow-hidden aspect-[3/4] flex items-center justify-center">
          {item.images?.[0] ? (
            <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div className="text-center p-4">
              <Icon name="package" size={32} className="text-mute/50 mx-auto mb-2" />
              <div className="text-[10px] text-mute font-bold">이미지 없음</div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {/* Submitter trust */}
          <div className="bg-bone-2/40 border border-gray-900/10 rounded-lg p-3">
            <div className="text-[10px] font-bold text-mute uppercase tracking-[0.14em] mb-2">신청자 신뢰도</div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">
                {item.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-ink truncate">{item.user?.name}</div>
                <div className="text-[10px] text-mute font-mono truncate">{item.user?.email}</div>
              </div>
              {trust && (
                <div className="text-right flex-shrink-0">
                  {trust.rate != null ? (
                    <div className={`font-display text-lg font-bold tabular-nums leading-none ${
                      trust.rate >= 80 ? 'text-emerald-600' : trust.rate >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>{trust.rate}%</div>
                  ) : (
                    <div className="font-display text-sm font-bold text-mute leading-none">신규</div>
                  )}
                  <div className="text-[10px] text-mute font-bold mt-0.5">
                    {trust.approved}승인 · {trust.rejected}거절
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sale conditions — quick scan */}
          <div className="grid grid-cols-3 gap-2">
            <Fact label="유형" value={item.saleType === 'auction' ? '경매' : '즉시 구매'} />
            <Fact label="시작가" value={`₩${item.startPrice?.toLocaleString()}`} mono />
            <Fact label="최소호가" value={`₩${item.minIncrement?.toLocaleString()}`} mono />
            {item.buyNowPrice && <Fact label="즉시낙찰" value={`₩${item.buyNowPrice.toLocaleString()}`} mono />}
            <Fact label="등급" value={`${item.gradeCompany} ${item.gradeScore}`} mono />
            {item.gradeCert && <Fact label="인증서" value={`#${item.gradeCert}`} mono />}
          </div>
        </div>
      </div>

      {/* Card meta */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {item.set && <Fact label="세트" value={item.set} />}
        {item.year && <Fact label="발매년도" value={item.year} mono />}
        {item.number && <Fact label="카드번호" value={item.number} mono />}
        {item.cardCountry && <Fact label="언어판" value={`${COUNTRY_FLAG[item.cardCountry]} ${item.cardCountry}`} />}
        {item.endsAt && <Fact label="종료 예정" value={new Date(item.endsAt).toLocaleString('ko-KR')} />}
      </div>

      {item.description && (
        <div className="mb-5">
          <div className="text-[10px] font-bold text-mute uppercase tracking-[0.14em] mb-1.5">신청자 설명</div>
          <p className="text-xs text-ink leading-relaxed bg-bone-2/30 border border-gray-900/8 rounded-md p-3">
            {item.description}
          </p>
        </div>
      )}

      {/* Comparable auctions */}
      {comparables.length > 0 && (
        <div className="mb-5">
          <div className="text-[10px] font-bold text-mute uppercase tracking-[0.14em] mb-2">동일/유사 카드 — 시세 참고</div>
          <div className="space-y-1.5">
            {comparables.map((c) => (
              <div key={c._id} className="flex items-center justify-between gap-2 px-3 py-2 bg-bone-2/40 border border-gray-900/8 rounded-md text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink truncate">{c.nameKo || c.name}</div>
                  <div className="text-[10px] text-mute font-mono">
                    {c.gradeCompany} {c.gradeScore} · {c.bidCount || 0} bids · {c.status}
                  </div>
                </div>
                <div className="font-mono text-xs font-bold tabular-nums text-ink flex-shrink-0">
                  ₩{(c.currentBid || c.startPrice || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin note — autosaving */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[10px] font-bold text-mute uppercase tracking-[0.14em]">어드민 메모</div>
          <span className="text-[10px] text-emerald-600 font-bold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle" />
            자동 저장
          </span>
        </div>
        <textarea
          ref={noteRef}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          placeholder="거절 사유나 검수 메모 (자동 저장됨)"
          className="w-full bg-bone-2/30 border border-gray-900/15 rounded-md px-3 py-2 text-xs text-ink placeholder:text-mute focus:border-gray-900 focus:bg-paper outline-none transition-colors resize-none"
        />
      </div>
    </div>
  )
}

function Fact({ label, value, mono }) {
  return (
    <div className="bg-bone-2/30 border border-gray-900/8 rounded-md px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-mute mb-0.5">{label}</div>
      <div className={`text-xs font-bold text-ink truncate ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</div>
    </div>
  )
}

/* ─── Action bar ─────────────────────────────────────────── */
function ActionBar({ onApprove, onReject, onSkip, onReasonClick, busy, rejectReady }) {
  return (
    <div className="border-t border-gray-900/15 bg-bone-2/30 p-3 space-y-2">
      {/* Reject reason chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-mute mr-1">빠른 거절</span>
        {REJECT_REASONS.map((r) => (
          <button
            key={r.id}
            onClick={() => onReasonClick(r.label)}
            disabled={busy}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md border border-red-200 bg-red-50/50 text-red-700 hover:bg-red-50 hover:border-red-300 disabled:opacity-40 transition-colors"
          >
            {r.label.split(' — ')[0]}
          </button>
        ))}
      </div>

      {/* Primary actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApprove}
          disabled={busy}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-paper font-bold py-2.5 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <span className="text-xs">승인</span>
          <Kbd>A</Kbd>
        </button>
        <button
          onClick={() => onReject()}
          disabled={busy}
          className={`flex-1 inline-flex items-center justify-center gap-2 font-bold py-2.5 rounded-md transition-colors disabled:opacity-50 ${
            rejectReady ? 'bg-red-600 text-paper hover:bg-red-700' : 'bg-paper border border-red-300 text-red-700 hover:bg-red-50'
          }`}
        >
          <span className="text-xs">{rejectReady ? '거절 (메모 사용)' : '거절 (사유 필요)'}</span>
          <Kbd dark={rejectReady}>R</Kbd>
        </button>
        <button
          onClick={onSkip}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-paper border border-gray-900/15 text-mute hover:text-ink hover:bg-bone-2 font-bold py-2.5 px-4 rounded-md disabled:opacity-50 transition-colors"
        >
          <span className="text-xs">보류</span>
          <Kbd>S</Kbd>
        </button>
      </div>
    </div>
  )
}

function Kbd({ children, dark }) {
  return (
    <kbd className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
      dark ? 'bg-paper/10 border-paper/20 text-paper' : 'bg-bone-2 border-gray-900/15 text-mute'
    }`}>{children}</kbd>
  )
}

function KbdHint() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 text-[10px] text-mute font-medium">
      <Hint k="J" v="다음" />
      <Hint k="K" v="이전" />
      <Hint k="A" v="승인" />
      <Hint k="R" v="거절/포커스" />
      <Hint k="S" v="보류" />
      <Hint k="/" v="검색" />
      <Hint k="Esc" v="포커스 해제" />
    </div>
  )
}

function Hint({ k, v }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border bg-paper border-gray-900/15 text-ink">{k}</kbd>
      <span>{v}</span>
    </span>
  )
}
