# ---- build stage: compile TS -> JS ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps first (better layer caching — these change less often than src/)
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# ---- runtime stage: ship just what's needed ----
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY data ./data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/server.js"]
