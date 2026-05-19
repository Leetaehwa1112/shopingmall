import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/api/axios'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import ImageUpload from '@/components/common/ImageUpload'
import useToastStore from '@/store/toastStore'

export default function AdminPackEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.push)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({
    sku: '', name: '', nameKo: '', setShort: '', year: '',
    type: 'pack', price: '', stock: '', description: '',
    heroArt: '', setLogo: '', status: 'active',
  })

  useEffect(() => {
    api.get(`/packs/${id}`)
      .then(({ data }) => {
        const p = data.data
        setForm({
          sku: p.sku ?? '',
          name: p.name ?? '',
          nameKo: p.nameKo ?? '',
          setShort: p.setShort ?? '',
          year: p.year ?? '',
          type: p.type ?? 'pack',
          price: p.price ?? '',
          stock: p.stock ?? '',
          description: p.description ?? '',
          heroArt: p.heroArt ?? '',
          setLogo: p.setLogo ?? '',
          status: p.status ?? 'active',
        })
      })
      .catch(() => toast({ type: 'error', title: '불러오기 실패', message: '팩 정보를 가져오지 못했습니다.' }))
      .finally(() => setFetching(false))
  }, [id])

  const f = (key) => (v) => setForm((prev) => ({ ...prev, [key]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/packs/${id}`, {
        name: form.name,
        nameKo: form.nameKo,
        setShort: form.setShort,
        year: form.year ? Number(form.year) : undefined,
        type: form.type,
        price: Number(form.price),
        stock: Number(form.stock),
        description: form.description,
        heroArt: form.heroArt,
        setLogo: form.setLogo,
        status: form.status,
      })
      toast({ type: 'success', title: '수정 완료', message: `${form.nameKo || form.name} 수정됨` })
      navigate('/admin/packs')
    } catch (err) {
      const msg = err.response?.data?.message
      toast({ type: 'error', title: '수정 실패', message: Array.isArray(msg) ? msg.join(', ') : msg || '오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="py-20 text-center text-mute font-bold">불러오는 중...</div>
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/packs')}
          className="flex items-center gap-1.5 text-sm text-mute hover:text-ink font-bold transition-colors">
          <Icon name="arrow" size={14} strokeWidth={2.2} className="rotate-180" /> 카드팩 관리
        </button>
        <span className="text-line">/</span>
        <div>
          <div className="inline-flex items-center gap-2 mb-2"><span className="led led-yellow led-pulse" style={{ width: 6, height: 6 }} /><span className="text-[10px] font-bold tracking-[0.18em] text-electric uppercase">Edit Pack · 팩 수정</span></div>
          <h1 className="font-display text-3xl font-bold text-ink">카드팩 수정</h1>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Section title="기본 정보">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">SKU</div>
              <div className="w-full bg-bone-2/60 border border-ink/15 rounded-lg px-4 py-2.5 text-sm text-mute font-mono font-bold cursor-not-allowed">
                {form.sku}
              </div>
            </div>
            <div />
            <Input label="팩명 (영문) *" value={form.name} onChange={f('name')} required />
            <Input label="팩명 (한글)" value={form.nameKo} onChange={f('nameKo')} />
            <Input label="세트명" value={form.setShort} onChange={f('setShort')} />
            <Input label="발매년도" type="number" value={form.year} onChange={f('year')} />
          </div>
        </Section>

        <Section title="종류">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['pack', '부스터팩', '단품 팩 (10장 내외)'],
              ['box', '박스 · 컬렉션', 'ETB / 부스터박스'],
            ].map(([val, label, desc]) => (
              <button key={val} type="button" onClick={() => f('type')(val)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.type === val ? 'border-ink bg-ink/[0.03] ' : 'border-ink/15 hover:border-ink/30'
                }`}>
                <div className="font-display font-bold text-ink">{label}</div>
                <div className="text-xs text-mute mt-1">{desc}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="가격 · 재고">
          <div className="grid grid-cols-2 gap-4">
            <Input label="가격 (원) *" type="number" value={form.price} onChange={f('price')} required />
            <Input label="재고 수량 *" type="number" value={form.stock} onChange={f('stock')} required />
          </div>
        </Section>

        <Section title="이미지">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">대표 이미지</div>
              <ImageUpload value={form.heroArt} onChange={f('heroArt')} folder="pokevault/packs" label="패키지 이미지 업로드" />
            </div>
            <div>
              <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">세트 로고</div>
              <ImageUpload value={form.setLogo} onChange={f('setLogo')} folder="pokevault/packs" label="세트 로고 업로드" />
            </div>
          </div>
        </Section>

        <Section title="상태">
          <div className="flex gap-3">
            {[['active', '판매중'], ['sold_out', '품절'], ['hidden', '숨김']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => f('status')(val)}
                className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                  form.status === val ? 'border-ink bg-ink/[0.04] text-ink ' : 'border-ink/15 text-mute hover:border-ink/30'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="설명">
          <textarea value={form.description} onChange={(e) => f('description')(e.target.value)}
            rows={4} placeholder="팩 구성, 특이사항 등"
            className="w-full bg-bone-2 border border-ink/15 rounded-xl px-4 py-3 text-sm text-ink focus:border-ink outline-none transition-colors" />
        </Section>

        <div className="flex gap-3 justify-end pt-6 border-t border-ink/15">
          <Button variant="ghost" type="button" onClick={() => navigate('/admin/packs')} disabled={loading}>취소</Button>
          <Button variant="accent" type="submit" disabled={loading}>
            {loading ? '저장 중...' : '저장하기'}
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
function Input({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border border-ink/15 rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
    </label>
  )
}
