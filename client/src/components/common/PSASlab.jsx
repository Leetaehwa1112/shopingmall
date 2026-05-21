import PokeCard from './PokeCard'

const FLAG = { USA: '🇺🇸', JPN: '🇯🇵', KOR: '🇰🇷' }

// PSA / BGS / CGC 슬랩 (인증 케이스) 시각화
export default function PSASlab({ card, size = 'lg' }) {
  const dims = {
    md: { w: 240, h: 360, labelH: 60, cardSize: 'sm' },
    lg: { w: 320, h: 480, labelH: 80, cardSize: 'md' },
    xl: { w: 400, h: 600, labelH: 96, cardSize: 'lg' },
  }[size]

  const score = card.grade.score
  const labelBg = score >= 10 ? '#dc2626' : score >= 9 ? '#1e40af' : '#374151'
  const labelTxt = '#fff'

  return (
    <div
      className="relative rounded-md overflow-hidden bg-white"
      style={{
        width: dims.w,
        height: dims.h,
        boxShadow: '0 12px 40px rgba(13, 23, 48, 0.25), 0 0 0 2px rgba(0,0,0,0.05) inset',
      }}
    >
      {/* PSA Label */}
      <div
        className="flex flex-col items-center justify-center px-3 py-2 relative"
        style={{ background: labelBg, color: labelTxt, height: dims.labelH }}
      >
        <div className="font-mono text-[10px] tracking-[0.3em] opacity-80">CERTIFIED</div>
        <div className="font-display font-black tracking-wider mt-1" style={{ fontSize: dims.labelH * 0.4 }}>
          {card.grade.company} {card.grade.score}
        </div>
        <div className="text-lg mt-1">{FLAG[card.grade.country] ?? '🌐'}</div>
        {/* Side text */}
        <div className="absolute top-1.5 left-2 font-mono text-[9px] opacity-70">★★★★★</div>
        <div className="absolute top-1.5 right-2 font-mono text-[9px] opacity-70">VERIFIED</div>
      </div>

      {/* Card title strip */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-bold text-xs text-gray-900 truncate">{card.name}</div>
          <div className="text-[9px] text-gray-500 font-mono truncate">{card.set}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-gray-500 font-mono">{card.year} · #{card.number}</div>
        </div>
      </div>

      {/* Card window */}
      <div className="p-4 flex justify-center items-center" style={{ background: '#f9fafb' }}>
        <PokeCard card={card} size={dims.cardSize} interactive={false} showShine={false} />
      </div>

      {/* Bottom serial */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
        <div className="font-mono text-[9px] text-gray-500">CERT #</div>
        <div className="font-mono text-xs font-bold text-gray-900 tabular-nums">{card.grade.cert}</div>
        <div className="font-mono text-[9px] text-gray-500">{card.grade.company}.COM</div>
      </div>
    </div>
  )
}
