import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
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

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className="surface-soft p-10 elev-1">
          <Icon name="lock" size={36} strokeWidth={1.4} className="text-dex mx-auto mb-5" />
          <h2 className="font-display text-2xl font-bold text-ink mb-3">로그인이 필요합니다</h2>
          <p className="text-sm text-mute mb-6">경매 등록을 하려면 로그인 후 본인 인증이 필요합니다.</p>
          <Link to="/login"><Button variant="primary">로그인</Button></Link>
        </div>
      </div>
    )
  }

  const [submitting, setSubmitting] = useState(false)
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
      })
      toast({ type: 'success', title: '경매 등록 요청 접수', message: '검수 후 1-2일 내 등록 완료됩니다.' })
      setTimeout(() => navigate('/mypage'), 1500)
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ type: 'error', title: '신청 실패', message: Array.isArray(msg) ? msg.join(', ') : msg || '오류가 발생했습니다.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-dex mb-3">
          <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} />
          <span className="pixel-label">Sell on Auction</span>
        </div>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight">경매 등록</h1>
        <p className="text-sm text-mute mt-2 max-w-2xl leading-relaxed">
          PSA·BGS·CGC 등급 카드만 위탁 가능합니다. 등록 후 검수를 거쳐 경매에 노출됩니다.
        </p>
      </div>

      {!verified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Icon name="shield" size={20} strokeWidth={1.8} className="text-amber-700 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-amber-900 text-sm">본인 인증 미완료</div>
            <div className="text-xs text-amber-800 mt-0.5">경매 등록은 본인 인증 완료 후 가능합니다.</div>
          </div>
          <Link to="/mypage"><Button variant="secondary" size="sm">인증하기</Button></Link>
        </div>
      )}

      {/* Stepper */}
      <div className="surface-soft p-4 mb-6 elev-1">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 ${i === step ? 'text-ink' : i < step ? 'text-emerald-700' : 'text-mute'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === step ? 'bg-ink text-paper' : i < step ? 'bg-emerald-500 text-paper' : 'bg-bone-2 text-mute border border-line'
                }`}>
                  {i < step ? <Icon name="check" size={12} strokeWidth={3} /> : i + 1}
                </div>
                <span className="text-xs font-bold hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-emerald-500' : 'bg-line'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="surface-soft p-7 elev-2">
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
                  className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink font-bold">
                  <option>PSA</option><option>BGS</option><option>CGC</option>
                </select>
              </div>
              <Field label="점수" value={form.score} onChange={(v) => setForm({...form, score: v})} placeholder="10" />
              <Field label="인증서 번호" value={form.cert} onChange={(v) => setForm({...form, cert: v})} placeholder="52819374" />
            </div>
            <div className="mt-4">
              <Lbl>카드 언어판</Lbl>
              <div className="flex gap-3">
                {[['USA', '🇺🇸', 'US판'], ['JPN', '🇯🇵', 'JP판'], ['KOR', '🇰🇷', 'KR판']].map(([val, flag, label]) => (
                  <button key={val} type="button" onClick={() => setForm({...form, country: val})}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                      form.country === val ? 'border-ink bg-ink/[0.04] elev-1' : 'border-line hover:border-ink/30'
                    }`}>
                    <span className="text-xl">{flag}</span> {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 p-4 bg-bone-2/50 rounded-xl">
              <div className="text-sm font-bold text-ink mb-2">📋 위탁 조건</div>
              <ul className="text-xs text-mute space-y-1.5">
                <li>· PSA 6 이상 등급만 위탁 가능</li>
                <li>· 인증서 번호 검증 후 등록</li>
                <li>· 위탁 수수료: 낙찰가의 10%</li>
                <li>· 미낙찰 시 무료 보관 후 반송</li>
              </ul>
            </div>
          </Section>
        )}

        {step === 2 && (
          <Section title="가격 / 옥션 설정">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button type="button" onClick={() => setForm({...form, type: 'auction'})}
                className={`p-4 rounded-xl border transition-all ${form.type === 'auction' ? 'border-dex bg-dex/5 elev-1' : 'border-line hover:border-ink/30'}`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} />
                  <div className="font-display font-bold text-ink">옥션 등록</div>
                </div>
                <div className="text-xs text-mute">시작가부터 입찰</div>
              </button>
              <button type="button" onClick={() => setForm({...form, type: 'buynow'})}
                className={`p-4 rounded-xl border transition-all ${form.type === 'buynow' ? 'border-blue bg-blue-50 elev-1' : 'border-line hover:border-ink/30'}`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="led led-blue" style={{ width: 7, height: 7 }} />
                  <div className="font-display font-bold text-ink">즉시 구매</div>
                </div>
                <div className="text-xs text-mute">고정 가격 판매</div>
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
                    className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink font-bold">
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
                <div key={label} className="aspect-square border-2 border-dashed border-line hover:border-ink/40 rounded-xl bg-bone-2/30 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  <Icon name="package" size={28} strokeWidth={1.5} className="text-mute mb-2" />
                  <div className="text-xs text-mute font-bold">{label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-mute mt-3">고해상도 사진 4장 필수 · 인증 라벨이 명확하게 보여야 합니다.</p>
          </Section>
        )}

        {step === 4 && (
          <Section title="검토">
            <div className="space-y-3">
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
            <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong className="block mb-1">⚠ 등록 후 절차</strong>
              1. 카드 발송 → 2. POKÉVAULT 본사 검수 (1-2일) → 3. 등록 승인 → 4. 경매 노출
            </div>
          </Section>
        )}
      </div>

      {/* Nav */}
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={prev} disabled={step === 0}>
          <Icon name="arrow" size={14} strokeWidth={2.2} className="rotate-180" /> 이전
        </Button>
        {step < STEPS.length - 1 ? (
          <Button variant="primary" onClick={next}>다음 <Icon name="arrow" size={14} strokeWidth={2.2} /></Button>
        ) : (
          <Button variant="accent" onClick={submit} disabled={submitting}>{submitting ? '제출 중...' : '경매 등록 요청'} <Icon name="arrow" size={14} strokeWidth={2.2} /></Button>
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
  return <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">{children}</div>
}
function Field({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <Lbl>{label}</Lbl>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
    </label>
  )
}
function Row({ k, v, highlight }) {
  return (
    <div className="flex justify-between py-2 border-b border-line text-sm">
      <span className="text-mute font-bold">{k}</span>
      <span className={`font-mono font-bold ${highlight ? 'text-dex' : 'text-ink'}`}>{v}</span>
    </div>
  )
}
