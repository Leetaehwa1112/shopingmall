require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const User = require('../src/models/User');

const NOW = Date.now();
const H = 1000 * 60 * 60;
const M = 1000 * 60;

const ALL_CARDS = [
  {
    sku: 'CHARIZARD-1ST-PSA10', name: 'Charizard', nameKo: '리자몽',
    set: 'Base Set 1st Edition Shadowless', setShort: 'Base Set', year: 1999, number: '4/102',
    category: 'base', sale_type: 'auction', price: 80000000, stock: 1,
    accent: '#ff6b35', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 10, country: 'USA', cert: '52819374' },
    startPrice: 80000000, currentBid: 142000000, bidCount: 47, watchers: 312,
    endsAt: new Date(NOW + H * 8 + M * 23),
    population: { psa10: 121, psa9: 1432, total: 8420 },
    images: ['https://images.pokemontcg.io/base1/4_hires.png'],
    description: 'Base Set 1st Edition Shadowless Charizard. 포켓몬 카드의 성배. 완벽한 코너, 센터링 55/45.',
  },
  {
    sku: 'PIKACHU-ILLUSTRATOR', name: 'Pikachu Illustrator', nameKo: '피카츄 일러스트레이터',
    set: 'CoroCoro Comic Promo (1998)', setShort: 'Promo', year: 1998, number: 'Promo',
    category: 'japanese', sale_type: 'auction', price: 200000000, stock: 1,
    accent: '#fbd24a', rarity: 'promo-ultra', isHolo: false,
    grade: { company: 'PSA', score: 7, country: 'JPN', cert: '38291047' },
    startPrice: 200000000, currentBid: 387000000, bidCount: 23, watchers: 891,
    endsAt: new Date(NOW + H * 47 + M * 12),
    population: { psa7: 7, total: 39 },
    images: ['https://images.pokemontcg.io/base1/58_hires.png'],
    description: '1998년 CoroCoro 일러스트 콘테스트 수상자에게만 지급된 전 세계 39장 한정 카드.',
  },
  {
    sku: 'SHINING-CHARIZARD', name: 'Shining Charizard', nameKo: '샤이닝 리자몽',
    set: 'Neo Destiny', setShort: 'Neo Destiny', year: 2001, number: '107/105',
    category: 'neo', sale_type: 'auction', price: 9000000, stock: 1,
    accent: '#3a8dde', rarity: 'shining', isHolo: true,
    grade: { company: 'BGS', score: 9.5, country: 'JPN', cert: 'BGS-9982341' },
    startPrice: 9000000, currentBid: 14500000, bidCount: 31, watchers: 178,
    endsAt: new Date(NOW + H * 22 + M * 5),
    population: { bgs95: 89, total: 1240 },
    images: ['https://images.pokemontcg.io/neo4/107_hires.png'],
    description: 'Neo Destiny 시크릿 레어. 샤이닝 효과의 원조. 완벽한 보존 상태.',
  },
  {
    sku: 'LUGIA-1ST-PSA10', name: 'Lugia', nameKo: '루기아',
    set: 'Neo Genesis 1st Edition', setShort: 'Neo Genesis', year: 2000, number: '9/111',
    category: 'neo', sale_type: 'auction', price: 30000000, stock: 1,
    accent: '#a78bfa', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 10, country: 'USA', cert: '49281748' },
    startPrice: 30000000, currentBid: 48000000, bidCount: 19, watchers: 247,
    endsAt: new Date(NOW + H * 2 + M * 47),
    population: { psa10: 51 },
    images: ['https://images.pokemontcg.io/neo1/9_hires.png'],
    description: 'Neo Genesis 1st Edition Lugia PSA 10. 인구 51장. 마감 임박.',
  },
  {
    sku: 'MEWTWO-1ST', name: 'Mewtwo', nameKo: '뮤츠',
    set: 'Base Set 1st Edition', setShort: 'Base Set', year: 1999, number: '10/102',
    category: 'base', sale_type: 'buynow', price: 15800000, stock: 1,
    accent: '#a855f7', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 10, country: 'USA', cert: '52917382' },
    population: { psa10: 287 },
    images: ['https://images.pokemontcg.io/base1/10_hires.png'],
    description: 'Base Set 1st Edition Mewtwo PSA 10. 보존 상태 완벽.',
  },
  {
    sku: 'BLASTOISE-SHADOWLESS', name: 'Blastoise', nameKo: '거북왕',
    set: 'Base Set Shadowless', setShort: 'Base Set', year: 1999, number: '2/102',
    category: 'base', sale_type: 'buynow', price: 6400000, stock: 1,
    accent: '#3b82f6', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 9, country: 'USA', cert: '52738201' },
    population: { psa9: 1820 },
    images: ['https://images.pokemontcg.io/base1/2_hires.png'],
    description: 'Shadowless 1st print Blastoise. PSA 9.',
  },
  {
    sku: 'VENUSAUR-1ST', name: 'Venusaur', nameKo: '이상해꽃',
    set: 'Base Set 1st Edition', setShort: 'Base Set', year: 1999, number: '15/102',
    category: 'base', sale_type: 'buynow', price: 12700000, stock: 1,
    accent: '#22c55e', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 10, country: 'USA', cert: '52183907' },
    population: { psa10: 178 },
    images: ['https://images.pokemontcg.io/base1/15_hires.png'],
    description: 'Base Set 1st Edition Venusaur PSA 10.',
  },
  {
    sku: 'GYARADOS-BASE', name: 'Gyarados', nameKo: '갸라도스',
    set: 'Base Set', setShort: 'Base Set', year: 1999, number: '6/102',
    category: 'base', sale_type: 'buynow', price: 980000, stock: 1,
    accent: '#0ea5e9', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 9, country: 'USA', cert: '52938201' },
    population: { psa9: 4820 },
    images: ['https://images.pokemontcg.io/base1/6_hires.png'],
    description: 'Base Set Gyarados Holo PSA 9.',
  },
  {
    sku: 'ALAKAZAM-BASE', name: 'Alakazam', nameKo: '후딘',
    set: 'Base Set 1st Edition', setShort: 'Base Set', year: 1999, number: '1/102',
    category: 'base', sale_type: 'buynow', price: 2300000, stock: 1,
    accent: '#c084fc', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 9, country: 'USA', cert: '52738451' },
    population: { psa9: 1980 },
    images: ['https://images.pokemontcg.io/base1/1_hires.png'],
    description: 'Base Set 1st Edition Alakazam PSA 9.',
  },
  {
    sku: 'MACHAMP-1ST', name: 'Machamp', nameKo: '괴력몬',
    set: 'Base Set 1st Edition', setShort: 'Base Set', year: 1999, number: '8/102',
    category: 'base', sale_type: 'buynow', price: 1850000, stock: 1,
    accent: '#f97316', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 10, country: 'USA', cert: '52183442' },
    population: { psa10: 624 },
    images: ['https://images.pokemontcg.io/base1/8_hires.png'],
    description: 'Base Set 1st Edition Machamp PSA 10.',
  },
  {
    sku: 'NINETALES-BASE', name: 'Ninetales', nameKo: '나인테일',
    set: 'Base Set', setShort: 'Base Set', year: 1999, number: '12/102',
    category: 'base', sale_type: 'buynow', price: 1620000, stock: 1,
    accent: '#ef4444', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 10, country: 'USA', cert: '52281347' },
    population: { psa10: 412 },
    images: ['https://images.pokemontcg.io/base1/12_hires.png'],
    description: 'Base Set Ninetales Holo PSA 10.',
  },
  {
    sku: 'RAICHU-BASE', name: 'Raichu', nameKo: '라이츄',
    set: 'Base Set', setShort: 'Base Set', year: 1999, number: '14/102',
    category: 'base', sale_type: 'buynow', price: 1120000, stock: 1,
    accent: '#fbbf24', rarity: 'holo-rare', isHolo: true,
    grade: { company: 'PSA', score: 9, country: 'USA', cert: '52381209' },
    population: { psa9: 2240 },
    images: ['https://images.pokemontcg.io/base1/14_hires.png'],
    description: 'Base Set Raichu Holo PSA 9.',
  },
  {
    sku: 'PIKACHU-BASE', name: 'Pikachu', nameKo: '피카츄',
    set: 'Base Set 1st Edition', setShort: 'Base Set', year: 1999, number: '58/102',
    category: 'base', sale_type: 'buynow', price: 4200000, stock: 1,
    accent: '#facc15', rarity: 'common', isHolo: false,
    grade: { company: 'PSA', score: 10, country: 'USA', cert: '52938401' },
    population: { psa10: 348 },
    images: ['https://images.pokemontcg.io/base1/58_hires.png'],
    description: 'Base Set 1st Edition Pikachu PSA 10. Red Cheeks 변종.',
  },
  {
    sku: 'PIKACHU-JUNGLE', name: 'Pikachu (Jungle)', nameKo: '피카츄 (정글)',
    set: 'Jungle 1st Edition', setShort: 'Jungle', year: 1999, number: '60/64',
    category: 'base', sale_type: 'buynow', price: 1800000, stock: 1,
    accent: '#fcd34d', rarity: 'common', isHolo: false,
    grade: { company: 'PSA', score: 10, country: 'USA', cert: '52938502' },
    population: { psa10: 412 },
    // 기존 jungle/60_hires.png는 404 → base1/58 (Base Set Pikachu)로 대체
    images: ['https://images.pokemontcg.io/base1/58_hires.png'],
    description: 'Jungle 1st Edition Pikachu PSA 10.',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
  const admin = await User.findOne({ user_type: 'admin' });
  if (!admin) { console.error('Admin user not found'); process.exit(1); }

  await Product.deleteMany({});
  const docs = ALL_CARDS.map((c) => ({ ...c, created_by: admin._id, status: 'active' }));
  await Product.insertMany(docs);
  console.log(`Seeded ${docs.length} products.`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
