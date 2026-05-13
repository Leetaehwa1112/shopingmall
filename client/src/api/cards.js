// Pokemon TCG API images — real card photos
// API doc: https://docs.pokemontcg.io

export const AUCTION_CARDS = [
  {
    id: 'charizard-1st-psa10',
    name: 'Charizard',
    nameKo: '리자몽',
    type1: 'Fire',
    set: 'Base Set 1st Edition Shadowless',
    setShort: 'Base Set',
    year: 1999,
    number: '4/102',
    image: 'https://images.pokemontcg.io/base1/4_hires.png',
    grade: { company: 'PSA', score: 10, label: 'GEM MINT', cert: '52819374' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'auction',
    isHolo: true,
    accent: '#ff6b35',
    startPrice: 80000000,
    currentBid: 142000000,
    bidCount: 47,
    watchers: 312,
    endsAt: Date.now() + 1000 * 60 * 60 * 8 + 1000 * 60 * 23,
    bidHistory: [
      { bidder: 'C***r_2009',  amount: 142000000, at: Date.now() - 1000 * 60 * 12 },
      { bidder: 'M***to_King', amount: 138000000, at: Date.now() - 1000 * 60 * 47 },
      { bidder: 'Anonymous',   amount: 135000000, at: Date.now() - 1000 * 60 * 88 },
      { bidder: 'V***t_77',    amount: 132000000, at: Date.now() - 1000 * 60 * 124 },
      { bidder: 'C***r_2009',  amount: 128000000, at: Date.now() - 1000 * 60 * 200 },
    ],
    population: { psa10: 121, psa9: 1432, total: 8420 },
    lastSales: [
      { date: '2024-11-12', price: 138000000, grade: 'PSA 10' },
      { date: '2024-08-03', price: 125000000, grade: 'PSA 10' },
      { date: '2024-05-21', price: 119000000, grade: 'PSA 10' },
    ],
    description:
      'Base Set 1st Edition Shadowless Charizard. 포켓몬 카드의 성배. 완벽한 코너, 정확한 센터링 55/45, 인쇄 결함 없음. 등급 직후 보관소에서 보관됨.',
  },
  {
    id: 'pikachu-illustrator',
    name: 'Pikachu Illustrator',
    nameKo: '피카츄 일러스트레이터',
    type1: 'Electric',
    set: 'CoroCoro Comic Promo (1998)',
    setShort: 'Promo',
    year: 1998,
    number: 'Promo',
    image: 'https://images.pokemontcg.io/base1/58_hires.png',
    imageNote: 'Pikachu Illustrator (실제 카드 이미지는 인증서 검증 후 제공)',
    grade: { company: 'PSA', score: 7, label: 'NEAR MINT', cert: '38291047' },
    rarity: 'promo-ultra',
    category: 'japanese',
    type: 'auction',
    isHolo: false,
    accent: '#fbd24a',
    startPrice: 200000000,
    currentBid: 387000000,
    bidCount: 23,
    watchers: 891,
    endsAt: Date.now() + 1000 * 60 * 60 * 47 + 1000 * 60 * 12,
    bidHistory: [
      { bidder: 'G***l_Auctions', amount: 387000000, at: Date.now() - 1000 * 60 * 30 },
      { bidder: 'PWCC_Bidder',    amount: 372000000, at: Date.now() - 1000 * 60 * 180 },
      { bidder: 'Anonymous',      amount: 360000000, at: Date.now() - 1000 * 60 * 360 },
    ],
    population: { psa7: 7, total: 39 },
    lastSales: [
      { date: '2023-09-15', price: 5800000000, grade: 'PSA 10' },
      { date: '2022-07-22', price: 1100000000, grade: 'PSA 9' },
    ],
    description:
      '1998년 CoroCoro Comic 일러스트레이션 콘테스트 수상자에게만 지급된 전 세계 39장 한정 카드. 포켓몬 TCG 역사상 가장 희귀한 카드 중 하나.',
  },
  {
    id: 'shining-charizard',
    name: 'Shining Charizard',
    nameKo: '샤이닝 리자몽',
    type1: 'Fire',
    set: 'Neo Destiny',
    setShort: 'Neo Destiny',
    year: 2001,
    number: '107/105',
    image: 'https://images.pokemontcg.io/neo4/107_hires.png',
    grade: { company: 'BGS', score: 9.5, label: 'GEM MINT', cert: 'BGS-9982341' },
    rarity: 'shining',
    category: 'neo',
    type: 'auction',
    isHolo: true,
    accent: '#3a8dde',
    startPrice: 9000000,
    currentBid: 14500000,
    bidCount: 31,
    watchers: 178,
    endsAt: Date.now() + 1000 * 60 * 60 * 22 + 1000 * 60 * 5,
    bidHistory: [
      { bidder: 'K***o_Master', amount: 14500000, at: Date.now() - 1000 * 60 * 5 },
      { bidder: 'Anonymous',    amount: 14200000, at: Date.now() - 1000 * 60 * 22 },
      { bidder: 'S***er_Star',  amount: 13800000, at: Date.now() - 1000 * 60 * 60 },
    ],
    population: { bgs95: 89, total: 1240 },
    lastSales: [
      { date: '2024-10-02', price: 14000000, grade: 'BGS 9.5' },
    ],
    description: 'Neo Destiny 시크릿 레어. 샤이닝 효과의 원조. 완벽한 보존 상태.',
  },
  {
    id: 'lugia-1st-psa10',
    name: 'Lugia',
    nameKo: '루기아',
    type1: 'Psychic',
    set: 'Neo Genesis 1st Edition',
    setShort: 'Neo Genesis',
    year: 2000,
    number: '9/111',
    image: 'https://images.pokemontcg.io/neo1/9_hires.png',
    grade: { company: 'PSA', score: 10, label: 'GEM MINT', cert: '49281748' },
    rarity: 'holo-rare',
    category: 'neo',
    type: 'auction',
    isHolo: true,
    accent: '#a78bfa',
    startPrice: 30000000,
    currentBid: 48000000,
    bidCount: 19,
    watchers: 247,
    endsAt: Date.now() + 1000 * 60 * 60 * 2 + 1000 * 60 * 47, // 2h 47m
    bidHistory: [
      { bidder: 'L***a_Fan',  amount: 48000000, at: Date.now() - 1000 * 60 * 8 },
      { bidder: 'Anonymous',  amount: 46500000, at: Date.now() - 1000 * 60 * 35 },
    ],
    population: { psa10: 51 },
    lastSales: [
      { date: '2024-09-10', price: 42000000, grade: 'PSA 10' },
    ],
    description: 'Neo Genesis 1st Edition Lugia PSA 10. 인구 51장. 마감 임박.',
  },
];

export const BUYNOW_CARDS = [
  {
    id: 'mewtwo-1st',
    name: 'Mewtwo',
    nameKo: '뮤츠',
    type1: 'Psychic',
    set: 'Base Set 1st Edition',
    setShort: 'Base Set',
    year: 1999,
    number: '10/102',
    image: 'https://images.pokemontcg.io/base1/10_hires.png',
    grade: { company: 'PSA', score: 10, label: 'GEM MINT', cert: '52917382' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'buynow',
    isHolo: true,
    accent: '#a855f7',
    price: 15800000,
    population: { psa10: 287 },
    description: 'Base Set 1st Edition Mewtwo PSA 10. 보존 상태 완벽.',
  },
  {
    id: 'blastoise-shadowless',
    name: 'Blastoise',
    nameKo: '거북왕',
    type1: 'Water',
    set: 'Base Set Shadowless',
    setShort: 'Base Set',
    year: 1999,
    number: '2/102',
    image: 'https://images.pokemontcg.io/base1/2_hires.png',
    grade: { company: 'PSA', score: 9, label: 'MINT', cert: '52738201' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'buynow',
    isHolo: true,
    accent: '#3b82f6',
    price: 6400000,
    population: { psa9: 1820 },
    description: 'Shadowless 1st print Blastoise. PSA 9.',
  },
  {
    id: 'venusaur-1st',
    name: 'Venusaur',
    nameKo: '이상해꽃',
    type1: 'Grass',
    set: 'Base Set 1st Edition',
    setShort: 'Base Set',
    year: 1999,
    number: '15/102',
    image: 'https://images.pokemontcg.io/base1/15_hires.png',
    grade: { company: 'PSA', score: 10, label: 'GEM MINT', cert: '52183907' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'buynow',
    isHolo: true,
    accent: '#22c55e',
    price: 12700000,
    population: { psa10: 178 },
    description: 'Base Set 1st Edition Venusaur PSA 10.',
  },
  {
    id: 'gyarados-base',
    name: 'Gyarados',
    nameKo: '갸라도스',
    type1: 'Water',
    set: 'Base Set',
    setShort: 'Base Set',
    year: 1999,
    number: '6/102',
    image: 'https://images.pokemontcg.io/base1/6_hires.png',
    grade: { company: 'PSA', score: 9, label: 'MINT', cert: '52938201' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'buynow',
    isHolo: true,
    accent: '#0ea5e9',
    price: 980000,
    population: { psa9: 4820 },
    description: 'Base Set Gyarados Holo PSA 9.',
  },
  {
    id: 'alakazam-base',
    name: 'Alakazam',
    nameKo: '후딘',
    type1: 'Psychic',
    set: 'Base Set 1st Edition',
    setShort: 'Base Set',
    year: 1999,
    number: '1/102',
    image: 'https://images.pokemontcg.io/base1/1_hires.png',
    grade: { company: 'PSA', score: 9, label: 'MINT', cert: '52738451' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'buynow',
    isHolo: true,
    accent: '#c084fc',
    price: 2300000,
    population: { psa9: 1980 },
    description: 'Base Set 1st Edition Alakazam PSA 9.',
  },
  {
    id: 'machamp-1st',
    name: 'Machamp',
    nameKo: '괴력몬',
    type1: 'Fighting',
    set: 'Base Set 1st Edition',
    setShort: 'Base Set',
    year: 1999,
    number: '8/102',
    image: 'https://images.pokemontcg.io/base1/8_hires.png',
    grade: { company: 'PSA', score: 10, label: 'GEM MINT', cert: '52183442' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'buynow',
    isHolo: true,
    accent: '#f97316',
    price: 1850000,
    population: { psa10: 624 },
    description: 'Base Set 1st Edition Machamp PSA 10.',
  },
  {
    id: 'ninetales-base',
    name: 'Ninetales',
    nameKo: '나인테일',
    type1: 'Fire',
    set: 'Base Set',
    setShort: 'Base Set',
    year: 1999,
    number: '12/102',
    image: 'https://images.pokemontcg.io/base1/12_hires.png',
    grade: { company: 'PSA', score: 10, label: 'GEM MINT', cert: '52281347' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'buynow',
    isHolo: true,
    accent: '#ef4444',
    price: 1620000,
    population: { psa10: 412 },
    description: 'Base Set Ninetales Holo PSA 10.',
  },
  {
    id: 'raichu-base',
    name: 'Raichu',
    nameKo: '라이츄',
    type1: 'Electric',
    set: 'Base Set',
    setShort: 'Base Set',
    year: 1999,
    number: '14/102',
    image: 'https://images.pokemontcg.io/base1/14_hires.png',
    grade: { company: 'PSA', score: 9, label: 'MINT', cert: '52381209' },
    rarity: 'holo-rare',
    category: 'base',
    type: 'buynow',
    isHolo: true,
    accent: '#fbbf24',
    price: 1120000,
    population: { psa9: 2240 },
    description: 'Base Set Raichu Holo PSA 9.',
  },
  {
    id: 'pikachu-base',
    name: 'Pikachu',
    nameKo: '피카츄',
    type1: 'Electric',
    set: 'Base Set 1st Edition',
    setShort: 'Base Set',
    year: 1999,
    number: '58/102',
    image: 'https://images.pokemontcg.io/base1/58_hires.png',
    grade: { company: 'PSA', score: 10, label: 'GEM MINT', cert: '52938401' },
    rarity: 'common',
    category: 'base',
    type: 'buynow',
    isHolo: false,
    accent: '#facc15',
    price: 4200000,
    population: { psa10: 348 },
    description: 'Base Set 1st Edition Pikachu PSA 10. Red Cheeks 변종 — 컬렉터 인기.',
  },
  {
    id: 'pikachu-jungle',
    name: 'Pikachu',
    nameKo: '피카츄 (정글)',
    type1: 'Electric',
    set: 'Jungle 1st Edition',
    setShort: 'Jungle',
    year: 1999,
    number: '60/64',
    image: 'https://images.pokemontcg.io/jungle/60_hires.png',
    grade: { company: 'PSA', score: 10, label: 'GEM MINT', cert: '52938502' },
    rarity: 'common',
    category: 'base',
    type: 'buynow',
    isHolo: false,
    accent: '#fcd34d',
    price: 1800000,
    population: { psa10: 412 },
    description: 'Jungle 1st Edition Pikachu PSA 10.',
  },
];

export const ALL_CARDS = [...AUCTION_CARDS, ...BUYNOW_CARDS];

// 미개봉 카드팩 & 박스
// setLogo: PokemonTCG API의 공식 set logo (실제 부스터팩에 인쇄된 로고)
// heroArt: 부스터팩 표지에 등장하는 대표 포켓몬 카드
export const PACKS = [
  {
    id: 'base-1st-pack',
    name: 'Base Set 1st Edition Booster Pack',
    nameKo: '베이스 세트 1st 부스터팩',
    setShort: 'Base Set 1st Ed.',
    year: 1999,
    type: 'pack',
    sealed: true,
    cardsPerPack: 11,
    price: 8500000,
    accent: '#dc2626',
    gradient: ['#fef3c7', '#dc2626'],
    setLogo: 'https://images.pokemontcg.io/base1/logo.png',
    heroArt: 'https://images.pokemontcg.io/base1/4_hires.png', // Charizard
    description: '미개봉 1999년 Base Set 1st Edition 부스터팩. 11카드 + 1 에너지. Charizard 등장 가능.',
    stock: 3,
  },
  {
    id: 'base-1st-box',
    name: 'Base Set 1st Edition Booster Box',
    nameKo: '베이스 세트 1st 부스터박스',
    setShort: 'Base Set 1st Ed.',
    year: 1999,
    type: 'box',
    sealed: true,
    cardsPerPack: 36,
    price: 320000000,
    accent: '#7f1d1d',
    gradient: ['#dc2626', '#7f1d1d'],
    setLogo: 'https://images.pokemontcg.io/base1/logo.png',
    heroArt: 'https://images.pokemontcg.io/base1/4_hires.png',
    description: '미개봉 36팩 박스. 가장 희귀한 vintage 부스터박스. 투자 가치 최고.',
    stock: 1,
  },
  {
    id: 'jungle-pack',
    name: 'Jungle 1st Edition Booster Pack',
    nameKo: '정글 1st 부스터팩',
    setShort: 'Jungle',
    year: 1999,
    type: 'pack',
    sealed: true,
    cardsPerPack: 11,
    price: 1850000,
    accent: '#22c55e',
    gradient: ['#a7f3d0', '#15803d'],
    setLogo: 'https://images.pokemontcg.io/base2/logo.png',
    heroArt: 'https://images.pokemontcg.io/base2/14_hires.png', // Snorlax
    description: '정글 세트 1st Edition. Snorlax, Wigglytuff, Pikachu 등.',
    stock: 5,
  },
  {
    id: 'fossil-pack',
    name: 'Fossil 1st Edition Booster Pack',
    nameKo: '화석 1st 부스터팩',
    setShort: 'Fossil',
    year: 1999,
    type: 'pack',
    sealed: true,
    cardsPerPack: 11,
    price: 1650000,
    accent: '#0ea5e9',
    gradient: ['#bae6fd', '#0369a1'],
    setLogo: 'https://images.pokemontcg.io/base3/logo.png',
    heroArt: 'https://images.pokemontcg.io/base3/1_hires.png', // Aerodactyl
    description: 'Aerodactyl, Dragonite 등 화석 포켓몬 등장.',
    stock: 6,
  },
  {
    id: 'neo-genesis-pack',
    name: 'Neo Genesis 1st Edition Booster Pack',
    nameKo: '네오 제네시스 1st 부스터팩',
    setShort: 'Neo Genesis',
    year: 2000,
    type: 'pack',
    sealed: true,
    cardsPerPack: 11,
    price: 2400000,
    accent: '#a78bfa',
    gradient: ['#ddd6fe', '#6d28d9'],
    setLogo: 'https://images.pokemontcg.io/neo1/logo.png',
    heroArt: 'https://images.pokemontcg.io/neo1/9_hires.png', // Lugia
    description: 'Lugia 등장. Neo Genesis 1st Edition 미개봉 팩.',
    stock: 8,
  },
  {
    id: 'anniversary-25-pack',
    name: '25th Anniversary · Celebrations Pack',
    nameKo: '25주년 · 셀러브레이션 팩',
    setShort: 'Celebrations',
    year: 2021,
    type: 'pack',
    sealed: true,
    cardsPerPack: 4,
    price: 180000,
    accent: '#ec4899',
    gradient: ['#fbcfe8', '#9333ea'],
    setLogo: 'https://images.pokemontcg.io/cel25/logo.png',
    heroArt: 'https://images.pokemontcg.io/cel25/24_hires.png', // Mew
    description: '포켓몬 25주년 기념 한정판 Celebrations. Pikachu / Mew / Charizard 셀러브레이션.',
    stock: 24,
  },
  {
    id: 'shining-fates-eb',
    name: 'Shining Fates Elite Trainer Box',
    nameKo: '샤이닝 페이츠 ETB',
    setShort: 'Shining Fates',
    year: 2021,
    type: 'box',
    sealed: true,
    cardsPerPack: 100,
    price: 420000,
    accent: '#f97316',
    gradient: ['#fed7aa', '#c2410c'],
    setLogo: 'https://images.pokemontcg.io/swsh45/logo.png',
    heroArt: 'https://images.pokemontcg.io/swsh45sv/SV107_hires.png', // Shiny Charizard VMAX
    description: 'Charizard VMAX 등 샤이니 카드. 10팩 + 슬리브 + 카운터.',
    stock: 12,
  },
  {
    id: 'hidden-fates-pack',
    name: 'Hidden Fates Booster Pack',
    nameKo: '히든 페이츠 부스터팩',
    setShort: 'Hidden Fates',
    year: 2019,
    type: 'pack',
    sealed: true,
    cardsPerPack: 10,
    price: 280000,
    accent: '#f59e0b',
    gradient: ['#fde68a', '#b45309'],
    setLogo: 'https://images.pokemontcg.io/sm115/logo.png',
    heroArt: 'https://images.pokemontcg.io/sm115/9_hires.png', // Charizard-GX
    description: 'Shiny Vault 한정. Charizard-GX 등 샤이니 카드 다수 출현.',
    stock: 18,
  },
];

export const getPack = (id) => PACKS.find((p) => p.id === id);

// ===== 배송 등급 =====
// Brink's Global Services: 보석·미술품·고가 컬렉터블 전문 무장 운송
export const SHIPPING_TIER = {
  BRINKS_REQUIRED: 'brinks-required',     // 1억원 이상 — Brink's 의무
  BRINKS_RECOMMENDED: 'brinks-recommended',// 3천만원 이상 — Brink's 권장
  INSURED: 'insured',                      // 500만원 이상 — FedEx Insured + Brink's 선택
  STANDARD: 'standard',                    // 500만원 미만 — 일반 배송
};

export function getShippingTier(price) {
  if (price >= 100000000) return SHIPPING_TIER.BRINKS_REQUIRED;
  if (price >= 30000000)  return SHIPPING_TIER.BRINKS_RECOMMENDED;
  if (price >= 5000000)   return SHIPPING_TIER.INSURED;
  return SHIPPING_TIER.STANDARD;
}

export const SHIPPING_OPTIONS = [
  {
    id: 'standard',
    label: '일반 배송 (CJ대한통운)',
    desc: '1-2일 · 기본 보험',
    price: 5000,
    icon: 'package',
    led: 'blue',
  },
  {
    id: 'fedex',
    label: 'FedEx Priority Insured',
    desc: '1-2일 · 전액 보험 · 서명 필수',
    price: 30000,
    icon: 'package',
    led: 'yellow',
  },
  {
    id: 'brinks',
    label: "Brink's Armored Transport",
    desc: '귀중품 무장 운송 · 24-48시간 · 보안 호송 2인',
    price: 1500000,
    icon: 'shield',
    led: 'red',
    premium: true,
  },
  {
    id: 'pickup',
    label: '직접 수령 (강남 본사)',
    desc: '평일 10-19시 · 본인 확인 필수',
    price: 0,
    icon: 'lock',
    led: 'green',
  },
  // 카드팩 전용
  {
    id: 'quick',
    label: '⚡ 퀵 배송 (당일)',
    desc: '서울·경기 당일 2-4시간 · 일반 상품 전용',
    price: 50000,
    icon: 'bolt',
    led: 'yellow',
    forPacks: true,
  },
];

export function getShippingOptionsForPrice(price, isPack = false) {
  const tier = getShippingTier(price);
  let allowed = [];
  if (isPack) {
    allowed = ['standard', 'fedex', 'quick', 'pickup'];
  } else if (tier === SHIPPING_TIER.BRINKS_REQUIRED) {
    allowed = ['brinks', 'pickup'];
  } else if (tier === SHIPPING_TIER.BRINKS_RECOMMENDED) {
    allowed = ['brinks', 'fedex', 'pickup'];
  } else if (tier === SHIPPING_TIER.INSURED) {
    allowed = ['fedex', 'brinks', 'pickup'];
  } else {
    allowed = ['standard', 'fedex', 'pickup'];
  }
  return SHIPPING_OPTIONS.filter((o) => allowed.includes(o.id));
}

export const CATEGORIES = [
  { id: 'all',      label: '전체',         en: 'All' },
  { id: 'base',     label: 'Base Set',     en: 'Base Set' },
  { id: 'neo',      label: 'Neo Series',   en: 'Neo' },
  { id: 'japanese', label: '일본판',       en: 'Japanese' },
  { id: 'promo',    label: '프로모',       en: 'Promo' },
];

export const TYPE_COLORS = {
  Fire:     '#ee1515',
  Water:    '#3c5aa6',
  Grass:    '#4caf50',
  Electric: '#ffcb05',
  Psychic:  '#a855f7',
  Fighting: '#c2410c',
  Normal:   '#a8a878',
  Dragon:   '#7038f8',
};

export const formatKRW = (n) => {
  if (n >= 1e12) return `₩${(n / 1e12).toFixed(2)}조`;
  if (n >= 1e8)  return `₩${(n / 1e8).toFixed(2)}억`;
  if (n >= 1e4)  return `₩${(n / 1e4).toFixed(0)}만`;
  return `₩${n.toLocaleString()}`;
};

export const formatKRWFull = (n) => `₩${n.toLocaleString()}`;

export const getCard = (id) => ALL_CARDS.find((c) => c.id === id);

export const timeUntil = (ts) => {
  const diff = ts - Date.now();
  if (diff <= 0) return { ended: true, d: 0, h: 0, m: 0, s: 0, totalMs: 0 };
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return { ended: false, d, h, m, s, totalMs: diff };
};
