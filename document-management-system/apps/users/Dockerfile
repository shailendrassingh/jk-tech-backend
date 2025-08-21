# ---- Builder ----
FROM node:18-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/users/package*.json ./apps/users/
RUN npm install

COPY . .
RUN npm run build users

# ---- Production deps ----
FROM node:18-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps/users/package*.json ./apps/users/
RUN npm ci --only=production

# ---- Final ----
FROM node:18-slim AS final
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/users ./dist
COPY package.json ./
CMD ["node", "dist/main.js"]
