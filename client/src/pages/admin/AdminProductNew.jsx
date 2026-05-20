import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '@/api/cards'
import api from '@/api/axios'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import ImageUpload from '@/components/common/ImageUpload'
import useToastStore from '@/store/toastStore'

export default function AdminProductNew() {
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.push)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    sku: '', name: '', nameKo: '', set: '', year: '', number: '',
    company: 'PSA', score: '10', cert: '', country: 'USA',
    type: 'buynow', price: '', startPrice: '', buyNowPrice: '', endsAt: '',
    category: 'base', description: '',
    imageFront: '', imageBack: '',
  })

  const f = (key) => (v) => setForm((prev) => ({ ...prev, [key]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const isAuction = form.type === 'auction'
      await api.post('/products', {
        sku: form.sku,
        name: form.nameKo || form.name,
        price: Number(isAuction ? form.startPrice : form.price),
        category: form.category,
        description: form.description,
        sale_type: isAuction ? 'auction' : 'buynow',
        stock: 1,
        images: [form.imageFront, form.imageBack].filter(Boolean),
        // 경매: 시작가 / 종료 / 선택적 즉시낙찰가
        ...(isAuction ? {
          startPrice: Number(form.startPrice),
          endsAt: form.endsAt,
          buyNowPrice: form.buyNowPrice ? Number(form.buyNowPrice) : null,
        } : {}),
      })
      toast({ type: 'success', title: '카드 등록 완료', message: `${form.nameKo || form.name} 등록됨` })
      navigate('/admin/products')
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ type: 'error', title: '등록 실패', message: Array.isArray(msg) ? msg.join(', ') : msg || '오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/products')}
          className="flex items-center gap-1.5 text-sm text-mute hover:text-ink font-bold transition-colors">
          <Icon name="arrow" size={14} strokeWidth={2.2} className="rotate-180" /> 카드 관리
        </button>
        <span className="text-line">/</span>
        <div>
          <div className="inline-flex items-center gap-2 mb-2"><span className="led led-red led-pulse" style={{ width: 6, height: 6 }} /><span className="text-[10px] font-bold tracking-[0.18em] text-fire uppercase">New Card · 새 카드 등록</span></div>
          <h1 className="font-display text-3xl font-bold text-ink">카드 등록</h1>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-8">
        {/* 기본 정보 */}
        <Section title="기본 정보">
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU *" value={form.sku} onChange={f('sku')} placeholder="BASE-001" required />
            <div>
              <Lbl>카테고리 *</Lbl>
              <select value={form.category} onChange={(e) => f('category')(e.target.value)}
                className="w-full bg-bone-2 border border-ink/15 rounded-lg px-4 py-2.5 text-sm text-ink font-bold focus:border-ink outline-none">
                {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <Input label="카드명 (영문) *" value={form.name} onChange={f('name')} required />
            <Input label="카드명 (한글)" value={form.nameKo} onChange={f('nameKo')} />
            <Input label="세트" value={form.set} onChange={f('set')} />
            <Input label="발매년도" type="number" value={form.year} onChange={f('year')} />
            <Input label="카드 번호" value={form.number} onChange={f('number')} placeholder="4/102" />
          </div>
        </Section>

        {/* 등급 정보 */}
        <Section title="등급 정보">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <Lbl>등급사</Lbl>
              <select value={form.company} onChange={(e) => f('company')(e.target.value)}
                className="w-full bg-bone-2 border border-ink/15 rounded-lg px-4 py-2.5 text-sm text-ink font-bold focus:border-ink outline-none">
                <option>PSA</option><option>BGS</option><option>CGC</option>
              </select>
            </div>
            <Input label="점수" value={form.score} onChange={f('score')} />
            <Input label="인증서 번호" value={form.cert} onChange={f('cert')} />
          </div>
          <div>
            <Lbl>카드 언어판</Lbl>
            <div className="flex gap-3">
              {[['USA', '🇺🇸', 'US판'], ['JPN', '🇯🇵', 'JP판'], ['KOR', '🇰🇷', 'KR판']].map(([val, flag, label]) => (
                <button key={val} type="button" onClick={() => f('country')(val)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                    form.country === val ? 'border-ink bg-ink/[0.04] ' : 'border-ink/15 hover:border-ink/30'
                  }`}>
                  <span className="text-xl">{flag}</span> {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* 판매 방식 */}
        <Section title="판매 방식">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button type="button" onClick={() => f('type')('buynow')}
              className={`p-4 rounded-xl border transition-all ${form.type === 'buynow' ? 'border-ink bg-ink/[0.03] ' : 'border-ink/15 hover:border-ink/30'}`}>
              <div className="font-display font-bold text-ink">즉시 구매</div>
              <div className="text-xs text-mute mt-1">고정 가격</div>
            </button>
            <button type="button" onClick={() => f('type')('auction')}
              className={`p-4 rounded-xl border transition-all ${form.type === 'auction' ? 'border-ink bg-ink/[0.03] ' : 'border-ink/15 hover:border-ink/30'}`}>
              <div className="font-display font-bold text-ink">경매</div>
              <div className="text-xs text-mute mt-1">초희귀 카드만</div>
            </button>
          </div>
          {form.type === 'buynow' ? (
            <Input label="판매가 (원) *" type="number" value={form.price} onChange={f('price')} required />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="시작가 (원) *" type="number" value={form.startPrice} onChange={f('startPrice')} required />
                <Input label="옥션 종료 *" type="datetime-local" value={form.endsAt} onChange={f('endsAt')} required />
              </div>
              <Input
                label="즉시낙찰가 (원, 선택)"
                type="number"
                value={form.buyNowPrice}
                onChange={f('buyNowPrice')}
                placeholder="비워두면 즉시낙찰 불가 — 시간만료까지 경매"
              />
              <div className="text-[11px] text-mute font-medium leading-relaxed -mt-2">
                💎 설정 시: 이 금액에 도달하면 경매 즉시 종료 + 낙찰<br />
                ⚪ 미설정 시: 종료시각까지 일반 경매로만 진행 (입찰 상한 = 시작가의 5배)
              </div>
            </div>
          )}
        </Section>

        {/* 이미지 */}
        <Section title="이미지">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">앞면</div>
              <ImageUpload value={form.imageFront} onChange={f('imageFront')} folder="pokevault/cards" label="앞면 이미지 업로드" />
            </div>
            <div>
              <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">뒷면</div>
              <ImageUpload value={form.imageBack} onChange={f('imageBack')} folder="pokevault/cards" label="뒷면 이미지 업로드" />
            </div>
          </div>
        </Section>

        {/* 설명 */}
        <Section title="설명">
          <textarea value={form.description} onChange={(e) => f('description')(e.target.value)}
            rows={4} placeholder="카드 컨디션, 출처, 특이사항 등"
            className="w-full bg-bone-2 border border-ink/15 rounded-xl px-4 py-3 text-sm text-ink focus:border-ink outline-none transition-colors" />
        </Section>

        <div className="flex gap-3 justify-end pt-6 border-t border-ink/15">
          <Button variant="ghost" type="button" onClick={() => navigate('/admin/products')} disabled={loading}>취소</Button>
          <Button variant="accent" type="submit" disabled={loading}>
            {loading ? '등록 중...' : '등록하기'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="surface-pop p-6 ">
      <div className="font-display font-bold text-ink text-lg mb-4">{title}</div>
      {children}
    </div>
  )
}
function Lbl({ children }) {
  return <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">{children}</div>
}
function Input({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <Lbl>{label}</Lbl>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border border-ink/15 rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
    </label>
  )
}
