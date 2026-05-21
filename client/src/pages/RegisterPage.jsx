import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { registerUser, checkEmailAvailable } from '@/api/userApi'
import Pokeball from '@/components/common/Pokeball'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import Icon from '@/components/common/Icon'

const PW_RULES = [
  { id: 'len',     label: '8자 이상',     test: (v) => v.length >= 8 },
  { id: 'num',     label: '숫자 포함',     test: (v) => /\d/.test(v) },
  { id: 'special', label: '특수문자 포함', test: (v) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/~`]/.test(v) },
  { id: 'upper',   label: '영문 포함',     test: (v) => /[a-zA-Z]/.test(v) },
]

function getStrength(pw) {
  const passed = PW_RULES.filter((r) => r.test(pw)).length
  if (!pw) return { score: 0, label: '', color: '' }
  if (passed <= 1) return { score: 1, label: '약함', color: 'bg-dex' }
  if (passed === 2) return { score: 2, label: '보통', color: 'bg-gold' }
  if (passed === 3) return { score: 3, label: '양호', color: 'bg-water' }
  return { score: 4, label: '강함', color: 'bg-grass' }
}

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    agreeAll: false, agreeTerms: false, agreePrivacy: false, agreeMarketing: false,
  })
  const [emailStatus, setEmailStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleAgreeAll = (checked) => {
    setForm((f) => ({
      ...f,
      agreeAll: checked,
      agreeTerms: checked,
      agreePrivacy: checked,
      agreeMarketing: checked,
    }))
  }

  const handleCheck = (key, checked) => {
    setForm((f) => {
      const next = { ...f, [key]: checked }
      next.agreeAll = next.agreeTerms && next.agreePrivacy && next.agreeMarketing
      return next
    })
  }

  const handleEmailBlur = useCallback(async () => {
    const email = form.email.trim()
    if (!email) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailStatus('invalid')
      return
    }
    setEmailStatus('checking')
    try {
      const { data } = await checkEmailAvailable(email)
      setEmailStatus(data.available ? 'available' : 'taken')
    } catch {
      setEmailStatus(null)
    }
  }, [form.email])

  const pwStrength = getStrength(form.password)
  const pwRulePassed = PW_RULES.map((r) => r.test(form.password))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.agreeTerms || !form.agreePrivacy) {
      setError('필수 약관에 동의해주세요.')
      return
    }
    if (emailStatus === 'taken') {
      setError('이미 사용 중인 이메일입니다.')
      return
    }
    if (emailStatus === 'invalid') {
      setError('올바른 이메일 형식을 입력해주세요.')
      return
    }
    if (pwStrength.score < 2) {
      setError('비밀번호는 8자 이상, 숫자·영문을 포함해야 합니다.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data } = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        user_type: 'customer',
      })
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
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 bg-confetti">
      <div className="w-full max-w-md">
        <Link to="/" className="flex flex-col items-center gap-3 mb-6 sparkle-host relative">
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
            <Eyebrow tone="electric" led="yellow" pulse>JOIN US · 트레이너 등록</Eyebrow>
            <h1 className="mt-3 font-display text-3xl font-bold text-ink tracking-tight">
              트레이너 되기
              <span className="ml-2 text-fire">!</span>
            </h1>
            <p className="text-xs text-mute mt-2 font-medium">경매 참여를 위해서는 가입 후 본인 인증이 필요해요.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border-2 border-dex text-dex text-xs font-bold px-4 py-3 rounded-lg shadow-[0_2px_0_#1a1a1a]">
              <Icon name="close" size={12} strokeWidth={3} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <TextInput
            label="이름"
            value={form.name}
            onChange={(v) => set('name', v)}
            required
            autoComplete="name"
          />

          <div>
            <TextInput
              label="이메일"
              type="email"
              value={form.email}
              onChange={(v) => { set('email', v); setEmailStatus(null) }}
              onBlur={handleEmailBlur}
              required
              autoComplete="email"
              status={emailStatus === 'available' ? 'ok' : emailStatus === 'taken' || emailStatus === 'invalid' ? 'err' : null}
            />
            {emailStatus === 'checking' && (
              <p className="mt-1.5 text-[11px] text-mute font-medium">확인 중...</p>
            )}
            {emailStatus === 'available' && (
              <p className="mt-1.5 text-[11px] text-grass font-bold flex items-center gap-1">
                <Icon name="check" size={10} strokeWidth={3} /> 사용 가능한 이메일이에요!
              </p>
            )}
            {emailStatus === 'taken' && (
              <p className="mt-1.5 text-[11px] text-dex font-bold flex items-center gap-1">
                <Icon name="close" size={10} strokeWidth={3} /> 이미 사용 중인 이메일이에요
              </p>
            )}
            {emailStatus === 'invalid' && (
              <p className="mt-1.5 text-[11px] text-dex font-bold flex items-center gap-1">
                <Icon name="close" size={10} strokeWidth={3} /> 올바른 이메일 형식이 아니에요
              </p>
            )}
          </div>

          <div>
            <TextInput
              label="비밀번호"
              type="password"
              value={form.password}
              onChange={(v) => set('password', v)}
              required
              autoComplete="new-password"
            />
            {form.password && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n}
                        className={`h-1.5 flex-1 rounded-full transition-colors border border-ink/20 ${
                          n <= pwStrength.score ? pwStrength.color : 'bg-line'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold ${
                    pwStrength.score <= 1 ? 'text-dex' :
                    pwStrength.score === 2 ? 'text-gold' :
                    pwStrength.score === 3 ? 'text-water' : 'text-grass'
                  }`}>{pwStrength.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {PW_RULES.map((rule, i) => (
                    <span key={rule.id}
                      className={`text-[10px] font-bold flex items-center gap-1 ${
                        pwRulePassed[i] ? 'text-grass' : 'text-mute'
                      }`}>
                      <Icon name={pwRulePassed[i] ? 'check' : 'close'} size={9} strokeWidth={3} />
                      {rule.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <TextInput
            label="휴대폰"
            value={form.phone}
            onChange={(v) => set('phone', v)}
            placeholder="010-0000-0000"
            autoComplete="tel"
          />

          <div className="space-y-2 pt-4 border-t-2 border-ink/15">
            <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-lg bg-electric/20 border-2 border-ink hover:bg-electric/40 transition-colors">
              <input
                type="checkbox"
                checked={form.agreeAll}
                onChange={(e) => handleAgreeAll(e.target.checked)}
                className="accent-ink w-4 h-4 shrink-0"
              />
              <span className="text-sm font-bold text-ink">전체 동의</span>
            </label>

            <div className="space-y-1 pl-1">
              <CheckItem
                checked={form.agreeTerms}
                onChange={(v) => handleCheck('agreeTerms', v)}
                label="이용약관 동의"
                badge="필수"
                badgeColor="text-dex"
              />
              <CheckItem
                checked={form.agreePrivacy}
                onChange={(v) => handleCheck('agreePrivacy', v)}
                label="개인정보 처리방침 동의"
                badge="필수"
                badgeColor="text-dex"
              />
              <CheckItem
                checked={form.agreeMarketing}
                onChange={(v) => handleCheck('agreeMarketing', v)}
                label="마케팅 정보 수신"
                badge="선택"
                badgeColor="text-mute"
              />
            </div>
          </div>

          <button type="submit"
            disabled={loading || emailStatus === 'taken' || emailStatus === 'invalid'}
            className="btn-pop w-full py-3 rounded-xl font-bold disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? '처리 중...' : '트레이너 등록!'}
          </button>

          <div className="text-center text-xs text-mute font-medium">
            이미 회원이신가요? <Link to="/login" className="text-dex font-bold hover:underline">로그인 →</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

function TextInput({ label, value, onChange, onBlur, status, ...rest }) {
  const borderCls = status === 'ok'
    ? 'border-grass focus:border-grass'
    : status === 'err'
      ? 'border-dex focus:border-dex'
      : 'border-ink/20 focus:border-ink'
  return (
    <label className="block">
      <div className="text-[11px] text-ink font-bold mb-1.5 tracking-wide">{label}</div>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          {...rest}
          className={`w-full bg-bone-2 border-2 rounded-lg px-4 py-3 text-sm text-ink focus:bg-paper outline-none transition-colors font-medium ${borderCls} ${status ? 'pr-9' : ''}`}
        />
        {status === 'ok' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-grass pointer-events-none">
            <Icon name="check" size={14} strokeWidth={3} />
          </span>
        )}
        {status === 'err' && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dex pointer-events-none">
            <Icon name="close" size={14} strokeWidth={3} />
          </span>
        )}
      </div>
    </label>
  )
}

function CheckItem({ checked, onChange, label, badge, badgeColor }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 rounded hover:bg-bone-2 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-ink w-4 h-4 shrink-0"
      />
      <span className="text-sm font-medium text-ink flex-1">{label}</span>
      <span className={`text-[10px] font-bold ${badgeColor}`}>{badge}</span>
    </label>
  )
}
