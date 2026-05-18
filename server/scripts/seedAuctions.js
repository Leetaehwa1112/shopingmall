require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const AuctionApplication = require('../src/models/AuctionApplication');
const User = require('../src/models/User');

const MOCK_AUCTIONS = [
  {
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
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 8),
  },
  {
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
    currentBid: 387000000,
    bidCount: 23,
    minIncrement: 5000000,
    status: 'live',
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 47),
  },
  {
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
    currentBid: 14500000,
    bidCount: 31,
    minIncrement: 500000,
    status: 'live',
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 22),
  },
  {
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
    currentBid: 48000000,
    bidCount: 19,
    minIncrement: 1000000,
    status: 'live',
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 2 + 1000 * 60 * 47),
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');

  const admin = await User.findOne({ user_type: 'admin' });
  if (!admin) {
    console.error('Admin user not found. Run the app and create an admin first.');
    process.exit(1);
  }

  await AuctionApplication.deleteMany({ status: 'live' });
  console.log('Cleared existing live auctions.');

  const docs = MOCK_AUCTIONS.map((a) => ({ ...a, user: admin._id }));
  await AuctionApplication.insertMany(docs);
  console.log(`Seeded ${docs.length} live auctions.`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
