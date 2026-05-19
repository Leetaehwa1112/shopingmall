import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/api/axios'
import Pokeball from '@/components/common/Pokeball'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState({ status: 'loading', message: '' })

  useEffect(() => {
    if (!token) {
      setState({ status: 'error', message: '인증 토큰이 없습니다.' })
      return
    }
    let cancelled = false
    api.post('/users/verify-email', { token })
      .then(() => !cancelled && setState({ status: 'success', message: '이메일이 인증되었습니다!' }))
      .catch((err) => !cancelled && setState({
        status: 'error',
        message: err?.response?.data?.message || '인증에 실패했어요.',
      }))
    return () => { cancelled = true }
  }, [token])

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-confetti">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex flex-col items-center gap-3 mb-6">
          <Pokeball size={48} />
          <div className="font-display font-bold text-2xl text-ink">
            Poké<span className="text-dex">vault</span>
          </div>
        </Link>

        <div className="surface-pop p-8">
          {state.status === 'loading' && (
            <>
              <span className="led led-yellow led-pulse inline-block mb-3" style={{ width: 12, height: 12 }} />
              <h1 className="font-display font-bold text-xl text-ink">인증 확인 중...</h1>
            </>
          )}
          {state.status === 'success' && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center mb-3">
                <span className="text-2xl">✓</span>
              </div>
              <h1 className="font-display font-bold text-xl text-ink mb-2">인증 완료</h1>
              <p className="text-sm text-mute font-medium mb-5">{state.message}</p>
              <Link to="/" className="btn btn-pop px-6 py-3 inline-block text-sm font-bold">
                홈으로
              </Link>
            </>
          )}
          {state.status === 'error' && (
            <>
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center mb-3">
                <span className="text-2xl">✕</span>
              </div>
              <h1 className="font-display font-bold text-xl text-ink mb-2">인증 실패</h1>
              <p className="text-sm text-mute font-medium mb-5">{state.message}</p>
              <Link to="/mypage" className="btn btn-pop px-6 py-3 inline-block text-sm font-bold">
                마이페이지에서 재발송
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
