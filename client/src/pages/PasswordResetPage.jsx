import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '@/api/axios'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'

// 단일 페이지 두 모드:
//   ?token 없음 → 이메일 입력 → request-password-reset
//   ?token 있음 → 새 비밀번호 입력 → reset-password
export default function PasswordResetPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const requestReset = async (e) => {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    try {
      await api.post('/users/request-password-reset', { email })
      setMsg('이메일이 가입되어 있다면 재설정 링크가 발송됩니다. 메일함을 확인해주세요.')
    } catch (er) {
      setErr(er?.response?.data?.message || '요청에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const doReset = async (e) => {
    e.preventDefault()
    if (password !== password2) { setErr('비밀번호가 일치하지 않아요.'); return }
    if (password.length < 8) { setErr('비밀번호는 8자 이상이어야 해요.'); return }
    setLoading(true); setErr(null); setMsg(null)
    try {
      await api.post('/users/reset-password', { token, password })
      setMsg('비밀번호가 변경됐어요. 3초 후 로그인 페이지로 이동합니다.')
      setTimeout(() => navigate('/login'), 3000)
    } catch (er) {
      setErr(er?.response?.data?.message || '재설정에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-confetti">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 mb-6">
          <Pokeball size={48} />
          <div className="font-display font-bold text-2xl text-ink">
            Poké<span className="text-dex">vault</span>
          </div>
        </Link>

        <div className="surface-pop p-8">
          <h1 className="font-display font-bold text-2xl text-ink mb-1">
            {token ? '새 비밀번호 설정' : '비밀번호 재설정'}
          </h1>
          <p className="text-sm text-mute font-medium mb-6">
            {token ? '새 비밀번호를 입력해주세요. (8자 이상, 영문/숫자/특수 중 2가지)' : '가입한 이메일을 입력해주세요. 재설정 링크를 보내드릴게요.'}
          </p>

          {msg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border-2 border-emerald-200 text-sm text-emerald-800 font-bold">
              {msg}
            </div>
          )}
          {err && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border-2 border-rose-200 text-sm text-rose-800 font-bold">
              {err}
            </div>
          )}

          {token ? (
            <form onSubmit={doReset} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="새 비밀번호"
                autoFocus
                className="w-full bg-bone-2 border-2 border-ink/20 rounded-xl px-4 py-3 text-sm font-bold text-ink focus:border-ink outline-none"
              />
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="비밀번호 확인"
                className="w-full bg-bone-2 border-2 border-ink/20 rounded-xl px-4 py-3 text-sm font-bold text-ink focus:border-ink outline-none"
              />
              <button type="submit" disabled={loading}
                className="w-full btn btn-pop py-3 text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                {loading ? '처리 중...' : '비밀번호 변경'}
                <Icon name="arrow" size={13} strokeWidth={2.5} />
              </button>
            </form>
          ) : (
            <form onSubmit={requestReset} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trainer@example.com"
                autoFocus
                className="w-full bg-bone-2 border-2 border-ink/20 rounded-xl px-4 py-3 text-sm font-bold text-ink focus:border-ink outline-none"
              />
              <button type="submit" disabled={loading}
                className="w-full btn btn-pop py-3 text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                {loading ? '발송 중...' : '재설정 링크 받기'}
                <Icon name="arrow" size={13} strokeWidth={2.5} />
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link to="/login" className="text-xs text-mute hover:text-ink font-bold">
              ← 로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
