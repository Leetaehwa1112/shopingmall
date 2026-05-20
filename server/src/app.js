const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ─── 프록시 뒤 신뢰 (Nginx/Cloudflare/AWS ALB 뒤에 두면 X-Forwarded-* 신뢰) ───
app.set('trust proxy', 1);

// ─── gzip 압축 — JSON 응답 60-80% 감소 (Heroku ↔ 원거리 클라이언트 RTT 비용 큼) ───
// threshold 1KB: 작은 응답은 압축 오버헤드 회피
app.use(compression({ threshold: 1024 }));

// ─── HTTP 로깅 — production은 combined, dev는 dev ───────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── 보안 헤더 ────────────────────────────────────────────────
// CSP는 React inline style/이미지 외부 URL 많아 보수적 기본값 + 일부 완화.
// frameguard, xssFilter, noSniff, hidePoweredBy 등은 기본 활성.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'img-src': ["'self'", 'data:', 'https:'],          // Cloudinary, pokemontcg.io 등
      'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.portone.io'], // PortOne SDK
      'connect-src': ["'self'", 'https://api.portone.io', 'https:'],
      'frame-src': ["'self'", 'https://*.portone.io'],   // 결제 모달
      'style-src': ["'self'", "'unsafe-inline'"],        // Tailwind inline styles
    },
  },
  crossOriginEmbedderPolicy: false, // Cloudinary 이미지 임베드 허용
}));

// ─── NoSQL injection 방어 — req.body 내 $/.기호 키 제거 ───
// Express 5에서 req.query는 getter-only라 직접 수정 불가 → body만 위생 처리.
// 대부분의 NoSQL injection은 body 페이로드 경유 (검색 쿼리는 controller에서 sanitize).
const sanitizeKeys = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (k.startsWith('$') || k.includes('.')) delete obj[k];
    else if (obj[k] && typeof obj[k] === 'object') sanitizeKeys(obj[k]);
  }
};
app.use((req, _res, next) => { sanitizeKeys(req.body); next(); });

// ─── CORS — origin은 환경변수로 (배포 시 도메인 교체) ─────────
// CLIENT_ORIGIN 콤마 구분 multi 허용. 개발은 localhost:3000 기본.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // 같은 출처 / curl 등 origin 없는 요청 허용
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// ─── Body parser (크기 제한 — payload bomb 방지) ───────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ─── Rate limiting ─────────────────────────────────────────────
// 글로벌 — 모든 /api 트래픽에 너그러운 상한 (1500 / 15min / IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
});
// 인증 — 로그인/회원가입은 brute force 방어 강한 상한 (20 / 15min / IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '로그인 시도가 너무 많아요. 15분 후 다시 시도해주세요.' },
});
// 입찰 — 동일 IP 분당 30회 (다회 입찰 패턴 허용하되 봇 차단)
const bidLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '입찰 시도가 너무 빠르네요. 잠시 후 다시 시도해주세요.' },
});
// 업로드 — 분당 10건
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '업로드 횟수 초과. 잠시 후 다시 시도해주세요.' },
});

app.use('/api', globalLimiter);
// 라우트별 limiter는 라우트에서 mount 가능하지만 path 매칭으로 일괄 적용:
app.use('/api/users/login', authLimiter);
app.use('/api/users', (req, res, next) => req.method === 'POST' && req.path === '/' ? authLimiter(req, res, next) : next());
app.use('/api/upload', uploadLimiter);

// ─── 헬스체크 ─────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ─── Routes ────────────────────────────────────────────────────
app.use('/api/upload',   require('./routes/upload'));
app.use('/api/stats',    require('./routes/stats'));
app.use('/api/cart',     require('./routes/cart'));
app.use('/api/orders',   require('./routes/order'));
app.use('/api/products', require('./routes/product'));
app.use('/api/packs',    require('./routes/pack'));
app.use('/api/auctions', require('./routes/auction'));
app.use('/api/users',    require('./routes/user'));

// 입찰 라우트 별도 limiter (위 limiter는 글로벌 mount보다 우선해야 하므로 라우트에서 따로 적용해도 됨)
app.use('/api/products/:id/bid', bidLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use(errorHandler);

module.exports = app;
