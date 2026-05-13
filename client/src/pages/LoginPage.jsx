import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import Button from '@/components/common/Button'
import Pokeball from '@/components/common/Pokeball'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })

  const submit = (e) => {
    e.preventDefault()
    const isAdmin = form.email.toLowerCase().includes('admin')
    login({
      name: isAdmin ? 'Admin' : (form.email.split('@')[0] || 'Trainer'),
      email: form.email,
      role: isAdmin ? 'admin' : 'collector',
    })
    navigate(isAdmin ? '/admin' : '/')
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
            <div className="pixel-label text-mute mb-2">Sign In</div>
            <h1 className="font-display text-2xl font-bold text-ink">로그인</h1>
            <p className="text-xs text-mute mt-2">이메일에 <span className="text-dex font-bold">admin</span> 포함 시 관리자 모드</p>
          </div>

          <Input label="이메일" type="email" value={form.email} onChange={(v) => setForm({...form, email: v})} placeholder="trainer@pokevault.kr" />
          <Input label="비밀번호" type="password" value={form.password} onChange={(v) => setForm({...form, password: v})} />

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-mute font-bold cursor-pointer">
              <input type="checkbox" className="accent-ink" /> 로그인 유지
            </label>
            <Link to="#" className="text-ink font-bold hover:text-dex">비밀번호 찾기</Link>
          </div>

          <Button variant="primary" size="lg" className="w-full" type="submit">로그인</Button>

          <div className="text-center text-xs text-mute pt-2 border-t border-line">
            아직 회원이 아니신가요? <Link to="/register" className="text-dex font-bold">회원가입 →</Link>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" className="bg-gold py-2.5 rounded-lg text-xs font-bold text-ink hover:opacity-90">카카오</button>
            <button type="button" className="bg-paper border border-line py-2.5 rounded-lg text-xs font-bold text-ink hover:border-ink">Google</button>
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
