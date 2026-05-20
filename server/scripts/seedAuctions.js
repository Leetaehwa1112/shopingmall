require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const AuctionApplication = require('../src/models/AuctionApplication');
const Product = require('../src/models/Product');
const User = require('../src/models/User');

// ─── 정책: 동시 LIVE 1건. 나머지는 'upcoming'으로 예약. ─────────
//   LOT #1 — 리자몽 (지금 LIVE, 마감까지 6시간)
//   LOT #2 — 피카츄 일러스트레이터 (6시간 후 시작)
//   LOT #3 — 샤이닝 리자몽 (24시간 후 시작)
//   LOT #4 — 루기아 (48시간 후 시작)
const HOUR = 1000 * 60 * 60;
const now = Date.now();

const MOCK_AUCTIONS = [
  {
    lotOrder: 1,
    name: 'Charizard',
    nameKo: '리자몽',
    set: 'Base Set 1st Edition Shadowless',
    year: '1999',
    number: '4/102',
    gradeCompany: 'PSA',
    gradeScore: '10',
    gradeCert: '52819374',
    cardCountry: 'USA',
    saleType: 'auction',
    startPrice: 80000000,
    currentBid: 142000000,
    bidCount: 47,
    minIncrement: 1000000,
    status: 'live',
    // 이미 2시간 전 시작, 6시간 후 마감 — 메인 화면의 "지금 LIVE"
    startsAt: new Date(now - 2 * HOUR),
    endsAt: new Date(now + 6 * HOUR),
    description: '베이스 세트 1세대 리자몽 PSA 10. 거래 기록상 최정상급 컨디션.',
  },
  {
    lotOrder: 2,
    name: 'Pikachu Illustrator',
    nameKo: '피카츄 일러스트레이터',
    set: 'CoroCoro Comic Promo (1998)',
    year: '1998',
    number: 'Promo',
    gradeCompany: 'PSA',
    gradeScore: '7',
    gradeCert: '38291047',
    cardCountry: 'JPN',
    saleType: 'auction',
    startPrice: 200000000,
    minIncrement: 5000000,
    status: 'upcoming',
    // 6시간 후 (리자몽 마감 직후) 시작 — LOT #1 끝나면 무대 인계
    startsAt: new Date(now + 6 * HOUR),
    endsAt: new Date(now + 6 * HOUR + 24 * HOUR),
    description: '코로코로 코믹스 일러스트 콘테스트 1998년 한정 프로모. 현존 최고가 카드.',
  },
  {
    lotOrder: 3,
    name: 'Shining Charizard',
    nameKo: '샤이닝 리자몽',
    set: 'Neo Destiny',
    year: '2001',
    number: '107/105',
    gradeCompany: 'BGS',
    gradeScore: '9.5',
    gradeCert: 'BGS-9982341',
    cardCountry: 'JPN',
    saleType: 'auction',
    startPrice: 9000000,
    minIncrement: 500000,
    status: 'upcoming',
    startsAt: new Date(now + 30 * HOUR),
    endsAt: new Date(now + 30 * HOUR + 12 * HOUR),
    description: '네오 데스티니 시크릿 레어. 일본판 BGS 9.5.',
  },
  {
    lotOrder: 4,
    name: 'Lugia',
    nameKo: '루기아',
    set: 'Neo Genesis 1st Edition',
    year: '2000',
    number: '9/111',
    gradeCompany: 'PSA',
    gradeScore: '10',
    gradeCert: '49281748',
    cardCountry: 'USA',
    saleType: 'auction',
    startPrice: 30000000,
    minIncrement: 1000000,
    status: 'upcoming',
    startsAt: new Date(now + 48 * HOUR),
    endsAt: new Date(now + 48 * HOUR + 12 * HOUR),
    description: '네오 제네시스 1st Edition. 컬렉터즈 그레일.',
  },
];

// AuctionApplication → Product 매핑 (auctionController의 buildProductFromApplication과 동일 정책)
function buildProductFromApp(app, productStatus) {
  return {
    sku: `APP-${app._id.toString().toUpperCase().slice(-12)}`,
    name: app.name,
    nameKo: app.nameKo,
    set: app.set,
    year: Number(app.year) || undefined,
    number: app.number,
    category: 'promo',
    grade: {
      company: app.gradeCompany,
      score: Number.isFinite(Number(app.gradeScore)) ? Number(app.gradeScore) : 0,
      country: app.cardCountry || 'USA',
      cert: app.gradeCert || '',
    },
    sale_type: 'auction',
    price: app.startPrice,
    startPrice: app.startPrice,
    currentBid: app.currentBid || null,
    bidCount: app.bidCount || 0,
    buyNowPrice: app.buyNowPrice || null,
    startsAt: app.startsAt || null,
    endsAt: app.endsAt,
    lotOrder: app.lotOrder || 0,
    images: app.photos || [],
    description: app.description || '',
    stock: 1,
    status: productStatus,
    created_by: app.user,
  };
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const admin = await User.findOne({ user_type: 'admin' });
  if (!admin) {
    console.error('Admin user not found. Run the app and create an admin first.');
    process.exit(1);
  }

  // 기존 LIVE/upcoming 시드 정리 — 신청 + 연결된 Product 모두 삭제 (재현 가능한 시드)
  const oldApps = await AuctionApplication.find({ status: { $in: ['live', 'upcoming'] } }).select('publishedProduct');
  const oldProductIds = oldApps.map((a) => a.publishedProduct).filter(Boolean);
  if (oldProductIds.length) {
    await Product.deleteMany({ _id: { $in: oldProductIds } });
    console.log(`Cleared ${oldProductIds.length} previously published auction Products.`);
  }
  await AuctionApplication.deleteMany({ status: { $in: ['live', 'upcoming'] } });
  console.log('Cleared existing live/upcoming auction applications.');

  // Orphan 청소 — AuctionApplication.publishedProduct에 연결되지 않은 sale_type=auction Product 삭제.
  // 옛 시드(SKU 하드코딩) 잔재 또는 수동 생성 후 신청서가 사라진 경우를 잡아냄.
  const remainingApps = await AuctionApplication.find({}).select('publishedProduct').lean();
  const linkedIds = new Set(remainingApps.map((a) => String(a.publishedProduct)).filter(Boolean));
  const orphans = await Product.find({ sale_type: 'auction' }).select('_id sku').lean();
  const orphanIds = orphans.filter((p) => !linkedIds.has(String(p._id))).map((p) => p._id);
  if (orphanIds.length) {
    await Product.deleteMany({ _id: { $in: orphanIds } });
    console.log(`Cleared ${orphanIds.length} orphan auction Products (not linked to any application).`);
  }

  let liveCount = 0, upcomingCount = 0;
  for (const a of MOCK_AUCTIONS) {
    const app = await AuctionApplication.create({ ...a, user: admin._id });
    // status='live' → Product.status='active', 'upcoming' → 'upcoming'
    const productStatus = a.status === 'live' ? 'active' : 'upcoming';
    const product = await Product.create(buildProductFromApp(app, productStatus));
    app.publishedProduct = product._id;
    await app.save();
    if (a.status === 'live') liveCount++;
    else upcomingCount++;
  }

  console.log(`✓ Seeded ${liveCount} LIVE + ${upcomingCount} UPCOMING auctions.`);
  console.log('  LOT #1: 리자몽 (LIVE, 마감 6시간)');
  console.log('  LOT #2: 피카츄 일러스트레이터 (6시간 후 시작)');
  console.log('  LOT #3: 샤이닝 리자몽 (30시간 후 시작)');
  console.log('  LOT #4: 루기아 (48시간 후 시작)');
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
