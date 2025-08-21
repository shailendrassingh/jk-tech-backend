# Stage 1: Install production dependencies
FROM node:18-alpine AS deps
WORKDIR /usr/src/app

# Update package list and install build tools needed for some native npm packages
RUN apk update && apk add --no-cache libc6-compat build-base python3

COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# This command builds ALL apps, which is necessary in a monorepo
# to ensure all dependencies and libraries are correctly compiled.
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS final
WORKDIR /usr/src/app
# Copy the built application for the 'users' service
COPY --from=builder /usr/src/app/dist/apps/auth .
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package.json .

CMD ["node", "main.js"]
