# ---- Builder ----
FROM node:18-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/documents/package*.json ./apps/documents/
RUN npm install

COPY . .
RUN npm run build documents

# ---- Production deps ----
FROM node:18-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential python3 && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY apps/documents/package*.json ./apps/documents/
RUN npm ci --only=production

# ---- Final ----
FROM node:18-slim AS final
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist/apps/documents ./dist
COPY package.json ./
CMD ["node", "dist/main.js"]
