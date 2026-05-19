# ─── Client Dockerfile (multi-stage) ───────────────────────
# build 단계: 의존성 설치 + Vite production 빌드
# serve 단계: nginx로 정적 자산 서빙 + SPA fallback

FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_URL은 빌드 시점에 inline됨 — 배포 환경에 맞게 ARG/ENV 주입
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runner
# SPA fallback — / 외 모든 경로를 index.html로
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
  # 정적 자산 캐시 — Vite는 해시된 파일명 사용 → 1년 immutable \
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; } \
}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q -O- http://localhost/ > /dev/null || exit 1
