import { useRef, useState } from 'react'

export default function PokeCard({ card, size = 'md', interactive = true, showShine = true }) {
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState(false)

  const dims = {
    xs: { w: 110, h: 154 },
    sm: { w: 160, h: 224 },
    md: { w: 220, h: 308 },
    lg: { w: 300, h: 420 },
    xl: { w: 380, h: 532 },
  }[size]

  const handleMove = (e) => {
    if (!interactive || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    ref.current.style.transform = `perspective(1000px) rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 12}deg) scale(1.02)`
  }
  const handleLeave = () => {
    if (!interactive || !ref.current) return
    ref.current.style.transform = ''
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="relative transition-transform duration-300 ease-out"
      style={{
        width: dims.w,
        height: dims.h,
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(13, 23, 48, 0.18), 0 2px 6px rgba(13, 23, 48, 0.1)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        {!loaded && !err && (
          <div className="absolute inset-0 flex items-center justify-center bg-bone-2">
            <svg width="32" height="32" viewBox="0 0 32 32" className="animate-spin opacity-40">
              <circle cx="16" cy="16" r="12" fill="none" stroke="#0d1730" strokeWidth="3" strokeDasharray="45 30" />
            </svg>
          </div>
        )}
        {!err && (
          <img
            src={card.image}
            alt={card.name}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setErr(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            draggable={false}
          />
        )}
        {err && (
          <div className="absolute inset-0 flex items-center justify-center p-3 text-center bg-bone-2">
            <div>
              <div className="font-display text-lg text-ink mb-1">{card.name}</div>
              <div className="text-xs text-mute">{card.setShort}</div>
            </div>
          </div>
        )}

        {showShine && card.isHolo && (
          <div
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-0 hover:opacity-100 transition-opacity duration-500"
            style={{
              background:
                'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.45) 45%, rgba(245,184,0,0.4) 50%, rgba(255,255,255,0.45) 55%, transparent 70%)',
            }}
          />
        )}
      </div>
    </div>
  )
}
