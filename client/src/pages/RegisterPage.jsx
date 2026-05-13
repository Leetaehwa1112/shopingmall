import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { registerUser } from '@/api/userApi'
import Button from '@/components/common/Button'
import Pokeball from '@/components/common/Pokeball'

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    agreeTerms: false, agreePrivacy: false, agreeMarketing: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.agreeTerms || !form.agreePrivacy) return alert('필수 약관에 동의해주세요')

    setLoading(true)
    setError(null)

    try {
      const { data } = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        user_type: 'customer', // 일반 유저로 고정
      })

      // 회원가입 성공 → zustand에 유저+토큰 저장 후 홈으로 이동
      register({ ...data.data, role: data.data.user_type }, data.token)
      navigate('/')
    } catch (err) {
      const msg = err.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 mb-6">
          <Pokeball size={48} />
          <div className="font-display font-bold text-3xl text-ink">
            Poké<span className="text-dex">vault</span>
          </div>
        </Link>

        <form onSubmit={submit} className="surface-soft p-8 elev-2 space-y-4">
          <div>
            <div className="pixel-label text-mute mb-2">Join Us</div>
            <h1 className="font-display text-2xl font-bold text-ink">트레이너 등록</h1>
            <p className="text-xs text-mute mt-2">경매 참여를 위해서는 가입 후 본인 인증이 필요합니다.</p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Input label="이름" value={form.name} onChange={(v) => setForm({...form, name: v})} required />
          <Input label="이메일" type="email" value={form.email} onChange={(v) => setForm({...form, email: v})} required />
          <Input label="비밀번호" type="password" value={form.password} onChange={(v) => setForm({...form, password: v})} required />
          <Input label="휴대폰" value={form.phone} onChange={(v) => setForm({...form, phone: v})} placeholder="010-0000-0000" required />

          <div className="space-y-2 pt-4 border-t border-line">
            <Check v={form.agreeTerms} onChange={(x) => setForm({...form, agreeTerms: x})} label="이용약관 동의 (필수)" />
            <Check v={form.agreePrivacy} onChange={(x) => setForm({...form, agreePrivacy: x})} label="개인정보 처리방침 동의 (필수)" />
            <Check v={form.agreeMarketing} onChange={(x) => setForm({...form, agreeMarketing: x})} label="마케팅 정보 수신 (선택)" />
          </div>

          <Button variant="accent" size="lg" className="w-full" type="submit" disabled={loading}>
            {loading ? '처리 중...' : '가입하기'}
          </Button>

          <div className="text-center text-xs text-mute">
            이미 회원이신가요? <Link to="/login" className="text-dex font-bold">로그인 →</Link>
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
function Check({ v, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-ink font-bold">
      <input type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)} className="accent-ink w-4 h-4" />
      {label}
    </label>
  )
}
