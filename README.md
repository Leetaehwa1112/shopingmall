# 🃏 POKÉVAULT

> 한국 최대 희귀 포켓몬 카드 옥션 & 컬렉터블 마켓 (프로토타입)

![Stack](https://img.shields.io/badge/React-19-61dafb) ![Vite](https://img.shields.io/badge/Vite-8-646cff) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Express](https://img.shields.io/badge/Express-5-000000) ![MongoDB](https://img.shields.io/badge/MongoDB-mongoose-47a248)

---

## 📦 구성

```
shopingmall/
├── client/   # React 19 + Vite 8 + Tailwind v4 프론트엔드
└── server/   # Node.js + Express + MongoDB(Mongoose) 백엔드
```

---

## 🎨 컨셉

- **포켓덱스 액센트 + 프리미엄 옥션 하우스 베이스** — 크림/화이트 베이스에 작은 LED·픽셀 라벨·LCD 카운트다운으로 포켓몬 무드를 가미
- **초희귀 카드는 옥션**, 일반 카드는 즉시구매, 미개봉 카드팩은 별도 마켓
- **가격대별 자동 배송 등급** — 1억 이상 거래는 Brink's Armored Transport 자동 적용

---

## ✨ 주요 기능

### 일반 페이지
- **메인** — Hero TOP LOT (빨간 Pokédex 케이스 + LCD 스펙 시트 + 턴테이블 카드 회전 + 입찰 패널)
- **경매 카탈로그** — 초희귀 카드 라이브 옥션 (Charizard 1st PSA 10, Pikachu Illustrator 등)
- **희귀카드 마켓** — 즉시구매
- **카드팩 마켓** — Base 1st / Jungle / Fossil / Neo / Celebrations / Shining Fates 등 (퀵 배송 지원)
- **상품 디테일** — 앞면 / 뒷면 / **PSA 인증 슬랩** / **컨디션 리포트** 4뷰 토글
- **장바구니 / 주문 / 결제** — 가격대별 동적 배송 옵션 (Brink's·FedEx·퀵·일반)
- **마이페이지** — 컬렉션 / 입찰중 / 위시리스트 / 주문
- **경매 등록** — 5단계 stepper (정보 → 등급 → 가격 → 사진 → 검토)

### 관리자
- **대시보드** — KPI · 진행중 경매 · 최근 활동
- **카드 관리** — 등록 팝업 (5섹션)
- **주문 관리** — 상세 팝업 + 송장번호 입력

---

## 🛡 배송 시스템

| 가격대 | 등급 | 안내 |
|---|---|---|
| **₩1억+** | `BRINKS_REQUIRED` | Brink's Armored Transport 의무 (무장 호송 2인 + 전액 보험) |
| **₩3천만+** | `BRINKS_RECOMMENDED` | Brink's 권장 |
| **₩500만+** | `INSURED` | FedEx Priority Insured 권장 |
| **₩500만 미만** | `STANDARD` | 일반 배송 / FedEx 선택 |
| **카드팩** | `PACK` | ⚡ 퀵 배송 (서울·경기 당일 2-4시간) |

---

## 🚀 실행

```bash
# 프론트엔드
cd client
npm install
npm run dev          # http://localhost:3000

# 백엔드
cd server
npm install
npm run dev          # http://localhost:5000
```

### 환경 변수 (`server/.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/shopingmall
NODE_ENV=development
```

---

## 🎴 데이터 (Mock)

실제 포켓몬 카드 이미지는 [Pokemon TCG API](https://pokemontcg.io)의 공식 이미지를 사용합니다.

### 옥션 (초희귀)
- Charizard 1st Edition Base Shadowless · PSA 10
- Pikachu Illustrator · PSA 7
- Shining Charizard · BGS 9.5
- Lugia 1st Edition · PSA 10

### 즉시구매
- Mewtwo / Blastoise / Venusaur / Gyarados / Alakazam / Machamp / Ninetales / Raichu / Pikachu (Base & Jungle)

### 카드팩
- Base Set 1st Edition Pack & Box (1999)
- Jungle / Fossil / Neo Genesis 1st (1999-2000)
- Celebrations 25주년 (2021)
- Shining Fates ETB / Hidden Fates Pack

---

## 🔐 데모 로그인

- 이메일에 `admin` 포함하여 로그인하면 **관리자 모드**로 진입
- 그 외에는 일반 트레이너로 로그인

---

## 🛠 기술 스택

**Frontend**
- React 19 · React Router 7 · Vite 8
- Tailwind CSS v4 (`@theme` directive)
- Zustand (auth · cart · wishlist · toast)
- TanStack React Query
- Custom fonts: Bungee · Pretendard · Press Start 2P · VT323 · JetBrains Mono

**Backend (스캐폴드)**
- Node.js · Express 5
- Mongoose (MongoDB)
- CORS · dotenv

---

## 📝 라이선스

데모/프로토타입 용도. 포켓몬 IP는 Nintendo · Creatures · GAME FREAK의 소유입니다.
