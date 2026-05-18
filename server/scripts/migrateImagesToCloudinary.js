require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const cloudinary = require('../src/config/cloudinary');
const Product = require('../src/models/Product');
const Pack = require('../src/models/Pack');

async function uploadFromUrl(url, publicId, folder) {
  try {
    const result = await cloudinary.uploader.upload(url, {
      public_id: publicId,
      folder,
      overwrite: false,
    });
    return result.secure_url;
  } catch (e) {
    console.warn(`  ⚠ 실패 (${publicId}): ${e.message}`);
    return null;
  }
}

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected\n');

  // 카드 이미지 마이그레이션
  const products = await Product.find({ images: { $exists: true, $ne: [] } });
  console.log(`카드 ${products.length}개 처리 중...`);
  for (const p of products) {
    const newImages = [];
    for (let i = 0; i < p.images.length; i++) {
      const url = p.images[i];
      if (!url || url.includes('cloudinary.com')) { newImages.push(url); continue; }
      const publicId = `${p.sku.toLowerCase()}_${i}`;
      process.stdout.write(`  [카드] ${p.name} 이미지${i + 1} 업로드...`);
      const newUrl = await uploadFromUrl(url, publicId, 'pokevault/cards');
      newImages.push(newUrl || url);
      console.log(newUrl ? ' 완료' : ' 원본 유지');
    }
    await Product.updateOne({ _id: p._id }, { images: newImages });
  }

  // 팩 이미지 마이그레이션
  const packs = await Pack.find({ heroArt: { $ne: '' } });
  console.log(`\n팩 ${packs.length}개 처리 중...`);
  for (const p of packs) {
    const sku = p.sku.toLowerCase();

    if (p.heroArt && !p.heroArt.includes('cloudinary.com')) {
      process.stdout.write(`  [팩] ${p.nameKo || p.name} heroArt 업로드...`);
      const newUrl = await uploadFromUrl(p.heroArt, `${sku}_hero`, 'pokevault/packs');
      if (newUrl) { await Pack.updateOne({ _id: p._id }, { heroArt: newUrl }); console.log(' 완료'); }
      else console.log(' 원본 유지');
    }

    if (p.setLogo && !p.setLogo.includes('cloudinary.com')) {
      process.stdout.write(`  [팩] ${p.nameKo || p.name} setLogo 업로드...`);
      const newUrl = await uploadFromUrl(p.setLogo, `${sku}_logo`, 'pokevault/packs');
      if (newUrl) { await Pack.updateOne({ _id: p._id }, { setLogo: newUrl }); console.log(' 완료'); }
      else console.log(' 원본 유지');
    }
  }

  console.log('\n✓ 마이그레이션 완료');
  process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
