# ─── Stage 1: Build dependencies ───────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package.json ./
RUN npm install --omit=dev

# ─── Stage 2: Generate Prisma client ────────────────────────────────────────────
FROM node:20-alpine AS prisma
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

# ─── Stage 3: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules
# Copy generated Prisma client
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma /app/node_modules/@prisma ./node_modules/@prisma

# Copy application source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node src/server.js"]
