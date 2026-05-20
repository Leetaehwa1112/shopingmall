/**
 * IntroPage — `/today` 풀스크린 시네마틱 인트로.
 *
 * 톤: Pokédex 부팅 시퀀스 (레트로 컴퓨터 부팅 + LED 깜빡 + CRT 스캔라인).
 *
 * 시퀀스 (총 약 4초):
 *   T+0.0s  검은 화면 + LED 1번 점멸 (전원 켜는 소리 느낌)
 *   T+0.4s  타이프라이터 "POKÉDEX BOOTING..." 라인 1
 *   T+1.0s  "SCANNING TODAY'S CATALOG..." 라인 2
 *   T+1.8s  "▶ TODAY'S LOT IDENTIFIED" — 큰 헤드라인
 *   T+2.4s  Pokédex 케이싱이 슬라이드 인 (좌측에서) + 카드 reveal (우측 회전 단상)
 *   T+3.4s  메타 라벨 + ENTER 버튼 페이드 인
 *
 * 사용자가 어느 시점에든 [Space] 또는 [ENTER] 또는 화면 클릭으로 즉시 스킵.
 *
 * 라우팅: Layout 바깥 (헤더/푸터 없음). ENTER 버튼은 navigate('/').
 *   LIVE 경매가 없으면 즉시 / 로 리다이렉트 (인트로 콘텐츠 없음).
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/api/axios'
import { normalizeProduct } from '@/api/normalize'
import { formatKRWFull } from '@/api/cards'
import PokeCard from '@/components/common/PokeCard'
import Sparkles from '@/components/common/Sparkles'
import Icon from '@/components/common/Icon'
import GradeBadge from '@/components/common/GradeBadge'

const fetchTopLot = () =>
  api.get('/products', {
    params: { sale_type: 'auction', status: 'active', limit: 1 }
  }).then((r) => r.data.data.map(normalizeProduct)[0] || null)

export default function IntroPage() {
  const navigate = useNavigate()
  const { data: lot, isLoading } = useQuery({
    queryKey: ['intro-top-lot'],
    queryFn: fetchTopLot,
  })

  // ─── 부팅 시퀀스 페이즈 ────────────────────────────────
  //   0: 검은 화면 + LED 점멸
  //   1: 타이프라이터 라인 1
  //   2: 타이프라이터 라인 2
  //   3: 헤드라인 reveal
  //   4: Pokédex + 카드 등장
  //   5: 메타 + ENTER 버튼
  const [phase, setPhase] = useState(0)
  const [skipped, setSkipped] = useState(false)

  // 자동 진행 — 사용자가 skip하지 않은 경우에만
  useEffect(() => {
    if (skipped || isLoading) return
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 3400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [skipped, isLoading])

  const skipToEnd = useCallback(() => {
    setSkipped(true)
    setPhase(5)
  }, [])

  // 키보드 — Space/Enter/Esc로 즉시 스킵, 페이즈 5에서 한 번 더 누르면 진입
  useEffect(() => {
    const onKey = (e) => {
      if (['Space', 'Enter', 'Escape'].includes(e.code)) {
        e.preventDefault()
        if (phase < 5) skipToEnd()
        else navigate('/')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, skipToEnd, navigate])

  // LIVE 경매 없으면 인트로 안 띄움 — 메인으로 바로 리다이렉트
  useEffect(() => {
    if (!isLoading && !lot) navigate('/', { replace: true })
  }, [isLoading, lot, navigate])

  if (isLoading || !lot) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-electric font-mono text-sm">
          POKÉDEX BOOTING<DotDot />
        </div>
      </div>
    )
  }

  // ─── 메인 인트로 렌더 ─────────────────────────────────
  return (
    <div
      className="fixed inset-0 overflow-hidden text-white cursor-pointer select-none"
      onClick={phase < 5 ? skipToEnd : () => navigate('/')}
      role="presentation"
      aria-label="오늘의 LOT 인트로 — 클릭하면 다음으로"
    >
      {/* ───── 배경: 정전 분위기 + CRT 스캔라인 ───── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, #1a0a0a 0%, #050505 70%, #000 100%)',
        }}
        aria-hidden="true"
      />
      {/* CRT 스캔라인 */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0px, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 3px)',
          animation: 'crt-flicker 4s steps(2) infinite',
        }}
        aria-hidden="true"
      />
      {/* 비네트 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 200px 40px rgba(0,0,0,0.8)' }}
        aria-hidden="true"
      />

      {/* ───── 상단 LED 줄 (전원 켜진 느낌) ───── */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-[10px] font-mono font-extrabold tracking-[0.18em] uppercase">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              background: phase >= 1 ? '#22c55e' : '#444',
              boxShadow: phase >= 1 ? '0 0 8px #22c55e' : 'none',
              animation: phase >= 1 ? 'pulse-led 1.2s ease-in-out infinite' : undefined,
            }}
          />
          <span className={phase >= 1 ? 'text-emerald-400' : 'text-gray-700'}>SYSTEM</span>
        </span>
        <span className="text-gray-500">POKÉVAULT · 도감 v3.0 · TODAY</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate('/') }}
          className="focus-ring text-gray-500 hover:text-white px-2 py-1 rounded border border-gray-700 hover:border-gray-400 transition-colors"
          aria-label="인트로 건너뛰기"
        >
          SKIP →
        </button>
      </div>

      {/* ───── 좌측 부팅 콘솔 ───── */}
      <div className="absolute top-1/4 left-8 lg:left-16 font-mono text-[12px] sm:text-[13px] leading-relaxed text-emerald-400 max-w-md">
        {phase >= 1 && (
          <div className="opacity-90">
            &gt; POKÉDEX BOOTING<DotDot />
          </div>
        )}
        {phase >= 2 && (
          <div className="opacity-90">
            &gt; SCANNING TODAY'S CATALOG<DotDot />
          </div>
        )}
        {phase >= 3 && (
          <div className="mt-1 text-electric font-extrabold text-[14px]">
            &gt;&gt; TODAY'S LOT IDENTIFIED
          </div>
        )}
        {phase >= 3 && (
          <div className="mt-1 text-gray-500 text-[11px]">
            CERT #{lot.grade?.cert || '—'} · {lot.grade?.country || '—'}
          </div>
        )}
      </div>

      {/* ───── 메인 카드 reveal (페이즈 4+) ───── */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
          phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        aria-hidden={phase < 4}
      >
        <div className="relative" style={{ perspective: '1500px' }}>
          {/* 스포트라이트 */}
          <div
            className="absolute -inset-32 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(220,38,38,0.35), transparent 60%)',
              filter: 'blur(20px)',
            }}
            aria-hidden="true"
          />
          {/* 360° 회전 단상 */}
          <span
            aria-hidden="true"
            className="turntable-disc"
            style={{
              width: 360,
              height: 360,
              bottom: -60,
              left: '50%',
              marginLeft: -180,
              opacity: 0.45,
            }}
          />
          <div className="relative sparkle-host card-sway">
            <Sparkles always />
            <PokeCard card={lot} size="lg" />
          </div>
        </div>
      </div>

      {/* ───── 우측 카드 메타 (페이즈 5) ───── */}
      <div
        className={`absolute top-1/3 right-8 lg:right-16 max-w-xs transition-all duration-500 ${
          phase >= 5 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
        }`}
        aria-hidden={phase < 5}
      >
        <div className="border border-gray-700/60 bg-black/40 backdrop-blur-sm rounded-lg p-4 font-mono">
          <div className="text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-2">
            ▸ EXHIBIT LABEL
          </div>
          <div className="font-display text-2xl font-bold text-white mb-1 leading-tight">
            {lot.nameKo || lot.name}
          </div>
          <div className="text-[11px] text-gray-400 leading-relaxed mb-3">
            {lot.name} · {lot.set || lot.setShort} · {lot.year}
          </div>
          <div className="mb-3">
            <GradeBadge grade={lot.grade} size="sm" />
          </div>
          <dl className="space-y-1 text-[11px]">
            <KV k="LOT" v={`#${lot.lotOrder || 1}`} />
            <KV k="No." v={lot.number || '—'} />
            <KV k="현재가" v={formatKRWFull(lot.currentBid || lot.startPrice || 0)} highlight />
            <KV k="입찰" v={`${lot.bidCount || 0}회`} />
          </dl>
        </div>
      </div>

      {/* ───── 하단 ENTER 버튼 (페이즈 5) ───── */}
      <div
        className={`absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 transition-all duration-500 ${
          phase >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
        aria-hidden={phase < 5}
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigate('/') }}
          className="focus-ring group relative px-10 py-4 rounded-full bg-dex text-paper border-2 border-paper font-display text-lg font-extrabold tracking-widest shadow-[0_4px_0_#0a0a0a,0_0_30px_rgba(220,38,38,0.55)] hover:-translate-y-0.5 hover:shadow-[0_6px_0_#0a0a0a,0_0_40px_rgba(220,38,38,0.75)] transition-all overflow-hidden"
          aria-label="포케볼트 입장"
        >
          <span className="relative z-10 inline-flex items-center gap-2">
            <Icon name="arrow" size={16} strokeWidth={2.6} className="rotate-180" />
            ENTER POKÉVAULT
            <Icon name="arrow" size={16} strokeWidth={2.6} />
          </span>
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              animation: 'shine-sweep 2.6s ease-in-out infinite',
            }}
          />
        </button>
        <div className="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase">
          PRESS <span className="text-electric">[ENTER]</span> OR CLICK
        </div>
      </div>

      <style>{`
        @keyframes pulse-led {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes crt-flicker {
          0%, 96%, 100% { opacity: 0.25; }
          97%, 99%      { opacity: 0.4; }
        }
        @keyframes shine-sweep {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(260%); }
        }
        @keyframes dot-typing {
          0%, 20%   { content: ''; }
          40%       { content: '.'; }
          60%       { content: '..'; }
          80%, 100% { content: '...'; }
        }
        .dot-typing::after {
          content: '';
          animation: dot-typing 1.2s steps(4) infinite;
        }
        .focus-ring:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px #facc15, 0 0 0 5px #000;
        }
      `}</style>
    </div>
  )
}

// 작은 dot 애니메이션 — "..." 타이프라이터
function DotDot() {
  return <span className="dot-typing" aria-hidden="true" />
}

function KV({ k, v, highlight = false }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <dt className="text-gray-500 text-[10px] tracking-wider uppercase">{k}</dt>
      <dd className={`font-bold tabular-nums ${highlight ? 'text-electric text-[13px]' : 'text-white text-[11px]'}`}>
        {v}
      </dd>
    </div>
  )
}
