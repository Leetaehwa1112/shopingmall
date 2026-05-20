// ──────────────────────────────────────────────────────────────
// POKÉDEX — 전국 도감 + 카드 라인업
// 카드 이미지: Pokémon TCG API 공식 CDN (https://images.pokemontcg.io)
//
// 정책: 카드 번호 100% 검증된 set 만 사용
//  ① base1 (Base Set 1999) — 카드 번호 well-documented
//  ② base3 (Fossil 1999)   — Dragonite 4, Gengar 5
//  ③ neo1 (Neo Genesis)    — Lugia 9 Holo (시그너처 카드)
//  ④ sv3pt5 (151, 2023)    — 카드 번호 == 전국 도감 번호 (Kanto 1-151)
// ──────────────────────────────────────────────────────────────

const TCG = (setId, num, hires = false) =>
  `https://images.pokemontcg.io/${setId}/${num}${hires ? '_hires' : ''}.png`

const C = (cardId, setShort, year, number, rarity, image, keywords = []) => ({
  cardId, setShort, year, number, rarity, image, keywords,
})

export const POKEDEX = [
  {
    id: 1, name: 'Bulbasaur', nameKo: '이상해씨', types: ['풀', '독'], gen: 1,
    height: 0.7, weight: 6.9,
    desc: '태어났을 때부터 등에 식물의 씨앗이 있어 조금씩 크게 자란다.',
    cards: [
      C('base1-44',   'Base Set',  1999, '44/102',  'Common',    TCG('base1', 44),   ['bulbasaur base']),
      C('sv3pt5-1',   '151',       2023, '001/165', 'Common',    TCG('sv3pt5', 1),   ['bulbasaur 151']),
    ],
  },
  {
    id: 4, name: 'Charmander', nameKo: '파이리', types: ['불꽃'], gen: 1,
    height: 0.6, weight: 8.5,
    desc: '꼬리 끝에 불꽃이 타고 있다. 불꽃이 꺼지면 죽고 만다.',
    cards: [
      C('base1-46',   'Base Set',  1999, '46/102',  'Common',    TCG('base1', 46),   ['charmander base']),
      C('sv3pt5-4',   '151',       2023, '004/165', 'Common',    TCG('sv3pt5', 4),   ['charmander 151']),
    ],
  },
  {
    id: 6, name: 'Charizard', nameKo: '리자몽', types: ['불꽃', '비행'], gen: 1,
    height: 1.7, weight: 90.5,
    desc: '거대한 화염을 내뿜어 모든 것을 잿더미로 만든다. 강한 상대만을 골라 싸운다.',
    cards: [
      C('base1-4',    'Base Set',  1999, '4/102',   'Holo Rare', TCG('base1', 4),    ['charizard base']),
      C('sv3pt5-6',   '151',       2023, '006/165', 'Holo Rare', TCG('sv3pt5', 6),   ['charizard 151']),
    ],
  },
  {
    id: 7, name: 'Squirtle', nameKo: '꼬부기', types: ['물'], gen: 1,
    height: 0.5, weight: 9.0,
    desc: '딱딱한 등껍질에 몸을 숨겨 적의 공격으로부터 자신을 지킨다.',
    cards: [
      C('base1-63',   'Base Set',  1999, '63/102',  'Common',    TCG('base1', 63),   ['squirtle base']),
      C('sv3pt5-7',   '151',       2023, '007/165', 'Common',    TCG('sv3pt5', 7),   ['squirtle 151']),
    ],
  },
  {
    id: 25, name: 'Pikachu', nameKo: '피카츄', types: ['전기'], gen: 1,
    height: 0.4, weight: 6.0,
    desc: '양쪽 볼에 작은 전기 주머니가 있다. 위급할 때 방전한다.',
    cards: [
      C('base1-58',   'Base Set',  1999, '58/102',  'Common',    TCG('base1', 58),   ['pikachu base']),
      C('sv3pt5-25',  '151',       2023, '025/165', 'Common',    TCG('sv3pt5', 25),  ['pikachu 151']),
    ],
  },
  {
    id: 94, name: 'Gengar', nameKo: '팬텀', types: ['고스트', '독'], gen: 1,
    height: 1.5, weight: 40.5,
    desc: '어두운 곳에 잠복했다가 갑자기 나타나 사람의 생명을 빼앗으려 한다고 한다.',
    cards: [
      C('base3-5',    'Fossil',    1999, '5/62',    'Holo Rare', TCG('base3', 5),    ['gengar fossil']),
      C('sv3pt5-94',  '151',       2023, '094/165', 'Holo Rare', TCG('sv3pt5', 94),  ['gengar 151']),
    ],
  },
  {
    id: 130, name: 'Gyarados', nameKo: '갸라도스', types: ['물', '비행'], gen: 1,
    height: 6.5, weight: 235.0,
    desc: '한번 화나면 모든 것을 불태우고 부숴버린다. 그 흉포함은 며칠 동안 가라앉지 않는다.',
    cards: [
      C('base1-6',    'Base Set',  1999, '6/102',   'Holo Rare', TCG('base1', 6),    ['gyarados base']),
      C('sv3pt5-130', '151',       2023, '130/165', 'Rare',      TCG('sv3pt5', 130), ['gyarados 151']),
    ],
  },
  {
    id: 133, name: 'Eevee', nameKo: '이브이', types: ['노말'], gen: 1,
    height: 0.3, weight: 6.5,
    desc: '진화 환경에 따라 다양한 모습으로 진화한다. 불안정한 유전자를 가지고 있다.',
    cards: [
      C('sv3pt5-133', '151',       2023, '133/165', 'Common',    TCG('sv3pt5', 133), ['eevee 151']),
    ],
  },
  {
    id: 143, name: 'Snorlax', nameKo: '잠만보', types: ['노말'], gen: 1,
    height: 2.1, weight: 460.0,
    desc: '하루에 400kg의 음식을 먹지 않으면 만족하지 않는다. 다 먹으면 그대로 잠든다.',
    cards: [
      C('sv3pt5-143', '151',       2023, '143/165', 'Rare',      TCG('sv3pt5', 143), ['snorlax 151']),
    ],
  },
  {
    id: 149, name: 'Dragonite', nameKo: '망나뇽', types: ['드래곤', '비행'], gen: 1,
    height: 2.2, weight: 210.0,
    desc: '바다를 가로지르는 모습이 가끔 목격된다. 마음이 따뜻한 포켓몬으로 알려져 있다.',
    cards: [
      C('base3-4',    'Fossil',    1999, '4/62',    'Holo Rare', TCG('base3', 4),    ['dragonite fossil']),
      C('sv3pt5-149', '151',       2023, '149/165', 'Rare',      TCG('sv3pt5', 149), ['dragonite 151']),
    ],
  },
  {
    id: 150, name: 'Mewtwo', nameKo: '뮤츠', types: ['에스퍼'], gen: 1,
    height: 2.0, weight: 122.0,
    desc: '유전자 조작으로 태어난 포켓몬. 전투 능력에 특화된 가장 흉포한 마음의 소유자.',
    cards: [
      C('base1-10',   'Base Set',  1999, '10/102',  'Holo Rare', TCG('base1', 10),   ['mewtwo base']),
      C('sv3pt5-150', '151',       2023, '150/165', 'Holo Rare', TCG('sv3pt5', 150), ['mewtwo 151']),
    ],
  },
  {
    id: 151, name: 'Mew', nameKo: '뮤', types: ['에스퍼'], gen: 1,
    height: 0.4, weight: 4.0,
    desc: '모든 포켓몬의 유전자를 지니고 있다고 한다. 보는 사람을 매우 행복하게 만든다.',
    cards: [
      C('sv3pt5-151', '151',       2023, '151/165', 'Holo Rare', TCG('sv3pt5', 151), ['mew 151']),
    ],
  },
  {
    id: 249, name: 'Lugia', nameKo: '루기아', types: ['에스퍼', '비행'], gen: 2,
    height: 5.2, weight: 216.0,
    desc: '신비로운 바다의 신. 날개를 가볍게 펄럭이면 40일간 폭풍이 계속된다고 한다.',
    cards: [
      C('neo1-9',     'Neo Genesis', 2000, '9/111', 'Holo Rare', TCG('neo1', 9),     ['lugia neo']),
    ],
  },

  // ─── 추가 도감 (Gen 1 · 151 set) ───────────────────────────
  // sv3pt5 카드 번호 == 전국 도감 번호. 일부는 base set 추가.
  {
    id: 3, name: 'Venusaur', nameKo: '이상해꽃', types: ['풀', '독'], gen: 1,
    height: 2.0, weight: 100.0,
    desc: '등에 핀 꽃에서 좋은 향기가 난다. 향기는 적의 전의를 잃게 한다.',
    cards: [
      C('base1-15',  'Base Set', 1999, '15/102',  'Holo Rare', TCG('base1', 15),   ['venusaur base']),
      C('sv3pt5-3',  '151',      2023, '003/165', 'Holo Rare', TCG('sv3pt5', 3),   ['venusaur 151']),
    ],
  },
  {
    id: 9, name: 'Blastoise', nameKo: '거북왕', types: ['물'], gen: 1,
    height: 1.6, weight: 85.5,
    desc: '몸 안에 있는 물을 강력하게 분사한다. 강철판도 뚫는다.',
    cards: [
      C('base1-2',   'Base Set', 1999, '2/102',   'Holo Rare', TCG('base1', 2),    ['blastoise base']),
      C('sv3pt5-9',  '151',      2023, '009/165', 'Holo Rare', TCG('sv3pt5', 9),   ['blastoise 151']),
    ],
  },
  {
    id: 26, name: 'Raichu', nameKo: '라이츄', types: ['전기'], gen: 1,
    height: 0.8, weight: 30.0,
    desc: '꼬리로 땅에서 전기를 모은다. 전기를 너무 모으면 위험하다.',
    cards: [
      C('sv3pt5-26', '151',      2023, '026/165', 'Rare',      TCG('sv3pt5', 26),  ['raichu 151']),
    ],
  },
  {
    id: 35, name: 'Clefairy', nameKo: '삐삐', types: ['페어리'], gen: 1,
    height: 0.6, weight: 7.5,
    desc: '달밤에 무리 지어 춤을 춘다. 보름달이 뜨면 활동이 활발해진다.',
    cards: [
      C('base1-5',   'Base Set', 1999, '5/102',   'Holo Rare', TCG('base1', 5),    ['clefairy base']),
      C('sv3pt5-35', '151',      2023, '035/165', 'Rare',      TCG('sv3pt5', 35),  ['clefairy 151']),
    ],
  },
  {
    id: 39, name: 'Jigglypuff', nameKo: '푸린', types: ['노말', '페어리'], gen: 1,
    height: 0.5, weight: 5.5,
    desc: '커다란 눈동자로 상대를 응시하며 자장가를 부른다. 들으면 잠들어 버린다.',
    cards: [
      C('sv3pt5-39', '151',      2023, '039/165', 'Common',    TCG('sv3pt5', 39),  ['jigglypuff 151']),
    ],
  },
  {
    id: 59, name: 'Arcanine', nameKo: '윈디', types: ['불꽃'], gen: 1,
    height: 1.9, weight: 155.0,
    desc: '전설로 전해지는 포켓몬. 화살처럼 빠르게 달리며 만 킬로미터를 하룻밤에 달린다.',
    cards: [
      C('sv3pt5-59', '151',      2023, '059/165', 'Holo Rare', TCG('sv3pt5', 59),  ['arcanine 151']),
    ],
  },
  {
    id: 65, name: 'Alakazam', nameKo: '후딘', types: ['에스퍼'], gen: 1,
    height: 1.5, weight: 48.0,
    desc: 'IQ 5000을 자랑하는 천재 포켓몬. 출생부터 죽을 때까지 모든 기억을 가지고 있다.',
    cards: [
      C('base1-1',   'Base Set', 1999, '1/102',   'Holo Rare', TCG('base1', 1),    ['alakazam base']),
      C('sv3pt5-65', '151',      2023, '065/165', 'Holo Rare', TCG('sv3pt5', 65),  ['alakazam 151']),
    ],
  },
  {
    id: 68, name: 'Machamp', nameKo: '괴력몬', types: ['격투'], gen: 1,
    height: 1.6, weight: 130.0,
    desc: '네 개의 팔을 가진 격투가. 1초에 천 번의 펀치를 날릴 수 있다.',
    cards: [
      C('base1-8',   'Base Set', 1999, '8/102',   'Holo Rare', TCG('base1', 8),    ['machamp base']),
      C('sv3pt5-68', '151',      2023, '068/165', 'Holo Rare', TCG('sv3pt5', 68),  ['machamp 151']),
    ],
  },
  {
    id: 81, name: 'Magnemite', nameKo: '코일', types: ['전기', '강철'], gen: 1,
    height: 0.3, weight: 6.0,
    desc: '강한 자기장을 발생시키며 공중에 떠다닌다. 금속에 끌려 들러붙는 일이 잦다.',
    cards: [
      C('sv3pt5-81', '151',      2023, '081/165', 'Common',    TCG('sv3pt5', 81),  ['magnemite 151']),
    ],
  },
  {
    id: 92, name: 'Gastly', nameKo: '고오스', types: ['고스트', '독'], gen: 1,
    height: 1.3, weight: 0.1,
    desc: '대부분이 가스로 이루어져 있다. 강한 바람이 불면 휙 날아가 버린다.',
    cards: [
      C('sv3pt5-92', '151',      2023, '092/165', 'Common',    TCG('sv3pt5', 92),  ['gastly 151']),
    ],
  },
  {
    id: 95, name: 'Onix', nameKo: '롱스톤', types: ['바위', '땅'], gen: 1,
    height: 8.8, weight: 210.0,
    desc: '땅속을 시속 80km로 파고든다. 갈수록 몸의 돌이 단단해진다.',
    cards: [
      C('sv3pt5-95', '151',      2023, '095/165', 'Rare',      TCG('sv3pt5', 95),  ['onix 151']),
    ],
  },
  {
    id: 122, name: 'Mr. Mime', nameKo: '마임맨', types: ['에스퍼', '페어리'], gen: 1,
    height: 1.3, weight: 54.5,
    desc: '팬터마임의 명수. 보이지 않는 벽이나 물건을 만들어내 적을 막는다.',
    cards: [
      C('sv3pt5-122','151',      2023, '122/165', 'Rare',      TCG('sv3pt5', 122), ['mr mime 151']),
    ],
  },
  {
    id: 131, name: 'Lapras', nameKo: '라프라스', types: ['물', '얼음'], gen: 1,
    height: 2.5, weight: 220.0,
    desc: '사람을 매우 좋아하는 다정한 포켓몬. 사람을 등에 태우고 바다를 건너기도 한다.',
    cards: [
      C('sv3pt5-131','151',      2023, '131/165', 'Holo Rare', TCG('sv3pt5', 131), ['lapras 151']),
    ],
  },
  {
    id: 134, name: 'Vaporeon', nameKo: '샤미드', types: ['물'], gen: 1,
    height: 1.0, weight: 29.0,
    desc: '물 분자와 동화하는 능력을 가지고 있다. 수중에 녹아들면 보이지 않게 된다.',
    cards: [
      C('sv3pt5-134','151',      2023, '134/165', 'Rare',      TCG('sv3pt5', 134), ['vaporeon 151']),
    ],
  },
  {
    id: 135, name: 'Jolteon', nameKo: '쥬피썬더', types: ['전기'], gen: 1,
    height: 0.8, weight: 24.5,
    desc: '몸의 세포가 발전기 역할을 한다. 털을 곤두세워 천 볼트의 번개를 일으킨다.',
    cards: [
      C('sv3pt5-135','151',      2023, '135/165', 'Rare',      TCG('sv3pt5', 135), ['jolteon 151']),
    ],
  },
  {
    id: 136, name: 'Flareon', nameKo: '부스터', types: ['불꽃'], gen: 1,
    height: 0.9, weight: 25.0,
    desc: '폐 속에 화염 주머니가 있다. 화염을 뿜으면 1700도의 불꽃이 된다.',
    cards: [
      C('sv3pt5-136','151',      2023, '136/165', 'Rare',      TCG('sv3pt5', 136), ['flareon 151']),
    ],
  },
  {
    id: 144, name: 'Articuno', nameKo: '프리져', types: ['얼음', '비행'], gen: 1,
    height: 1.7, weight: 55.4,
    desc: '얼음을 다루는 전설의 새. 깃털을 흩날리면 눈이 내린다.',
    cards: [
      C('sv3pt5-144','151',      2023, '144/165', 'Holo Rare', TCG('sv3pt5', 144), ['articuno 151']),
    ],
  },
  {
    id: 145, name: 'Zapdos', nameKo: '썬더', types: ['전기', '비행'], gen: 1,
    height: 1.6, weight: 52.6,
    desc: '먹구름 속에 살고 있는 전설의 새. 번개를 자유자재로 다룬다.',
    cards: [
      C('sv3pt5-145','151',      2023, '145/165', 'Holo Rare', TCG('sv3pt5', 145), ['zapdos 151']),
    ],
  },
  {
    id: 146, name: 'Moltres', nameKo: '파이어', types: ['불꽃', '비행'], gen: 1,
    height: 2.0, weight: 60.0,
    desc: '불꽃을 다루는 전설의 새. 날갯짓에 의해 불꽃이 흩날린다.',
    cards: [
      C('sv3pt5-146','151',      2023, '146/165', 'Holo Rare', TCG('sv3pt5', 146), ['moltres 151']),
    ],
  },
  {
    id: 147, name: 'Dratini', nameKo: '미뇽', types: ['드래곤'], gen: 1,
    height: 1.8, weight: 3.3,
    desc: '오랫동안 환상의 포켓몬이었다. 작은 체구지만 깊은 호수 속에 산다고 한다.',
    cards: [
      C('sv3pt5-147','151',      2023, '147/165', 'Common',    TCG('sv3pt5', 147), ['dratini 151']),
    ],
  },
]

// PokeAPI 공식 아트워크 CDN
export const ARTWORK_URL = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

// 한글 타입 → 컬러 토큰 (Tailwind 토큰)
export const TYPE_TOKEN = {
  불꽃:   'fire',
  물:     'water',
  풀:     'grass',
  전기:   'electric',
  에스퍼: 'psychic',
  비행:   'sky',
  독:     'rose',
  벌레:   'grass',
  노말:   'mute',
  얼음:   'water',
  격투:   'fire',
  바위:   'mute',
  땅:     'electric',
  드래곤: 'psychic',
  고스트: 'psychic',
  페어리: 'rose',
  강철:   'mute',
  악:     'mute',
}

export const TYPE_CHIP = {
  fire:     'bg-fire/15 text-fire border-fire/30',
  water:    'bg-water/15 text-water border-water/30',
  grass:    'bg-grass/15 text-grass border-grass/30',
  electric: 'bg-electric/30 text-ink border-electric/50',
  psychic:  'bg-psychic/15 text-psychic border-psychic/30',
  sky:      'bg-sky/20 text-blue border-sky/40',
  rose:     'bg-rose/15 text-rose border-rose/30',
  mute:     'bg-bone-2 text-mute border-ink/15',
}

// 타입별 심볼·색·설명·상성 — 도감 필터에서 활성 시 디테일 카드로 사용.
// 상성은 1세대 기준 단순화: 효과적(strong) / 약함(weak).
export const TYPE_INFO = {
  전체:   { symbol: '✦',  hex: '#0d1730', desc: '모든 타입을 한눈에 살펴봐요.', strong: [], weak: [] },
  불꽃:   { symbol: '🔥', hex: '#ff7a45', desc: '활활 타오르는 불꽃을 다루는 포켓몬. 화염·열기로 적을 압도해요.', strong: ['풀','얼음','벌레'], weak: ['물','바위','땅'] },
  물:     { symbol: '💧', hex: '#3ba7e8', desc: '바다·강에서 살아가는 포켓몬. 흐름을 자유자재로 다뤄요.', strong: ['불꽃','바위','땅'], weak: ['풀','전기'] },
  풀:     { symbol: '🌿', hex: '#7bc043', desc: '식물의 힘을 다루는 포켓몬. 햇빛과 흙에서 에너지를 얻어요.', strong: ['물','바위','땅'], weak: ['불꽃','얼음','독','비행','벌레'] },
  전기:   { symbol: '⚡', hex: '#facc15', desc: '몸에서 전기를 만들고 흘려보내는 포켓몬. 번개처럼 빨라요.', strong: ['물','비행'], weak: ['땅'] },
  에스퍼: { symbol: '🔮', hex: '#c084fc', desc: '초능력으로 마음을 읽고 사물을 움직이는 신비한 포켓몬.', strong: ['격투','독'], weak: ['벌레','고스트'] },
  비행:   { symbol: '🕊️', hex: '#7dd3fc', desc: '하늘을 자유롭게 날아다니는 포켓몬. 날카로운 시야로 적을 포착해요.', strong: ['풀','격투','벌레'], weak: ['전기','얼음','바위'] },
  독:     { symbol: '☠️', hex: '#fb7185', desc: '독액·독가스를 무기로 쓰는 포켓몬. 서서히 적을 약하게 만들어요.', strong: ['풀','벌레'], weak: ['땅','에스퍼','바위'] },
  벌레:   { symbol: '🐛', hex: '#84cc16', desc: '곤충형 포켓몬. 빠른 번식과 단단한 외골격이 특징.', strong: ['풀','에스퍼'], weak: ['불꽃','비행','바위'] },
  노말:   { symbol: '⭐', hex: '#9aa1a8', desc: '평범하지만 균형 잡힌 포켓몬. 약점은 적지만 결정적 한방도 적어요.', strong: [], weak: ['격투'] },
  얼음:   { symbol: '❄️', hex: '#7dd3fc', desc: '차가운 얼음과 눈을 다루는 포켓몬. 적을 얼려서 움직임을 봉인해요.', strong: ['풀','땅','비행','드래곤'], weak: ['불꽃','격투','바위'] },
  격투:   { symbol: '🥊', hex: '#dc2626', desc: '근육과 격투기술로 정면 승부하는 포켓몬. 한방의 위력이 강해요.', strong: ['노말','바위','얼음'], weak: ['비행','에스퍼'] },
  바위:   { symbol: '🪨', hex: '#a8a29e', desc: '돌·바위처럼 단단한 방어력을 자랑하는 포켓몬.', strong: ['불꽃','비행','벌레','얼음'], weak: ['물','풀','격투','땅'] },
  땅:     { symbol: '🌍', hex: '#b45309', desc: '대지를 흔드는 힘을 가진 포켓몬. 지면으로부터 에너지를 얻어요.', strong: ['불꽃','전기','독','바위'], weak: ['물','풀','얼음'] },
  드래곤: { symbol: '🐉', hex: '#7c3aed', desc: '전설의 드래곤 포켓몬. 거대한 체구와 압도적인 힘을 가졌어요.', strong: ['드래곤'], weak: ['얼음','드래곤','페어리'] },
  고스트: { symbol: '👻', hex: '#5b21b6', desc: '유령처럼 형체가 흐릿한 포켓몬. 상대의 정신을 공격해요.', strong: ['에스퍼','고스트'], weak: ['고스트','악'] },
  페어리: { symbol: '🧚', hex: '#f0a8d0', desc: '신비롭고 사랑스러운 페어리 포켓몬. 드래곤·격투·악 타입에 강해요.', strong: ['드래곤','격투','악'], weak: ['독','강철'] },
  강철:   { symbol: '⚙️', hex: '#9ca3af', desc: '금속으로 이루어진 단단한 포켓몬. 방어력이 매우 높아요.', strong: ['얼음','바위','페어리'], weak: ['불꽃','격투','땅'] },
  악:     { symbol: '🌑', hex: '#1f2937', desc: '어두운 면을 무기로 쓰는 포켓몬. 기습과 책략에 능해요.', strong: ['에스퍼','고스트'], weak: ['격투','벌레','페어리'] },
}

export const TYPE_BG_SOFT = {
  fire:     'from-fire/15',
  water:    'from-water/15',
  grass:    'from-grass/15',
  electric: 'from-electric/30',
  psychic:  'from-psychic/15',
  sky:      'from-sky/20',
  rose:     'from-rose/15',
  mute:     'from-bone-2',
}
