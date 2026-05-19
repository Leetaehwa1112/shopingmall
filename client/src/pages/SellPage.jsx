import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import api from '@/api/axios'

const STEPS = [
  { id: 'info',   label: '카드 정보' },
  { id: 'grade',  label: '등급' },
  { id: 'price',  label: '가격 / 옥션' },
  { id: 'photo',  label: '사진' },
  { id: 'review', label: '검토' },
]

export default function SellPage() {
  const { isAuthenticated, verified } = useAuthStore()
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.push)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '', nameKo: '', set: '', year: '', number: '',
    company: 'PSA', score: '10', cert: '', country: 'USA',
    type: 'auction', startPrice: '', buyNowPrice: '', endsAt: '', minIncrement: '1000000',
    description: '',
  })
  const [submitting, setSubmitting] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="surface-pop p-10 sparkle-host relative bg-confetti">
          <Sparkles always />
          <div className="w-16 h-16 mx-auto rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a] mb-5">
            <Icon name="lock" size={28} strokeWidth={2} className="text-ink" />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink mb-3">로그인이 필요해요</h2>
          <p className="text-sm text-mute mb-6 font-medium">카드 출품은 로그인 후 본인 인증이 필요해요.</p>
          <Link to="/login" className="btn-pop px-6 py-3 rounded-xl inline-flex items-center gap-2 font-bold">
            로그인 <Icon name="arrow" size={14} strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    )
  }

  const next = () => setStep(Math.min(step + 1, STEPS.length - 1))
  const prev = () => setStep(Math.max(step - 1, 0))

  const submit = async () => {
    setSubmitting(true)
    try {
      await api.post('/auctions', {
        name: form.name,
        nameKo: form.nameKo,
        set: form.set,
        year: form.year,
        number: form.number,
        gradeCompany: form.company,
        gradeScore: form.score,
        gradeCert: form.cert,
        cardCountry: form.country,
        saleType: form.type,
        startPrice: Number(form.startPrice),
        buyNowPrice: form.buyNowPrice ? Number(form.buyNowPrice) : null,
        endsAt: form.endsAt || null,
        minIncrement: Number(form.minIncrement),
        description: form.description || '',
      })
      toast({ type: 'success', title: '출품 요청 접수됐어요!', message: '검수 후 1-2일 내 등록 완료돼요.' })
      setTimeout(() => navigate('/mypage'), 1500)
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ type: 'error', title: '신청 실패', message: Array.isArray(msg) ? msg.join(', ') : msg || '오류가 발생했어요.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8 relative sparkle-host">
        <Sparkles always />
        <Eyebrow tone="fire" led="red" pulse>SELL · 내 카드도 누군가의 보물</Eyebrow>
        <h1 className="mt-4 font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
          내 카드
          <span className="relative inline-block ml-3">
            <span className="relative z-10 text-fire">출품하기!</span>
            <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
          </span>
        </h1>
        <p className="text-sm text-mute mt-3 max-w-2xl leading-relaxed font-medium">
          PSA·BGS·CGC 등급 카드만 위탁 가능해요. 등록 후 검수를 거쳐 경매에 노출돼요.
        </p>
      </div>

      {!verified && (
        <div className="surface-pop bg-electric/15 p-4 mb-6 flex items-start gap-3">
          <Icon name="shield" size={20} strokeWidth={2.2} className="text-fire mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-ink text-sm">본인 인증이 아직이에요</div>
            <div className="text-xs text-mute mt-0.5 font-medium">출품은 본인 인증 완료 후 가능해요.</div>
          </div>
          <Link to="/mypage"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-paper border-2 border-ink text-ink font-bold text-xs shadow-[0_2px_0_#1a1a1a] hover:bg-electric/40 transition-colors">
            인증하기
          </Link>
        </div>
      )}

      {/* Stepper */}
      <div className="surface-pop p-4 mb-6">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-ink ${
                  i === step ? 'bg-ink text-electric shadow-[0_3px_0_#1a1a1a] -translate-y-0.5' :
                  i < step  ? 'bg-grass text-white shadow-[0_2px_0_#1a1a1a]' :
                              'bg-paper text-mute'
                }`}>
                  {i < step ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${
                  i === step ? 'text-ink' : i < step ? 'text-grass' : 'text-mute'
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-1 rounded-full ${i < step ? 'bg-grass' : 'bg-ink/15'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="surface-pop p-7">
        {step === 0 && (
          <Section title="카드 정보">
            <div className="grid grid-cols-2 gap-4">
              <Field label="카드명 (영문)" value={form.name} onChange={(v) => setForm({...form, name: v})} placeholder="Charizard" />
              <Field label="카드명 (한글)" value={form.nameKo} onChange={(v) => setForm({...form, nameKo: v})} placeholder="리자몽" />
              <Field label="세트" value={form.set} onChange={(v) => setForm({...form, set: v})} placeholder="Base Set 1st Edition" />
              <Field label="발매년도" type="number" value={form.year} onChange={(v) => setForm({...form, year: v})} placeholder="1999" />
              <Field label="카드 번호" value={form.number} onChange={(v) => setForm({...form, number: v})} placeholder="4/102" />
            </div>
          </Section>
        )}

        {step === 1 && (
          <Section title="등급 정보">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Lbl>등급사</Lbl>
                <select value={form.company} onChange={(e) => setForm({...form, company: e.target.value})}
                  className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-2.5 text-sm text-ink font-bold focus:border-ink outline-none">
                  <option>PSA</option><option>BGS</option><option>CGC</option>
                </select>
              </div>
              <Field label="점수" value={form.score} onChange={(v) => setForm({...form, score: v})} placeholder="10" />
              <Field label="인증서 번호" value={form.cert} onChange={(v) => setForm({...form, cert: v})} placeholder="52819374" />
            </div>
            <div className="mt-4">
              <Lbl>카드 언어판</Lbl>
              <div className="flex gap-3">
                {[['USA', '🇺🇸', 'US판'], ['JPN', '🇯🇵', 'JP판'], ['KOR', '🇰🇷', 'KR판']].map(([val, flag, label]) => {
                  const active = form.country === val
                  return (
                    <button key={val} type="button" onClick={() => setForm({...form, country: val})}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                        active
                          ? 'bg-ink text-electric border-ink shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                          : 'bg-paper border-ink/20 text-ink hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
                      }`}>
                      <span className="text-xl">{flag}</span> {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="mt-5 p-4 bg-electric/15 border-2 border-ink/15 rounded-xl">
              <div className="text-sm font-bold text-ink mb-2">📋 위탁 조건</div>
              <ul className="text-xs text-ink/80 space-y-1.5 font-medium">
                <li>· PSA 6 이상 등급만 위탁 가능해요</li>
                <li>· 인증서 번호 검증 후 등록돼요</li>
                <li>· 위탁 수수료: 낙찰가의 10%</li>
                <li>· 미낙찰 시 무료 보관 후 반송해드려요</li>
              </ul>
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="가격 / 옥션 설정">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button type="button" onClick={() => setForm({...form, type: 'auction'})}
                className={`p-4 rounded-xl border-2 transition-all ${
                  form.type === 'auction'
                    ? 'border-ink bg-fire/15 shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                    : 'border-ink/15 hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
                }`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} />
                  <div className="font-display font-bold text-ink">옥션 등록</div>
                </div>
                <div className="text-xs text-mute font-medium">시작가부터 입찰</div>
              </button>
              <button type="button" onClick={() => setForm({...form, type: 'buynow'})}
                className={`p-4 rounded-xl border-2 transition-all ${
                  form.type === 'buynow'
                    ? 'border-ink bg-water/15 shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                    : 'border-ink/15 hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
                }`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="led led-blue" style={{ width: 7, height: 7 }} />
                  <div className="font-display font-bold text-ink">즉시 구매</div>
                </div>
                <div className="text-xs text-mute font-medium">고정 가격 판매</div>
              </button>
            </div>

            {form.type === 'auction' ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="시작가 (원)" type="number" value={form.startPrice} onChange={(v) => setForm({...form, startPrice: v})} placeholder="50000000" />
                <Field label="즉시 낙찰가 (선택, 원)" type="number" value={form.buyNowPrice} onChange={(v) => setForm({...form, buyNowPrice: v})} placeholder="200000000" />
                <Field label="옥션 종료" type="datetime-local" value={form.endsAt} onChange={(v) => setForm({...form, endsAt: v})} />
                <div>
                  <Lbl>최소 호가 단위</Lbl>
                  <select value={form.minIncrement} onChange={(e) => setForm({...form, minIncrement: e.target.value})}
                    className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-2.5 text-sm text-ink font-bold focus:border-ink outline-none">
                    <option value="100000">₩100,000</option>
                    <option value="500000">₩500,000</option>
                    <option value="1000000">₩1,000,000</option>
                    <option value="5000000">₩5,000,000</option>
                  </select>
                </div>
              </div>
            ) : (
              <Field label="판매가 (원)" type="number" value={form.startPrice} onChange={(v) => setForm({...form, startPrice: v})} placeholder="15000000" />
            )}
          </Section>
        )}

        {step === 3 && (
          <Section title="사진 업로드">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['앞면', '뒷면', '인증 라벨', '디테일'].map((label) => (
                <div key={label} className="aspect-square border-2 border-dashed border-ink/30 hover:border-ink rounded-xl bg-bone-2/40 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Icon name="package" size={28} strokeWidth={2} className="text-mute mb-2" />
                  <div className="text-xs text-ink font-bold">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-mute mt-3 font-medium">고해상도 사진 4장 필수 · 인증 라벨이 명확히 보여야 해요.</p>
          </Section>
        )}

        {step === 4 && (
          <Section title="검토">
            <div className="space-y-1">
              <Row k="카드명" v={`${form.nameKo} / ${form.name}`} />
              <Row k="세트 · 연도 · 번호" v={`${form.set} · ${form.year} · #${form.number}`} />
              <Row k="등급" v={`${form.company} ${form.score} (Cert #${form.cert})`} />
              <Row k="언어판" v={{ USA: '🇺🇸 US판', JPN: '🇯🇵 JP판', KOR: '🇰🇷 KR판' }[form.country]} />
              <Row k="판매 유형" v={form.type === 'auction' ? '옥션' : '즉시 구매'} />
              {form.type === 'auction' ? (
                <>
                  <Row k="시작가" v={`₩${Number(form.startPrice || 0).toLocaleString()}`} />
                  {form.buyNowPrice && <Row k="즉시 낙찰가" v={`₩${Number(form.buyNowPrice).toLocaleString()}`} />}
                  <Row k="종료" v={form.endsAt || '미설정'} />
                </>
              ) : (
                <Row k="판매가" v={`₩${Number(form.startPrice || 0).toLocaleString()}`} />
              )}
              <Row k="위탁 수수료" v="낙찰가의 10%" highlight />
            </div>
            <div className="mt-5 p-4 bg-electric/15 border-2 border-ink/15 rounded-xl text-xs text-ink leading-relaxed font-medium">
              <strong className="block mb-1 text-sm">⚠ 등록 후 절차</strong>
              1. 카드 발송 → 2. POKÉVAULT 본사 검수 (1-2일) → 3. 등록 승인 → 4. 경매 노출
            </div>
          </Section>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between mt-6">
        <button onClick={prev} disabled={step === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-paper border-2 border-ink text-ink font-bold shadow-[0_3px_0_#1a1a1a] hover:bg-electric/20 hover:-translate-y-0.5 disabled:opacity-30 disabled:hover:translate-y-0 disabled:cursor-not-allowed transition-all">
          <Icon name="arrow" size={14} strokeWidth={2.4} className="rotate-180" /> 이전
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next}
            className="btn-pop px-6 py-2.5 rounded-xl inline-flex items-center gap-2 font-bold">
            다음 <Icon name="arrow" size={14} strokeWidth={2.4} />
          </button>
        ) : (
          <button onClick={submit} disabled={submitting}
            className="btn-pop px-6 py-2.5 rounded-xl inline-flex items-center gap-2 font-bold disabled:opacity-60">
            {submitting ? '제출 중...' : '출품 요청!'} <Icon name="arrow" size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-display text-xl font-bold text-ink mb-5">{title}</h3>
      <div>{children}</div>
    </div>
  )
}
function Lbl({ children }) {
  return <div className="text-[11px] text-ink font-bold mb-1.5 tracking-wide">{children}</div>
}
function Field({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <Lbl>{label}</Lbl>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors font-medium" />
    </label>
  )
}
function Row({ k, v, highlight }) {
  return (
    <div className="flex justify-between py-2 border-b-2 border-ink/10 text-sm">
      <span className="text-mute font-bold">{k}</span>
      <span className={`font-mono font-bold ${highlight ? 'text-dex' : 'text-ink'}`}>{v}</span>
    </div>
  )
}
