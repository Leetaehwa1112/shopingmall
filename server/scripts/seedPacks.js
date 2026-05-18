require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Pack = require('../src/models/Pack');
const User = require('../src/models/User');

const MOCK_PACKS = [
  { sku: 'PACK-BASE1-1ST', name: 'Base Set 1st Edition Booster Pack', nameKo: '베이스 세트 1st 부스터팩', setShort: 'Base Set 1st Ed.', year: 1999, type: 'pack', price: 8500000, stock: 3, cardsPerPack: 11, heroArt: 'https://images.pokemontcg.io/base1/4_hires.png', setLogo: 'https://images.pokemontcg.io/base1/logo.png', description: '미개봉 1999년 Base Set 1st Edition 부스터팩. 11카드 + 1 에너지. Charizard 등장 가능.' },
  { sku: 'BOX-BASE1-1ST', name: 'Base Set 1st Edition Booster Box', nameKo: '베이스 세트 1st 부스터박스', setShort: 'Base Set 1st Ed.', year: 1999, type: 'box', price: 320000000, stock: 1, cardsPerPack: 36, heroArt: 'https://images.pokemontcg.io/base1/4_hires.png', setLogo: 'https://images.pokemontcg.io/base1/logo.png', description: '미개봉 36팩 박스. 가장 희귀한 vintage 부스터박스. 투자 가치 최고.' },
  { sku: 'PACK-JUNGLE-1ST', name: 'Jungle 1st Edition Booster Pack', nameKo: '정글 1st 부스터팩', setShort: 'Jungle', year: 1999, type: 'pack', price: 1850000, stock: 5, cardsPerPack: 11, heroArt: 'https://images.pokemontcg.io/base2/14_hires.png', setLogo: 'https://images.pokemontcg.io/base2/logo.png', description: '정글 세트 1st Edition. Snorlax, Wigglytuff, Pikachu 등.' },
  { sku: 'PACK-FOSSIL-1ST', name: 'Fossil 1st Edition Booster Pack', nameKo: '화석 1st 부스터팩', setShort: 'Fossil', year: 1999, type: 'pack', price: 1650000, stock: 6, cardsPerPack: 11, heroArt: 'https://images.pokemontcg.io/base3/1_hires.png', setLogo: 'https://images.pokemontcg.io/base3/logo.png', description: 'Aerodactyl, Dragonite 등 화석 포켓몬 등장.' },
  { sku: 'PACK-NEO1-1ST', name: 'Neo Genesis 1st Edition Booster Pack', nameKo: '네오 제네시스 1st 부스터팩', setShort: 'Neo Genesis', year: 2000, type: 'pack', price: 2400000, stock: 8, cardsPerPack: 11, heroArt: 'https://images.pokemontcg.io/neo1/9_hires.png', setLogo: 'https://images.pokemontcg.io/neo1/logo.png', description: 'Lugia 등장. Neo Genesis 1st Edition 미개봉 팩.' },
  { sku: 'PACK-CEL25', name: '25th Anniversary · Celebrations Pack', nameKo: '25주년 · 셀러브레이션 팩', setShort: 'Celebrations', year: 2021, type: 'pack', price: 180000, stock: 24, cardsPerPack: 4, heroArt: 'https://images.pokemontcg.io/cel25/24_hires.png', setLogo: 'https://images.pokemontcg.io/cel25/logo.png', description: '포켓몬 25주년 기념 한정판. Mew / Charizard 셀러브레이션.' },
  { sku: 'BOX-SWSH45-ETB', name: 'Shining Fates Elite Trainer Box', nameKo: '샤이닝 페이츠 ETB', setShort: 'Shining Fates', year: 2021, type: 'box', price: 420000, stock: 12, cardsPerPack: 100, heroArt: 'https://images.pokemontcg.io/swsh45sv/SV107_hires.png', setLogo: 'https://images.pokemontcg.io/swsh45/logo.png', description: 'Charizard VMAX 등 샤이니 카드. 10팩 + 슬리브 + 카운터.' },
  { sku: 'PACK-SM115', name: 'Hidden Fates Booster Pack', nameKo: '히든 페이츠 부스터팩', setShort: 'Hidden Fates', year: 2019, type: 'pack', price: 280000, stock: 15, cardsPerPack: 10, heroArt: 'https://images.pokemontcg.io/sm115/9_hires.png', setLogo: 'https://images.pokemontcg.io/sm115/logo.png', description: 'Shiny Vault 한정. Charizard-GX 등 샤이니 카드 다수 출현.' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
  const admin = await User.findOne({ user_type: 'admin' });
  if (!admin) { console.error('Admin not found'); process.exit(1); }
  await Pack.deleteMany({});
  await Pack.insertMany(MOCK_PACKS.map((p) => ({ ...p, created_by: admin._id })));
  console.log(`Seeded ${MOCK_PACKS.length} packs.`);
  process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
