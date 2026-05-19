import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { loginUser } from '@/api/userApi'
import Pokeball from '@/components/common/Pokeball'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import Icon from '@/components/common/Icon'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const { token, isAdmin } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (token) navigate(isAdmin ? '/admin' : '/', { replace: true })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data } = await loginUser({ email: form.email, password: form.password })
      const user = data.data
      const token = data.token
      login({ ...user, role: user.user_type }, token)
      navigate('/')
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
        <Link to="/" className="flex flex-col items-center gap-3 mb-8 sparkle-host relative">
          <Sparkles always />
          <div className="float-bob">
            <Pokeball size={56} />
          </div>
          <div className="font-display font-bold text-3xl text-ink">
            Poké<span className="text-dex">vault</span>
          </div>
        </Link>

        <form onSubmit={submit} className="surface-pop p-8 space-y-5">
          <div>
            <Eyebrow tone="fire" led="red" pulse>WELCOME BACK · 트레이너</Eyebrow>
            <h1 className="mt-3 font-display text-3xl font-bold text-ink tracking-tight">로그인</h1>
            <p className="text-xs text-mute mt-2 font-medium">다시 만나서 반가워요!</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border-2 border-dex text-dex text-xs font-bold px-4 py-3 rounded-lg shadow-[0_2px_0_#1a1a1a]">
              <Icon name="close" size={12} strokeWidth={3} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <Input label="이메일" type="email" value={form.email} onChange={(v) => setForm({...form, email: v})} placeholder="trainer@pokevault.kr" />
          <Input label="비밀번호" type="password" value={form.password} onChange={(v) => setForm({...form, password: v})} />

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-ink font-bold cursor-pointer">
              <input type="checkbox" className="accent-ink w-4 h-4" /> 로그인 유지
            </label>
            <Link to="/reset-password" className="text-mute hover:text-dex font-bold transition-colors">비밀번호 찾기</Link>
          </div>

          <button type="submit" disabled={loading}
            className="btn-pop w-full py-3 rounded-xl font-bold disabled:opacity-60">
            {loading ? '처리 중...' : '입장하기!'}
          </button>

          <div className="text-center text-xs text-mute pt-3 border-t-2 border-ink/15 font-medium">
            아직 회원이 아니신가요? <Link to="/register" className="text-dex font-bold hover:underline">트레이너 되기 →</Link>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" className="bg-electric border-2 border-ink py-2.5 rounded-lg text-xs font-bold text-ink shadow-[0_2px_0_#1a1a1a] hover:-translate-y-0.5 transition-transform">카카오</button>
            <button type="button" className="bg-paper border-2 border-ink py-2.5 rounded-lg text-xs font-bold text-ink shadow-[0_2px_0_#1a1a1a] hover:-translate-y-0.5 transition-transform">Google</button>
          </div>

          <div className="text-center pt-2 border-t-2 border-ink/15">
            <Link to="/admin/login" className="text-xs text-mute hover:text-ink font-medium transition-colors">
              관리자 로그인 →
            </Link>
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
