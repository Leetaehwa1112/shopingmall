import { useState, useMemo, useRef } from 'react'
import { POKEDEX, ARTWORK_URL, TYPE_TOKEN, TYPE_CHIP, TYPE_BG_SOFT } from '@/constants/pokedex'

// 희귀도 가중치 — Common 60%, Uncommon 25%, Holo 12%, Secret 3%
const RARITIES = [
  { tier: 'common',   label: 'Common',      glow: 'shadow-[0_0_0_2px_rgba(0,0,0,0.1)]', accent: 'from-bone-2 to-paper',     ring: 'border-ink/15',     weight: 60 },
  { tier: 'uncommon', label: 'Uncommon',    glow: 'shadow-[0_0_12px_rgba(132,204,22,0.4)]', accent: 'from-grass/15 to-paper', ring: 'border-grass/40',  weight: 25 },
  { tier: 'holo',     label: 'Holo Rare',   glow: 'shadow-[0_0_18px_rgba(56,189,248,0.5)]', accent: 'from-sky/20 to-paper',   ring: 'border-sky/60',    weight: 12 },
  { tier: 'secret',   label: 'Secret Rare', glow: 'shadow-[0_0_22px_rgba(168,85,247,0.7)]', accent: 'from-psychic/25 to-electric/15', ring: 'border-psychic', weight: 3 },
]

function pickRarity() {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0)
  let n = Math.random() * total
  for (const r of RARITIES) {
    if ((n -= r.weight) < 0) return r
  }
  return RARITIES[0]
}

function drawCards(count = 5) {
  // 매번 다른 포켓몬을 뽑되, 5번째는 무조건 Holo+ 보장 (Pack opening 정석)
  const pool = [...POKEDEX]
  const result = []
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) break
    const idx = Math.floor(Math.random() * pool.length)
    const poke = pool.splice(idx, 1)[0]
    let rarity = pickRarity()
    if (i === count - 1 && RARITIES.indexOf(rarity) < 2) {
      // 마지막 카드는 holo 이상 보장
      rarity = Math.random() < 0.2 ? RARITIES[3] : RARITIES[2]
    }
    result.push({ poke, rarity, key: `${poke.id}-${Date.now()}-${i}` })
  }
  return result
}

// localStorage 저장
const HISTORY_KEY = 'vault-opened-packs'
function saveHistory(packName, cards) {
  try {
    const prev = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    const entry = {
      at: Date.now(),
      pack: packName,
      cards: cards.map((c) => ({ id: c.poke.id, name: c.poke.nameKo, rarity: c.rarity.tier })),
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev].slice(0, 20)))
  } catch {}
}

export default function PackOpener({ pack, onClose }) {
  const [phase, setPhase] = useState('idle')        // idle → tearing → reveal → done
  const [flipped, setFlipped] = useState([])         // index 별 flip 상태
  const cardsRef = useRef(null)

  const cards = useMemo(() => {
    if (phase === 'idle') return []
    return drawCards(pack?.cardsPerPack || 5)
  }, [phase, pack])

  const start = () => {
    setFlipped([])
    setPhase('tearing')
    setTimeout(() => setPhase('reveal'), 1200)
  }

  const flipCard = (i) => {
    setFlipped((f) => {
      if (f.includes(i)) return f
      const next = [...f, i]
      if (next.length === cards.length) {
        saveHistory(pack?.nameKo || pack?.name || 'Pack', cards)
        setTimeout(() => setPhase('done'), 800)
      }
      return next
    })
  }

  const flipAll = () => {
    setFlipped(cards.map((_, i) => i))
    saveHistory(pack?.nameKo || pack?.name || 'Pack', cards)
    setTimeout(() => setPhase('done'), 600)
  }

  const reset = () => {
    setPhase('idle')
    setFlipped([])
  }

  // ─── 모달 ────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-ink/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="팩 개봉"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'tearing') onClose?.()
      }}
    >
      <div className="bg-paper rounded-3xl border-2 border-ink shadow-[0_8px_0_#1a1a1a] max-w-4xl w-full overflow-hidden max-h-[94vh] flex flex-col">
        {/* 헤더 */}
        <header className="bg-dex text-white px-6 py-4 flex items-center justify-between border-b-2 border-ink">
          <div className="flex items-center gap-3">
            <span className="inline-block w-3 h-3 rounded-full bg-electric ring-2 ring-paper/50 animate-pulse" />
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/70">Pack Opening</div>
              <div className="font-display text-xl font-bold leading-tight">{pack?.nameKo || pack?.name || 'Booster Pack'}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'tearing'}
            className="w-9 h-9 rounded-full bg-ink/40 hover:bg-ink/70 text-white flex items-center justify-center transition-all disabled:opacity-30"
            aria-label="닫기"
          >
            ✕
          </button>
        </header>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto bg-bone p-6 sm:p-8" ref={cardsRef}>
          {phase === 'idle' && (
            <IdleStage pack={pack} onOpen={start} />
          )}

          {phase === 'tearing' && (
            <TearingStage pack={pack} />
          )}

          {(phase === 'reveal' || phase === 'done') && (
            <RevealStage
              cards={cards}
              flipped={flipped}
              onFlip={flipCard}
              onFlipAll={flipAll}
              done={phase === 'done'}
            />
          )}
        </div>

        {/* 푸터 */}
        {phase === 'done' && (
          <footer className="bg-ink/95 px-6 py-4 border-t-2 border-ink flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-grass">
              ✓ 개봉 기록이 저장되었습니다
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="h-9 px-4 rounded-full border-2 border-paper/30 text-white/90 hover:border-paper hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                또 열기
              </button>
              <button
                onClick={onClose}
                className="h-9 px-5 rounded-full bg-electric border-2 border-electric text-ink font-bold text-xs uppercase tracking-wider hover:bg-paper hover:border-paper transition-colors"
              >
                닫기
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

// ─── Idle: 개봉 전 ─────────────────────────────────────
function IdleStage({ pack, onOpen }) {
  return (
    <div className="text-center py-10">
      <div className="inline-block mb-6 relative">
        <div className="absolute inset-0 bg-electric/30 blur-3xl rounded-full" aria-hidden />
        <div className="relative w-40 h-56 mx-auto rounded-2xl bg-gradient-to-br from-dex via-rose-600 to-dex/80 border-2 border-ink shadow-[0_8px_0_#1a1a1a] flex items-center justify-center text-white">
          <div className="text-center px-3">
            <div className="font-display text-2xl font-bold leading-tight drop-shadow">
              {pack?.setShort || 'BOOSTER'}
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider mt-2 text-white/80">
              {pack?.cardsPerPack || 5} cards
            </div>
          </div>
        </div>
      </div>

      <h3 className="font-display text-3xl font-bold text-ink mb-2">
        두근거리는 그 순간을 열어볼까요?
      </h3>
      <p className="text-mute text-sm font-medium mb-7 max-w-md mx-auto">
        Holo, Secret Rare가 나올 확률은 동일해요. 한 번에 한 장씩, 또는 한꺼번에 뒤집을 수 있어요.
      </p>

      <button
        onClick={onOpen}
        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-electric border-2 border-ink text-ink font-bold text-base shadow-[0_5px_0_#1a1a1a] hover:shadow-[0_3px_0_#1a1a1a] hover:translate-y-[2px] active:shadow-[0_0_0_#1a1a1a] active:translate-y-[5px] transition-all"
      >
        📦 팩 뜯기
      </button>

      <div className="mt-6 text-[10px] font-mono uppercase tracking-wider text-mute/70">
        ※ 실제 카드는 지급되지 않는 데모 인터랙션이에요
      </div>
    </div>
  )
}

// ─── Tearing: 찢는 애니메이션 ────────────────────────────
function TearingStage() {
  return (
    <div className="py-16 text-center">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-electric/40 blur-3xl rounded-full animate-pulse" aria-hidden />
        <div className="relative">
          <div className="text-7xl animate-bounce">📦</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-7xl animate-ping opacity-30">✨</div>
          </div>
        </div>
      </div>
      <div className="mt-8 font-display text-2xl font-bold text-ink animate-pulse">
        팩을 열고 있어요…
      </div>
      <div className="mt-2 text-xs font-mono uppercase tracking-[0.2em] text-mute">
        Sealed → Opening …
      </div>
    </div>
  )
}

// ─── Reveal: 카드 그리드 (뒤집기) ────────────────────────
function RevealStage({ cards, flipped, onFlip, onFlipAll, done }) {
  const allFlipped = flipped.length === cards.length
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] font-bold text-grass">
            ✨ Ready to reveal
          </div>
          <div className="font-display text-xl font-bold text-ink mt-0.5">
            카드를 눌러 뒤집어보세요 ({flipped.length}/{cards.length})
          </div>
        </div>
        {!allFlipped && (
          <button
            onClick={onFlipAll}
            className="h-9 px-4 rounded-full bg-ink text-white font-bold text-xs uppercase tracking-wider hover:bg-ink/85 transition-colors"
          >
            전부 뒤집기 →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((c, i) => (
          <RevealCard
            key={c.key}
            card={c}
            flipped={flipped.includes(i)}
            onClick={() => onFlip(i)}
            order={i}
          />
        ))}
      </div>

      {done && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {RARITIES.map((r) => {
            const n = cards.filter((c) => c.rarity.tier === r.tier).length
            if (n === 0) return null
            return (
              <div key={r.tier} className={`px-4 py-3 rounded-xl bg-paper border-2 ${r.ring}`}>
                <div className="font-mono text-[9px] uppercase tracking-wider text-mute">{r.label}</div>
                <div className="font-display text-xl font-bold text-ink tabular-nums">{n}장</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Single card (앞/뒤) ──────────────────────────────────
function RevealCard({ card, flipped, onClick, order }) {
  const { poke, rarity } = card
  const tok = TYPE_TOKEN[poke.types[0]] || 'mute'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={flipped}
      style={{ animationDelay: `${order * 80}ms` }}
      className={
        'group relative aspect-[3/4] rounded-2xl overflow-hidden ' +
        'border-2 border-ink transition-all duration-500 ' +
        (flipped ? rarity.glow : 'shadow-[0_4px_0_#1a1a1a] hover:-translate-y-1 hover:shadow-[0_6px_0_#1a1a1a]') +
        ' focus:outline-none focus-visible:ring-4 focus-visible:ring-electric'
      }
    >
      {/* 뒷면 */}
      <div
        className={
          'absolute inset-0 transition-all duration-500 ' +
          (flipped ? 'opacity-0 rotate-y-180 scale-90 pointer-events-none' : 'opacity-100')
        }
      >
        <div className="w-full h-full bg-gradient-to-br from-sky-500 via-sky-700 to-sky-900 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-2 rounded-xl border-2 border-paper/40" aria-hidden />
          <div className="relative text-center text-white">
            <div className="font-display text-2xl font-bold drop-shadow-lg">Poké</div>
            <div className="w-10 h-10 mx-auto my-1 rounded-full bg-paper border-[3px] border-ink relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-dex" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-ink" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-paper border-2 border-ink" />
            </div>
            <div className="font-display text-2xl font-bold drop-shadow-lg rotate-180">Poké</div>
          </div>
        </div>
      </div>

      {/* 앞면 */}
      <div
        className={
          'absolute inset-0 transition-all duration-500 ' +
          (flipped ? 'opacity-100 scale-100' : 'opacity-0 -rotate-y-180 scale-90')
        }
      >
        <div className={`w-full h-full bg-gradient-to-b ${TYPE_BG_SOFT[tok]} to-paper flex flex-col items-center justify-between p-3`}>
          {/* 희귀도 라벨 */}
          <div className="w-full flex items-center justify-between text-[9px] font-mono font-bold tracking-wider uppercase">
            <span className="text-mute">№ {String(poke.id).padStart(3, '0')}</span>
            <span className={
              rarity.tier === 'secret'   ? 'text-psychic' :
              rarity.tier === 'holo'     ? 'text-sky-600' :
              rarity.tier === 'uncommon' ? 'text-grass' :
                                           'text-mute'
            }>★ {rarity.label}</span>
          </div>

          <img
            src={ARTWORK_URL(poke.id)}
            alt={poke.nameKo}
            loading="lazy"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md"
          />

          <div className="w-full text-center">
            <div className="font-display text-base font-bold text-ink leading-tight">{poke.nameKo}</div>
            <div className="flex justify-center gap-1 mt-1.5 flex-wrap">
              {poke.types.slice(0, 2).map((t) => {
                const ttok = TYPE_TOKEN[t] || 'mute'
                return (
                  <span key={t} className={`text-[8px] font-bold border px-1.5 py-px rounded-full ${TYPE_CHIP[ttok]}`}>
                    {t}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 펄스 글로우 (secret 만) */}
      {flipped && rarity.tier === 'secret' && (
        <div className="absolute inset-0 ring-4 ring-psychic/60 ring-offset-2 ring-offset-paper rounded-2xl animate-pulse pointer-events-none" aria-hidden />
      )}
    </button>
  )
}
