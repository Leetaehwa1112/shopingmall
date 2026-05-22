/**
 * TrackOrderPage — 비회원 주문 추적.
 *
 * URL: /track/:orderNumber
 *
 * 동작
 *   주문번호로 진입 (이메일에서 받은 링크 또는 검색).
 *   비회원 보안: 주문번호 + 전화번호 뒷4자리 매칭으로 본인 인증 (서버가 검증).
 *   인증 후 CustomerOrderTracking 컴포넌트로 친절한 추적 UI 노출.
 *
 *   본인 인증이 미구현 백엔드이면 일단 주문번호만으로 fetch — 점진적 보강.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '@/api/axios'
import CustomerOrderTracking from '@/components/common/CustomerOrderTracking'
import Sparkles from '@/components/common/Sparkles'
import Icon from '@/components/common/Icon'

export default function TrackOrderPage() {
  const { orderNumber } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [phoneLast4, setPhoneLast4] = useState('')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (!orderNumber) {
      setError('주문번호가 없어요.')
      setLoading(false)
      return
    }
    // 1차 fetch — 인증 없이 시도 (백엔드 정책 따라 다를 수 있음)
    setLoading(true)
    api.get(`/orders/track/${encodeURIComponent(orderNumber)}`)
      .then(({ data }) => {
        setOrder(data.data || data)
        setVerified(true)
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          // 본인 인증 필요
          setVerified(false)
        } else if (err.response?.status === 404) {
          setError('주문을 찾을 수 없어요. 주문번호를 다시 확인해주세요.')
        } else {
          setError('잠시 후 다시 시도해주세요.')
        }
      })
      .finally(() => setLoading(false))
  }, [orderNumber])

  // 본인 인증 (전화번호 뒷 4자리)
  const handleVerify = async (e) => {
    e.preventDefault()
    if (phoneLast4.length !== 4) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post(`/orders/track/${encodeURIComponent(orderNumber)}/verify`, { phoneLast4 })
      setOrder(data.data || data)
      setVerified(true)
    } catch (err) {
      setError('전화번호 마지막 4자리가 일치하지 않아요.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-mute font-bold">
          <span className="led led-yellow led-pulse" style={{ width: 8, height: 8 }} />
          주문 정보를 불러오는 중...
        </div>
      </div>
    )
  }

  if (error && !verified) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 text-center">
          <Icon name="close" size={28} strokeWidth={2.4} className="text-rose-700 mx-auto mb-2" />
          <div className="font-display text-lg font-bold text-rose-900">{error}</div>
          <Link to="/" className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-ink hover:text-dex">
            <Icon name="arrow" size={11} strokeWidth={2.4} style={{ transform: 'rotate(180deg)' }} />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  if (!verified) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="relative sparkle-host mb-6 text-center">
          <Sparkles always />
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute mb-2">
            ORDER TRACKING
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">
            주문 추적
          </h1>
          <p className="text-sm text-mute font-medium mt-2">
            본인 확인을 위해 주문하신 분의<br />
            <span className="font-bold text-ink">전화번호 뒷 4자리</span>를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleVerify} className="bg-paper border-2 border-ink rounded-2xl p-6 shadow-[0_4px_0_#1a1a1a] space-y-4">
          <div>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">
              주문번호
            </label>
            <div className="font-mono text-base font-bold text-ink bg-bone-2 border-2 border-ink/10 rounded-lg px-4 py-2.5">
              {orderNumber}
            </div>
          </div>
          <div>
            <label htmlFor="phone-last-4" className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">
              전화번호 뒷 4자리
            </label>
            <input
              id="phone-last-4"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              pattern="[0-9]{4}"
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              autoFocus
              className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-3 font-mono text-2xl font-bold text-ink tabular-nums tracking-widest text-center focus:border-ink focus:bg-paper outline-none"
            />
          </div>
          {error && (
            <div className="text-xs text-rose-700 font-bold bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={phoneLast4.length !== 4 || loading}
            className="w-full px-4 py-3 rounded-xl border-2 border-ink bg-ink text-paper text-sm font-bold shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '확인 중...' : '주문 확인하기'}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-mute hover:text-ink font-bold">
            ← 홈으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 lg:py-12">
      <CustomerOrderTracking order={order} />
    </div>
  )
}
