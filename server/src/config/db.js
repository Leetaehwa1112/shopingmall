const mongoose = require('mongoose');

const connectDB = async () => {
  // Atlas URL 우선 사용, 없으면 로컬 MONGO_URI 폴백
  const uri = process.env.MONGODB_ATLAS_URL || process.env.MONGO_URI;
  const label = process.env.MONGODB_ATLAS_URL ? 'Atlas' : 'Local';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected [${label}]: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
