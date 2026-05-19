# ─── Server Dockerfile (multi-stage) ───────────────────────
# Node 22 LTS slim 베이스. multi-stage로 prod 의존성만 최종 이미지에.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app

# 비특권 사용자 생성 — root로 실행 금지
RUN addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app src ./src
COPY --chown=app:app package*.json ./

USER app
EXPOSE 5000

# 헬스체크 — Docker daemon이 컨테이너 상태 추적
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
