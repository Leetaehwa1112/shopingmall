/**
 * SetSymbol — Pokémon TCG 시대별 셋 심볼.
 * 실제 카드 우하단의 셋 심볼처럼 채워진 실루엣 형태로 렌더링.
 * 각 SVG는 24x24 viewBox, 단색(currentColor) fill.
 *
 * IP 안전성: 실제 공식 심볼을 그대로 베끼지 않고, 각 시대의 시각적
 * 시그니처를 추상화·재해석한 오리지널 도형.
 */
const SET_SYMBOLS = {
  // WotC 초기 (1999-2003) — 클래식 포켓볼 (Base/Jungle/Fossil/Rocket/Gym 시대의 통합 상징)
  base: (
    <>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M2 12h7a3 3 0 016 0h7" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </>
  ),

  // Neo 시리즈 (2000-2001) — 크레센트 + 별 (Neo Genesis 모티프)
  neo: (
    <>
      <path
        d="M15 4a8 8 0 100 16 6.5 6.5 0 010-13 8 8 0 000-3z"
        fill="currentColor"
      />
      <path
        d="M18.5 6.5l.7 1.8 1.8.3-1.3 1.3.3 1.8-1.5-.9-1.5.9.3-1.8L16 8.6l1.8-.3z"
        fill="currentColor"
      />
    </>
  ),

  // EX · DP · BW (2003-2010) — 다이아몬드 (DP의 다이아 + EX의 강렬함)
  ex: (
    <>
      <path
        d="M12 2L22 12 12 22 2 12z"
        fill="currentColor"
      />
      <path
        d="M12 6L18 12 12 18 6 12z"
        fill="#ffffff"
        opacity="0.25"
      />
    </>
  ),

  // XY · SM (2013-2018) — 8각 별 (XY 별 + SM 태양버스트)
  xy: (
    <>
      <path
        d="M12 2l2 6.5L20.5 8 16 12l4.5 4L14 15.5 12 22l-2-6.5L3.5 16 8 12 3.5 8 10 8.5z"
        fill="currentColor"
      />
    </>
  ),

  // Sword & Shield (2019-2022) — 방패 + 대각선 검
  swsh: (
    <>
      <path
        d="M12 2L4 5v6c0 4.5 3.5 9 8 11 4.5-2 8-6.5 8-11V5l-8-3z"
        fill="currentColor"
      />
      <path
        d="M16 7l3-3M19 4l1 1M14 9l-9 9-1.5-1.5L12 7.5"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </>
  ),

  // Scarlet & Violet (2022+) — 3점 왕관
  sv: (
    <>
      <path
        d="M3 9l3 7h12l3-7-4.5 3L12 5 7.5 12z"
        fill="currentColor"
      />
      <rect x="5" y="17" width="14" height="2" fill="currentColor" />
      <circle cx="3" cy="9" r="1.2" fill="currentColor" />
      <circle cx="21" cy="9" r="1.2" fill="currentColor" />
      <circle cx="12" cy="5" r="1.2" fill="currentColor" />
    </>
  ),

  // 일본판 — Rising sun (일장기 모티프)
  japanese: (
    <>
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <line x1="12" y1="2" x2="12" y2="4.5" />
        <line x1="12" y1="19.5" x2="12" y2="22" />
        <line x1="2" y1="12" x2="4.5" y2="12" />
        <line x1="19.5" y1="12" x2="22" y2="12" />
        <line x1="5" y1="5" x2="6.8" y2="6.8" />
        <line x1="17.2" y1="17.2" x2="19" y2="19" />
        <line x1="19" y1="5" x2="17.2" y2="6.8" />
        <line x1="6.8" y1="17.2" x2="5" y2="19" />
      </g>
    </>
  ),

  // 프로모 · 한정판 — 5각 별 + 광채
  promo: (
    <>
      <path
        d="M12 2l2.8 6.5L22 9.2l-5.4 4.8L18 22l-6-3.5L6 22l1.4-8L2 9.2l7.2-.7z"
        fill="currentColor"
      />
      <path
        d="M12 6l1.5 3.5L17 10l-2.7 2.4.7 4-3-1.7-3 1.7.7-4L7 10l3.5-.5z"
        fill="#ffffff"
        opacity="0.4"
      />
    </>
  ),

  // 부스터팩 — 포일 팩 (지퍼톱 + 본체)
  pack: (
    <>
      <path
        d="M6 4h12l-1 2H7zm0 2h12l1 14a2 2 0 01-2 2H7a2 2 0 01-2-2z"
        fill="currentColor"
      />
      <path
        d="M9 10v8M15 10v8M12 9v10"
        stroke="#ffffff"
        strokeWidth="1.2"
        opacity="0.5"
      />
    </>
  ),

  // 박스 · 컬렉션 — 아이소메트릭 박스
  box: (
    <>
      <path
        d="M12 2L3 7v10l9 5 9-5V7z"
        fill="currentColor"
      />
      <path
        d="M3 7l9 5 9-5M12 12v10"
        stroke="#ffffff"
        strokeWidth="1.3"
        fill="none"
        opacity="0.45"
      />
    </>
  ),

  // 전체 (All) — 4분할 그리드 (셋 심볼 갤러리 느낌)
  all: (
    <>
      <rect x="3" y="3"  width="8" height="8" rx="1.5" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="currentColor" />
    </>
  ),

  // ETB · Elite Trainer Box — 손잡이 달린 대형 박스
  etb: (
    <>
      <path d="M4 8h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V8z" fill="currentColor" />
      <path d="M9 8V5.5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 5.5V8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M4 12h16M12 9v12" stroke="#ffffff" strokeWidth="1.2" opacity="0.55" />
    </>
  ),

  // Premium Collection · Bundle — 카드+팩+피규어 스택
  bundle: (
    <>
      <path d="M3 17h18v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3z" fill="currentColor" />
      <rect x="6" y="9" width="5" height="9" rx="0.8" fill="currentColor" opacity="0.85" />
      <rect x="13" y="6" width="5" height="12" rx="0.8" fill="currentColor" />
      <circle cx="8.5" cy="11" r="1.1" fill="#ffffff" opacity="0.55" />
      <path d="M14 9h3M14 12h3" stroke="#ffffff" strokeWidth="1" opacity="0.45" />
    </>
  ),

  // Tin · 원통형 컬렉션 틴
  tin: (
    <>
      <path d="M5 6h14v13a2 2 0 01-2 2H7a2 2 0 01-2-2V6z" fill="currentColor" />
      <ellipse cx="12" cy="6" rx="7" ry="2" fill="currentColor" opacity="0.7" />
      <ellipse cx="12" cy="6" rx="7" ry="2" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d="M8 11h8M8 15h8" stroke="#ffffff" strokeWidth="1" opacity="0.45" />
    </>
  ),

  // Theme Deck · 시작 덱 — 카드 스택 + 작은 왕관
  theme: (
    <>
      <rect x="6" y="9" width="13" height="13" rx="1.5" fill="currentColor" />
      <rect x="4.5" y="7.5" width="13" height="13" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="3" y="6" width="13" height="13" rx="1.5" fill="currentColor" opacity="0.35" />
      <path d="M8 3.5l1.5 2 1.5-2 1.5 2 1.5-2v3h-6v-3z" fill="currentColor" />
    </>
  ),
}

export default function SetSymbol({ era, size = 22, className = '' }) {
  const content = SET_SYMBOLS[era] || SET_SYMBOLS.all
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      {content}
    </svg>
  )
}
