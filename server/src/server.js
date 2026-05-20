require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// ─── 필수 환경변수 검증 ─────────────────────────────────────
// MONGODB_ATLAS_URL 또는 MONGO_URI 중 하나만 있으면 됨
if (!process.env.MONGODB_ATLAS_URL && !process.env.MONGO_URI) {
  console.error('[FATAL] 필수 환경변수 누락: MONGODB_ATLAS_URL 또는 MONGO_URI 중 하나가 필요합니다.');
  process.exit(1);
}
const REQUIRED_ENV = ['JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[FATAL] 필수 환경변수 누락: ${missing.join(', ')}`);
  process.exit(1);
}
// JWT_SECRET 약함 경고 (운영에선 64자+ 권장)
if (process.env.JWT_SECRET.length < 32) {
  console.warn('[WARN] JWT_SECRET이 너무 짧아요. 운영에선 32자 이상 권장 (openssl rand -base64 48).');
}

connectDB();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

// ─── Graceful shutdown ──────────────────────────────────────
// SIGTERM (k8s/PM2 등) / SIGINT (Ctrl+C) 시 진행 중인 요청 마무리 후 종료.
let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[${signal}] 서버 종료 시작 — 진행 중인 요청 마무리...`);
  server.close((err) => {
    if (err) {
      console.error('HTTP 서버 종료 실패:', err);
      process.exit(1);
    }
    mongoose.connection.close(false).then(() => {
      console.log('Mongo 연결 종료. 안녕히 가세요 👋');
      process.exit(0);
    });
  });
  // 10초 안에 안 끝나면 강제 종료
  setTimeout(() => {
    console.error('강제 종료 (timeout 10s)');
    process.exit(1);
  }, 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// 미처리 예외/거부 — 로깅 후 안전 종료
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
