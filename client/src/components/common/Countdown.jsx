import { useEffect, useState } from 'react'
import { timeUntil } from '@/api/cards'

export default function Countdown({ endsAt, size = 'md', label = true }) {
  const [t, setT] = useState(() => timeUntil(endsAt))
  useEffect(() => {
    const id = setInterval(() => setT(timeUntil(endsAt)), 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (t.ended) return <span className="text-mute text-sm">종료됨</span>

  const urgent = t.totalMs < 1000 * 60 * 60
  const critical = t.totalMs < 1000 * 60

  const sizes = {
    sm: { box: 'min-w-[28px] h-7 text-sm',  sep: 'text-sm',  lbl: 'text-[8px]' },
    md: { box: 'min-w-[44px] h-12 text-2xl', sep: 'text-xl', lbl: 'text-[9px]' },
    lg: { box: 'min-w-[60px] h-16 text-4xl', sep: 'text-3xl', lbl: 'text-[10px]' },
  }[size]

  const tone = critical
    ? { bg: 'bg-dex', text: 'text-white', accent: 'text-dex' }
    : urgent
      ? { bg: 'bg-gold', text: 'text-ink', accent: 'text-gold' }
      : { bg: 'bg-ink', text: 'text-white', accent: 'text-ink' }

  return (
    <div className="inline-flex items-center gap-1.5 font-mono font-bold tabular-nums">
      {t.d > 0 && (
        <>
          <Unit num={t.d} l="DAY" sizes={sizes} tone={tone} showLabel={label} />
          <span className={`${sizes.sep} text-mute`}>:</span>
        </>
      )}
      <Unit num={t.h} l="HR"  sizes={sizes} tone={tone} showLabel={label} />
      <span className={`${sizes.sep} ${tone.accent} blink`}>:</span>
      <Unit num={t.m} l="MIN" sizes={sizes} tone={tone} showLabel={label} />
      <span className={`${sizes.sep} ${tone.accent} blink`}>:</span>
      <Unit num={t.s} l="SEC" sizes={sizes} tone={tone} showLabel={label} />
    </div>
  )
}

function Unit({ num, l, sizes, tone, showLabel }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`${sizes.box} ${tone.bg} ${tone.text} rounded-md flex items-center justify-center px-1.5 elev-1 leading-none`}>
        {String(num).padStart(2, '0')}
      </span>
      {showLabel && <span className={`${sizes.lbl} text-mute mt-1.5 tracking-[0.2em] font-bold`}>{l}</span>}
    </div>
  )
}
