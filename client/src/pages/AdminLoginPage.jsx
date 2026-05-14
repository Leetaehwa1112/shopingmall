import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { loginUser } from '@/api/userApi'
import Button from '@/components/common/Button'
import Pokeball from '@/components/common/Pokeball'

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
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 mb-8">
          <Pokeball size={48} />
          <div className="font-display font-bold text-3xl text-ink">
            Poké<span className="text-dex">vault</span>
          </div>
        </Link>

        <form onSubmit={submit} className="surface-soft p-8 elev-2 space-y-5">
          <div>
            <div className="pixel-label text-dex mb-2">Admin</div>
            <h1 className="font-display text-2xl font-bold text-ink">관리자 로그인</h1>
            <p className="text-xs text-mute mt-2">관리자 전용 페이지입니다.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Input label="관리자 이메일" type="email" value={form.email} onChange={(v) => setForm({...form, email: v})} placeholder="admin@pokevault.kr" />
          <Input label="비밀번호" type="password" value={form.password} onChange={(v) => setForm({...form, password: v})} />

          <Button variant="accent" size="lg" className="w-full" type="submit" disabled={loading}>
            {loading ? '확인 중...' : '관리자 로그인'}
          </Button>

          <div className="text-center text-xs text-mute pt-2 border-t border-line">
            일반 로그인으로 돌아가기 <Link to="/login" className="text-ink font-bold">← 로그인</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border border-line rounded-lg px-4 py-3 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
    </label>
  )
}
