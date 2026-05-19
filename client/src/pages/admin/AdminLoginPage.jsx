import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { loginUser } from '@/api/userApi'
import Pokeball from '@/components/common/Pokeball'
import Eyebrow from '@/components/common/Eyebrow'
import Icon from '@/components/common/Icon'

export default function AdminLoginPage() {
  const login = useAuthStore((s) => s.login)
  const { token, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token && isAdmin) navigate('/admin', { replace: true })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data } = await loginUser({ email: form.email, password: form.password })
      const user = data.data
      const token = data.token

      if (user.user_type !== 'admin') {
        setError('관리자 계정이 아닙니다.')
        setLoading(false)
        return
      }

      login({ ...user, role: user.user_type }, token)
      navigate('/admin')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(msg || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-confetti">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 mb-8">
          <Pokeball size={56} />
          <div className="font-display font-bold text-3xl text-ink">
            Poké<span className="text-dex">vault</span>
          </div>
        </Link>

        <form onSubmit={submit} className="surface-pop p-8 space-y-5">
          <div>
            <Eyebrow tone="fire" led="red" pulse>ADMIN · 관리자 전용</Eyebrow>
            <h1 className="mt-3 font-display text-3xl font-bold text-ink tracking-tight">관리자 로그인</h1>
            <p className="text-xs text-mute mt-2 font-medium">관리자 전용 페이지예요.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border-2 border-dex text-dex text-xs font-bold px-4 py-3 rounded-lg shadow-[0_2px_0_#1a1a1a]">
              <Icon name="close" size={12} strokeWidth={3} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <Input label="관리자 이메일" type="email" value={form.email} onChange={(v) => setForm({...form, email: v})} placeholder="admin@pokevault.kr" />
          <Input label="비밀번호" type="password" value={form.password} onChange={(v) => setForm({...form, password: v})} />

          <button type="submit" disabled={loading}
            className="btn-pop w-full py-3 rounded-xl font-bold disabled:opacity-60">
            {loading ? '확인 중...' : '관리자 입장'}
          </button>

          <div className="text-center text-xs text-mute pt-3 border-t-2 border-ink/15 font-medium">
            일반 로그인으로 돌아가기 <Link to="/login" className="text-dex font-bold hover:underline">← 로그인</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <div className="text-[11px] text-ink font-bold mb-1.5 tracking-wide">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-3 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors font-medium" />
    </label>
  )
}
