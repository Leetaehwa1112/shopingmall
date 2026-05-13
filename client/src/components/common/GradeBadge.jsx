// PSA 10 GEM MINT — official-looking label
const styleByScore = (score) => {
  if (score >= 10)  return { bg: '#f5b800', text: '#0d1730', label: '#0d1730', labelTxt: '#fbf7ec' }
  if (score >= 9.5) return { bg: '#cbd5e1', text: '#0d1730', label: '#0d1730', labelTxt: '#fbf7ec' }
  if (score >= 9)   return { bg: '#cd7f32', text: '#fbf7ec', label: '#0d1730', labelTxt: '#fbf7ec' }
  return { bg: '#2a4480', text: '#fbf7ec', label: '#0d1730', labelTxt: '#fbf7ec' }
}

export default function GradeBadge({ grade, size = 'md' }) {
  const s = styleByScore(grade.score)
  const pad = size === 'lg' ? 'px-3 py-2' : size === 'sm' ? 'px-2 py-1' : 'px-2.5 py-1.5'
  const fz = size === 'lg' ? 'text-xs' : 'text-[10px]'
  const big = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'

  return (
    <div
      className={`inline-flex items-stretch font-display font-bold ${fz} rounded-md overflow-hidden elev-1`}
      style={{ background: s.bg, color: s.text }}
    >
      <div className={`${pad} flex items-center gap-1.5 tracking-wide`}>
        <span>{grade.company}</span>
        <span className={`${big} font-black leading-none`}>{grade.score}</span>
      </div>
      <div className={`${pad} flex items-center tracking-wider font-mono`}
        style={{ background: s.label, color: s.labelTxt }}>
        {grade.label}
      </div>
    </div>
  )
}
