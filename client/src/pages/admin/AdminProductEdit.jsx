import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES } from '@/api/cards'
import api from '@/api/axios'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import ImageUpload from '@/components/common/ImageUpload'
import useToastStore from '@/store/toastStore'

export default function AdminProductEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToastStore((s) => s.push)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm] = useState({
    sku: '', name: '', category: 'base', description: '',
    sale_type: 'buynow', price: '', stock: '', status: 'active',
    imageFront: '', imageBack: '',
  })

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(({ data }) => {
        const p = data.data
        setForm({
          sku: p.sku ?? '',
          name: p.name ?? '',
          category: p.category ?? 'base',
          description: p.description ?? '',
          sale_type: p.sale_type ?? 'buynow',
          price: p.price ?? '',
          stock: p.stock ?? '',
          status: p.status ?? 'active',
          imageFront: p.images?.[0] ?? '',
          imageBack: p.images?.[1] ?? '',
        })
      })
      .catch(() => toast({ type: 'error', title: '불러오기 실패', message: '카드 정보를 가져오지 못했습니다.' }))
      .finally(() => setFetching(false))
  }, [id])

  const f = (key) => (v) => setForm((prev) => ({ ...prev, [key]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/products/${id}`, {
        name: form.name,
        category: form.category,
        description: form.description,
        sale_type: form.sale_type,
        price: Number(form.price),
        stock: Number(form.stock),
        status: form.status,
        images: [form.imageFront, form.imageBack].filter(Boolean),
      })
      toast({ type: 'success', title: '수정 완료', message: `${form.name} 수정됨` })
      navigate('/admin/products')
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
        <button onClick={() => navigate('/admin/products')}
          className="flex items-center gap-1.5 text-sm text-mute hover:text-ink font-bold transition-colors">
          <Icon name="arrow" size={14} strokeWidth={2.2} className="rotate-180" /> 카드 관리
        </button>
        <span className="text-line">/</span>
        <div>
          <div className="pixel-label text-amber-500 mb-1">Edit Card</div>
          <h1 className="font-display text-3xl font-bold text-ink">카드 수정</h1>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-8">
        <Section title="기본 정보">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Lbl>SKU</Lbl>
              <div className="w-full bg-bone-2/60 border border-line rounded-lg px-4 py-2.5 text-sm text-mute font-mono font-bold cursor-not-allowed">
                {form.sku}
              </div>
            </div>
            <div>
              <Lbl>카테고리 *</Lbl>
              <select value={form.category} onChange={(e) => f('category')(e.target.value)}
                className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink font-bold focus:border-ink outline-none">
                {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <Input label="카드명 *" value={form.name} onChange={f('name')} required className="col-span-2" />
            <Input label="가격 (원) *" type="number" value={form.price} onChange={f('price')} required />
            <Input label="재고 수량 *" type="number" value={form.stock} onChange={f('stock')} required />
          </div>
        </Section>

        <Section title="판매 방식">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[['buynow', '즉시 구매', '고정 가격'], ['auction', '경매', '초희귀 카드만']].map(([val, label, desc]) => (
              <button key={val} type="button" onClick={() => f('sale_type')(val)}
                className={`p-4 rounded-xl border transition-all ${form.sale_type === val ? 'border-ink bg-ink/[0.03] elev-1' : 'border-line hover:border-ink/30'}`}>
                <div className="font-display font-bold text-ink">{label}</div>
                <div className="text-xs text-mute mt-1">{desc}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="상태">
          <div className="flex gap-3">
            {[['active', '판매중'], ['sold_out', '품절'], ['hidden', '숨김']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => f('status')(val)}
                className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                  form.status === val ? 'border-ink bg-ink/[0.04] text-ink elev-1' : 'border-line text-mute hover:border-ink/30'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </Section>

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

        <Section title="설명">
          <textarea value={form.description} onChange={(e) => f('description')(e.target.value)}
            rows={4} placeholder="카드 컨디션, 출처, 특이사항 등"
            className="w-full bg-bone-2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:border-ink outline-none transition-colors" />
        </Section>

        <div className="flex gap-3 justify-end pt-6 border-t border-line">
          <Button variant="ghost" type="button" onClick={() => navigate('/admin/products')} disabled={loading}>취소</Button>
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
    <div className="surface-soft p-6 elev-1">
      <div className="font-display font-bold text-ink text-lg mb-4">{title}</div>
      {children}
    </div>
  )
}
function Lbl({ children }) {
  return <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">{children}</div>
}
function Input({ label, value, onChange, className = '', ...rest }) {
  return (
    <label className={`block ${className}`}>
      <Lbl>{label}</Lbl>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
    </label>
  )
}
