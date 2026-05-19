// 카드 디테일 — 4개 코너 줌인 + 센터링 측정 시각화
export default function CardDetail({ card, size = 'lg' }) {
  const dims = {
    md: { w: 240, h: 360 },
    lg: { w: 320, h: 460 },
    xl: { w: 400, h: 560 },
  }[size]

  const imgUrl = card.image
  const corners = [
    { pos: { top: 0, left: 0 },        bg: '0% 0%',     label: 'TL' },
    { pos: { top: 0, right: 0 },       bg: '100% 0%',   label: 'TR' },
    { pos: { bottom: 0, left: 0 },     bg: '0% 100%',   label: 'BL' },
    { pos: { bottom: 0, right: 0 },    bg: '100% 100%', label: 'BR' },
  ]

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-bone-2 border border-line p-4"
      style={{ width: dims.w, height: dims.h }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="pixel-label text-mute">CONDITION REPORT</span>
        <span className="font-mono text-[10px] font-bold text-emerald-700">PASS ✓</span>
      </div>

      {/* 4 corner zooms */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {corners.map((c) => (
          <div key={c.label} className="relative aspect-square rounded-md overflow-hidden bg-white border border-line">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${imgUrl})`,
                backgroundSize: '320%',
                backgroundPosition: c.bg,
                backgroundRepeat: 'no-repeat',
              }}
            />
            <div className="absolute top-1 left-1 px-1 py-0.5 bg-ink/80 text-white text-[8px] font-mono font-bold rounded">
              {c.label}
            </div>
            <div className="absolute bottom-1 right-1 inline-flex items-center gap-0.5 px-1 py-0.5 bg-emerald-500/90 text-white text-[8px] font-bold rounded">
              ✓
            </div>
          </div>
        ))}
      </div>

      {/* Centering measurement bar */}
      <div className="bg-paper rounded-md border border-line p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="pixel-label text-mute">CENTERING</span>
          <span className="font-mono text-[10px] font-bold text-emerald-700">55 / 45</span>
        </div>
        <div className="relative h-3 bg-bone-2 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-emerald-500/40" style={{ width: '55%' }} />
          <div className="absolute inset-y-0 left-[55%] w-0.5 bg-ink" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-ink/30" />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-mute mt-1">
          <span>L 55%</span>
          <span>50% (ideal)</span>
          <span>R 45%</span>
        </div>
      </div>

      {/* Check items */}
      <div className="grid grid-cols-2 gap-1.5 mt-3 text-[10px]">
        {['모서리', '엣지', '표면', '인쇄'].map((k) => (
          <div key={k} className="flex items-center gap-1.5 px-2 py-1 bg-paper rounded border border-line">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500 text-white text-[8px] font-bold">✓</span>
            <span className="text-ink font-bold">{k}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
