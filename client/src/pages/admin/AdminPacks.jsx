import { useState } from 'react'
import { PACKS, formatKRWFull } from '@/api/cards'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import useToastStore from '@/store/toastStore'

export default function AdminPacks() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const list = filter === 'all' ? PACKS : PACKS.filter((p) => p.type === filter)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="pixel-label text-mute mb-3">Packs</div>
          <h1 className="font-display text-4xl font-bold text-ink tracking-tight">카드팩 관리</h1>
        </div>
        <Button variant="accent" onClick={() => setOpen(true)}>
          <Icon name="plus" size={14} strokeWidth={2.5} /> 카드팩 등록
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          ['all', '전체', PACKS.length],
          ['pack', '부스터팩', PACKS.filter((p) => p.type === 'pack').length],
          ['box', '박스', PACKS.filter((p) => p.type === 'box').length],
        ].map(([v, label, count]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-2 text-sm font-bold rounded-full border transition-all ${
              filter === v ? 'bg-ink text-paper border-ink' : 'bg-paper border-line text-ink hover:border-ink/30'
            }`}>
            {label} <span className="opacity-60 font-mono text-xs">{count}</span>
          </button>
        ))}
      </div>

      <div className="surface-soft overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bone-2/50 border-b border-line">
            <tr className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">
              <th className="text-left p-4">이미지</th>
              <th className="text-left p-4">이름</th>
              <th className="text-left p-4">세트</th>
              <th className="text-left p-4">연도</th>
              <th className="text-center p-4">종류</th>
              <th className="text-center p-4">재고</th>
              <th className="text-right p-4">가격</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-bone-2/30">
                <td className="p-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-bone-2 flex items-center justify-center">
                    <img src={p.heroArt} alt={p.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-ink">{p.nameKo}</div>
                  <div className="text-xs text-mute italic">{p.name}</div>
                </td>
                <td className="p-4 text-mute text-xs font-bold">{p.setShort}</td>
                <td className="p-4 text-mute font-mono text-xs">{p.year}</td>
                <td className="p-4 text-center">
                  {p.type === 'box' ? (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">BOX</span>
                  ) : (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full">PACK</span>
                  )}
                </td>
                <td className="p-4 text-center">
                  <span className={`font-mono font-bold text-sm ${p.stock <= 3 ? 'text-dex' : 'text-ink'}`}>
                    {p.stock}
                  </span>
                  {p.stock <= 3 && <span className="ml-1 text-[10px] text-dex font-bold">LOW</span>}
                </td>
                <td className="p-4 text-right font-mono text-ink font-bold tabular-nums">{formatKRWFull(p.price)}</td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button className="text-xs text-ink hover:text-dex font-bold mr-3">수정</button>
                  <button className="text-xs text-mute hover:text-dex font-bold">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <PackModal onClose={() => setOpen(false)} />}
    </div>
  )
}

function PackModal({ onClose }) {
  const toast = useToastStore((s) => s.push)
  const [form, setForm] = useState({
    name: '', nameKo: '', setShort: '', year: '',
    type: 'pack', price: '', stock: '', description: '',
  })

  const submit = (e) => {
    e.preventDefault()
    toast({ type: 'success', title: '카드팩 등록 완료', message: `${form.nameKo || form.name} 등록됨` })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
      <form onSubmit={submit} className="surface-soft max-w-2xl w-full p-8 elev-3">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="pixel-label text-dex mb-2">New Pack</div>
            <h2 className="font-display text-2xl font-bold text-ink">카드팩 등록</h2>
          </div>
          <button type="button" onClick={onClose} className="text-mute hover:text-ink">
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Input label="팩명 (영문)" value={form.name} onChange={(v) => setForm({...form, name: v})} required />
            <Input label="팩명 (한글)" value={form.nameKo} onChange={(v) => setForm({...form, nameKo: v})} />
            <Input label="세트" value={form.setShort} onChange={(v) => setForm({...form, setShort: v})} required />
            <Input label="발매년도" type="number" value={form.year} onChange={(v) => setForm({...form, year: v})} />
          </div>

          <div>
            <div className="text-[11px] text-mute font-bold mb-2 tracking-wide">종류</div>
            <div className="grid grid-cols-2 gap-3">
              {[['pack', '부스터팩'], ['box', '박스']].map(([v, label]) => (
                <button key={v} type="button" onClick={() => setForm({...form, type: v})}
                  className={`p-4 rounded-xl border transition-all ${form.type === v ? 'border-ink bg-ink/[0.03] elev-1' : 'border-line hover:border-ink/30'}`}>
                  <div className="font-display font-bold text-ink">{label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="가격 (원)" type="number" value={form.price} onChange={(v) => setForm({...form, price: v})} required />
            <Input label="재고 수량" type="number" value={form.stock} onChange={(v) => setForm({...form, stock: v})} required />
          </div>

          <div>
            <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">설명</div>
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
              rows={3} placeholder="팩 설명"
              className="w-full bg-bone-2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:border-ink outline-none transition-colors" />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-line">
          <Button variant="ghost" type="button" onClick={onClose}>취소</Button>
          <Button variant="accent" type="submit">등록하기</Button>
        </div>
      </form>
    </div>
  )
}

function Input({ label, value, onChange, ...rest }) {
  return (
    <label className="block">
      <div className="text-[11px] text-mute font-bold mb-1.5 tracking-wide">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
        className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
    </label>
  )
}
