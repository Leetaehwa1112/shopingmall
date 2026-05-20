# Node 22 LTS (server/package.json engines와 일치)
FROM node:22-alpine

WORKDIR /app

# 의존성 먼저 (캐시 최적화)
COPY package*.json ./
RUN npm ci --omit=dev

# 소스 복사
COPY . .

# Fly internal port
EXPOSE 8080

# Production 기본값
ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "src/server.js"]
