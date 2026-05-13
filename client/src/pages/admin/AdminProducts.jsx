import { useState } from 'react'
import { ALL_CARDS, formatKRWFull, CATEGORIES } from '@/api/cards'
import PokeCard from '@/components/common/PokeCard'
import GradeBadge from '@/components/common/GradeBadge'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import useToastStore from '@/store/toastStore'

export default function AdminProducts() {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const list = filter === 'all' ? ALL_CARDS : ALL_CARDS.filter((c) => c.type === filter)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="pixel-label text-mute mb-3">Cards</div>
          <h1 className="font-display text-4xl font-bold text-ink tracking-tight">카드 관리</h1>
        </div>
        <Button variant="accent" onClick={() => setOpen(true)}>
          <Icon name="plus" size={14} strokeWidth={2.5} /> 카드 등록
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          ['all', '전체', ALL_CARDS.length],
          ['auction', '경매', ALL_CARDS.filter(c => c.type === 'auction').length],
          ['buynow', '즉시구매', ALL_CARDS.filter(c => c.type === 'buynow').length],
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
              <th className="text-left p-4">Card</th>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Set</th>
              <th className="text-left p-4">Grade</th>
              <th className="text-left p-4">Type</th>
              <th className="text-right p-4">Price</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bone-2/30">
                <td className="p-3"><PokeCard card={c} size="xs" interactive={false} showShine={false} /></td>
                <td className="p-4">
                  <div className="font-bold text-ink">{c.nameKo}</div>
                  <div className="text-xs text-mute italic">{c.name}</div>
                </td>
                <td className="p-4 text-mute text-xs font-bold">{c.setShort}</td>
                <td className="p-4"><GradeBadge grade={c.grade} size="sm" /></td>
                <td className="p-4">
                  {c.type === 'auction' ? (
                    <span className="text-[10px] font-bold bg-dex/10 text-dex border border-dex/30 px-2 py-1 rounded-full tracking-wider inline-flex items-center gap-1.5">
                      <span className="led led-red led-pulse" style={{ width: 5, height: 5 }} />
                      AUCTION
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-blue-50 text-blue border border-blue/30 px-2 py-1 rounded-full tracking-wider">BUY NOW</span>
                  )}
                </td>
                <td className="p-4 text-right font-mono text-ink font-bold tabular-nums">{formatKRWFull(c.price || c.currentBid)}</td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button className="text-xs text-ink hover:text-dex font-bold mr-3">수정</button>
                  <button className="text-xs text-mute hover:text-dex font-bold">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <RegisterModal onClose={() => setOpen(false)} />}
    </div>
  )
}

function RegisterModal({ onClose }) {
  const toast = useToastStore((s) => s.push)
  const [form, setForm] = useState({
    name: '', nameKo: '', set: '', year: '', number: '',
    company: 'PSA', score: '10', cert: '',
    type: 'buynow', price: '', startPrice: '', endsAt: '',
    category: 'base', description: '',
  })

  const submit = (e) => {
    e.preventDefault()
    toast({ type: 'success', title: '카드 등록 완료', message: `${form.nameKo || form.name} 카탈로그에 추가됨` })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
      <form onSubmit={submit} className="surface-soft max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto elev-3">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="pixel-label text-dex mb-2">New Card</div>
            <h2 className="font-display text-2xl font-bold text-ink">카드 등록</h2>
          </div>
          <button type="button" onClick={onClose} className="text-mute hover:text-ink">
            <Icon name="close" size={20} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-6">
          <Sec title="기본 정보">
            <div className="grid grid-cols-2 gap-3">
              <Input label="카드명 (영문)" value={form.name} onChange={(v) => setForm({...form, name: v})} required />
              <Input label="카드명 (한글)" value={form.nameKo} onChange={(v) => setForm({...form, nameKo: v})} />
              <Input label="세트" value={form.set} onChange={(v) => setForm({...form, set: v})} required />
              <Input label="발매년도" type="number" value={form.year} onChange={(v) => setForm({...form, year: v})} />
              <Input label="카드 번호" value={form.number} onChange={(v) => setForm({...form, number: v})} placeholder="4/102" />
              <div>
                <Lbl>카테고리</Lbl>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink font-bold">
                  {CATEGORIES.filter(c => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </Sec>

          <Sec title="등급 정보">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Lbl>등급사</Lbl>
                <select value={form.company} onChange={(e) => setForm({...form, company: e.target.value})}
                  className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink font-bold">
                  <option>PSA</option><option>BGS</option><option>CGC</option>
                </select>
              </div>
              <Input label="점수" value={form.score} onChange={(v) => setForm({...form, score: v})} />
              <Input label="인증서 번호" value={form.cert} onChange={(v) => setForm({...form, cert: v})} />
            </div>
          </Sec>

          <Sec title="판매 방식">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button type="button" onClick={() => setForm({...form, type: 'buynow'})}
                className={`p-4 rounded-xl border transition-all ${form.type === 'buynow' ? 'border-ink bg-ink/[0.03] elev-1' : 'border-line hover:border-ink/30'}`}>
                <div className="font-display font-bold text-ink">즉시 구매</div>
                <div className="text-xs text-mute mt-1">고정 가격</div>
              </button>
              <button type="button" onClick={() => setForm({...form, type: 'auction'})}
                className={`p-4 rounded-xl border transition-all ${form.type === 'auction' ? 'border-ink bg-ink/[0.03] elev-1' : 'border-line hover:border-ink/30'}`}>
                <div className="font-display font-bold text-ink">경매</div>
                <div className="text-xs text-mute mt-1">초희귀 카드만</div>
              </button>
            </div>
            {form.type === 'buynow' ? (
              <Input label="판매가 (원)" type="number" value={form.price} onChange={(v) => setForm({...form, price: v})} required />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Input label="시작가 (원)" type="number" value={form.startPrice} onChange={(v) => setForm({...form, startPrice: v})} required />
                <Input label="옥션 종료" type="datetime-local" value={form.endsAt} onChange={(v) => setForm({...form, endsAt: v})} required />
              </div>
            )}
          </Sec>

          <Sec title="이미지">
            <div className="grid grid-cols-2 gap-3">
              {['앞면', '뒷면'].map((label) => (
                <div key={label} className="border-2 border-dashed border-line hover:border-ink/40 p-8 text-center cursor-pointer rounded-xl bg-bone-2/30 transition-colors">
                  <Icon name="package" size={28} strokeWidth={1.5} className="text-mute mx-auto mb-2" />
                  <div className="text-xs text-mute font-bold">{label} 이미지 업로드</div>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="설명">
            <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
              rows={4} placeholder="카드 컨디션, 출처, 특이사항 등"
              className="w-full bg-bone-2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:border-ink outline-none transition-colors" />
          </Sec>
        </div>

        <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-line">
          <Button variant="ghost" type="button" onClick={onClose}>취소</Button>
          <Button variant="accent" type="submit">등록하기</Button>
        </div>
      </form>
    </div>
  )
}

function Sec({ title, children }) {
  return (
    <div>
      <div className="font-display font-bold text-ink mb-3">{title}</div>
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
        className="w-full bg-bone-2 border border-line rounded-lg px-4 py-2.5 text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
    </label>
  )
}
