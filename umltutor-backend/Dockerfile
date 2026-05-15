# Stage 1: Build
FROM node:18-slim AS builder

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

# Generate Prisma Client
RUN npx prisma generate

COPY . .

# Stage 2: Production
FROM node:18-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only the necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

EXPOSE 5000

ENV NODE_ENV=production

CMD ["npm", "start"]
