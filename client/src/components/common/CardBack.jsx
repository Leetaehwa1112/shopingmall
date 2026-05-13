// 포켓몬 카드 뒷면 — TCG 클래식 디자인
export default function CardBack({ size = 'lg' }) {
  const dims = {
    sm: { w: 160, h: 224 },
    md: { w: 220, h: 308 },
    lg: { w: 300, h: 420 },
    xl: { w: 380, h: 532 },
  }[size]

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        width: dims.w,
        height: dims.h,
        background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 50%, #1e3a8a 100%)',
        boxShadow: '0 10px 30px rgba(13, 23, 48, 0.25)',
      }}
    >
      {/* outer frame */}
      <div className="absolute inset-2 rounded-lg border-2 border-yellow-400" />
      <div className="absolute inset-3 rounded-md border border-blue-300/40" />

      {/* center oval Pokéball */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="relative" style={{ width: dims.w * 0.55, height: dims.w * 0.55 }}>
          {/* Pokéball */}
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="#fff" stroke="#000" strokeWidth="3" />
            <path d="M 4 50 A 46 46 0 0 1 96 50 Z" fill="#dc2626" stroke="#000" strokeWidth="3" />
            <line x1="4" y1="50" x2="96" y2="50" stroke="#000" strokeWidth="3" />
            <circle cx="50" cy="50" r="14" fill="#fff" stroke="#000" strokeWidth="3" />
            <circle cx="50" cy="50" r="6" fill="#fff" stroke="#000" strokeWidth="2" />
          </svg>
        </div>
        <div
          className="font-display font-black text-yellow-300 leading-none italic tracking-wider"
          style={{ fontSize: dims.w * 0.18, textShadow: '2px 2px 0 #000, -1px -1px 0 #000' }}
        >
          Pokémon
        </div>
        <div
          className="font-bold text-blue-200 tracking-[0.3em]"
          style={{ fontSize: dims.w * 0.05 }}
        >
          TRADING CARD GAME
        </div>
      </div>

      {/* Corner ornaments */}
      <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 border-yellow-400" />
      <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 border-yellow-400" />
      <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 border-yellow-400" />
      <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 border-yellow-400" />
    </div>
  )
}
