// 기존 경매 상품의 endsAt을 미래로 밀어서 다시 진행 상태로 전환.
// bidCount/currentBid/startPrice 등 기존 데이터는 보존.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const H = 1000 * 60 * 60;
const M = 1000 * 60;

// 다양한 마감 시간 분포 (마감 임박 / 보통 / 여유)
const ENDS_OFFSETS = [
  H * 2 + M * 47,   // 마감 임박
  H * 8 + M * 23,
  H * 22 + M * 5,
  H * 47 + M * 12,  // 여유
  H * 71 + M * 38,
  H * 96 + M * 15,
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const auctions = await Product.find({ sale_type: 'auction' });
  if (auctions.length === 0) {
    console.log('경매 상품이 없습니다. seedProducts.js를 먼저 실행하세요.');
    process.exit(0);
  }

  const now = Date.now();
  let i = 0;
  for (const a of auctions) {
    const offset = ENDS_OFFSETS[i % ENDS_OFFSETS.length];
    a.endsAt = new Date(now + offset);
    a.status = 'active';
    await a.save();
    console.log(`✓ ${a.nameKo || a.name} → 마감 ${a.endsAt.toLocaleString('ko-KR')}`);
    i++;
  }

  console.log(`\n${auctions.length}건의 경매가 다시 진행 상태로 전환되었습니다.`);
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
