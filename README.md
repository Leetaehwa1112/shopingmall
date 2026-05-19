# 🃏 POKÉVAULT

> 한국 희귀 포켓몬 카드 옥션 & 컬렉터블 마켓

![Stack](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Express](https://img.shields.io/badge/Express-5-000000) ![MongoDB](https://img.shields.io/badge/MongoDB-mongoose-47a248) ![Node](https://img.shields.io/badge/Node-22-339933)

---

## 📦 구성

```
shopingmall/
├── client/                React 19 + Vite 8 + Tailwind v4
├── server/                Node.js 22 + Express 5 + Mongoose 9
├── docker-compose.yml     로컬 풀스택 (mongo + server + client)
└── .github/workflows/     CI (build / syntax / docker)
```

---

## ✨ 주요 기능

### 일반
- 경매 LIVE — 원자적 입찰(race-safe), 마감 카운트다운
- 즉시구매 + 카드팩 마켓
- 가격대별 동적 배송 옵션 (₩100M+ 자동 Brink's 무장 호송)
- 카드 출품 — 5스텝 stepper(정보/등급/가격/사진/검토), 클릭+드래그앤드롭 Cloudinary 업로드
- PortOne 결제 (카드/토스/카카오/가상계좌/에스크로)
- 위시리스트 서버 동기화, 장바구니 persist + 머지
- 마이페이지(컬렉션/입찰/위시/주문/출품/프로필 수정)
- 포켓덱스(도감) — 카드별 매물 매칭

### 관리자
- 대시보드 KPI / 라이브 경매 모니터
- 상품·팩 인라인 편집 + 일괄 삭제 / 송장 CSV 일괄 등록
- 경매 신청 검수 — 승인/거절/라이브 전환 시 **Product 자동 게시**
- 감사 로그(Audit Log)

---

## 🚀 빠른 시작

### 로컬 직접 실행

```bash
# 1. 서버
cd server
cp .env.example .env       # JWT_SECRET, Cloudinary 등 채우기
npm install
npm run dev                # http://localhost:5000

# 2. 클라이언트 (별도 터미널)
cd client
cp .env.example .env.local # VITE_API_URL 확인
npm install
npm run dev                # http://localhost:3000
```

### Docker Compose (풀스택)

```bash
# 환경변수 export 또는 .env 파일 작성
export JWT_SECRET=$(openssl rand -base64 48)
export CLOUDINARY_CLOUD_NAME=...
export CLOUDINARY_API_KEY=...
export CLOUDINARY_API_SECRET=...

docker compose up -d --build
# client:  http://localhost:8080
# server:  http://localhost:5000
# mongo:   localhost:27017
```

---

## 🔐 환경 변수

### `server/.env`
| 키 | 필수 | 설명 |
|---|---|---|
| `NODE_ENV` | ✓ | `development` / `production` |
| `PORT` | ✓ | 기본 `5000` |
| `MONGO_URI` | ✓ | MongoDB 연결 문자열 |
| `JWT_SECRET` | ✓ | 32자+ 강력 랜덤 (`openssl rand -base64 48`) |
| `CLIENT_ORIGIN` | ✓ | CORS 허용 도메인 (콤마 multi) |
| `CLOUDINARY_CLOUD_NAME` |  | 이미지 업로드 |
| `CLOUDINARY_API_KEY` |  |  |
| `CLOUDINARY_API_SECRET` |  |  |
| `PORTONE_API_SECRET` |  | 결제 검증/환불 (향후) |

### `client/.env.local`
| 키 | 설명 |
|---|---|
| `VITE_API_URL` | API 베이스 URL. 빌드 시 inline |

---

## 🛡 보안 & 운영 베이스라인

이미 적용:
- **helmet** — CSP / HSTS / X-Frame / X-Content / Referrer-Policy / X-Powered-By 제거
- **express-rate-limit** — 글로벌 / 로그인-회원가입 / 입찰 / 업로드 4중 limiter
- **NoSQL injection sanitizer** — req.body의 `$` / `.` 키 재귀 제거
- **CORS allowlist** — `CLIENT_ORIGIN` 환경변수 기반
- **JWT 검증 + 비밀번호 정책** — bcrypt 10 rounds, 8자+ / 2종류 이상
- **IDOR 방어** — `requireSelfOrAdmin` 미들웨어 (위시리스트/프로필)
- **권한 상승 차단** — 회원가입 시 `user_type` 강제 `customer`
- **결제 race 보호** — 원자적 입찰 + 재고 차감 (`findOneAndUpdate` 조건부 + 롤백)
- **production 응답** — 5xx에서 스택/내부 메시지 마스킹
- **graceful shutdown** — SIGTERM/SIGINT 시 진행 중 요청 마무리
- **인덱스** — Product / Order / Pack / Auction 모든 hot path
- **`/health` 엔드포인트** — Docker / k8s / ALB health probe용

향후 (인프라/도메인/3rd party 필요):
- HTTPS / Let's Encrypt
- PortOne 결제 검증 + 환불 API 연동
- 이메일 발송 (회원가입 인증, 비밀번호 재설정, 낙찰 알림)
- SMS 알림 (배송 트래킹)
- 외부 모니터링 (Sentry / Datadog 등)
- DB 백업 자동화 (Atlas / mongodump cron)
- CDN (Cloudflare / CloudFront)

---

## 📐 아키텍처 요약

```
┌─ Browser (React 19 + Vite)
│  ├─ Zustand (auth/cart/wishlist/toast/collection)
│  ├─ TanStack Query (staleTime 5min, refetchOnWindowFocus off)
│  └─ React Router 7 + lazy chunks (admin / detail / order)
│         │ axios + Bearer JWT
│         ▼
└─ Express 5 API
   ├─ helmet / rateLimit / CORS / sanitizer
   ├─ Routes: /api/{users,products,packs,orders,cart,auctions,upload,stats}
   ├─ Middlewares: protect / requireSelfOrAdmin / admin
   └─ Mongoose 9 + indexes + lean queries
         │
         ▼
   MongoDB
```

---

## 🧪 CI

`.github/workflows/ci.yml` — push/PR 시 자동 실행:
- **client-build** — Vite production 빌드
- **server-syntax** — 모든 `.js` 문법 + 모듈 로드 체크
- **docker-build** — server/client 이미지 빌드 smoke 테스트

---

## 🛠 기술 스택

**Frontend**
- React 19 · React Router 7 · Vite 8
- Tailwind v4 (`@theme` directive)
- Zustand · TanStack React Query
- 폰트: Bungee · Pretendard · Press Start 2P · VT323 · JetBrains Mono

**Backend**
- Node.js 22 · Express 5
- Mongoose 9 · bcrypt · jsonwebtoken
- helmet · express-rate-limit · morgan
- multer + Cloudinary (이미지)

---

## 📝 라이선스

데모/포트폴리오 용도. 포켓몬 IP는 Nintendo · Creatures · GAME FREAK의 소유입니다.
실 운영 시 사업자등록, 통신판매업 신고, 변호사 검토된 약관/방침, PortOne 결제 검증 연동이 필요합니다.
