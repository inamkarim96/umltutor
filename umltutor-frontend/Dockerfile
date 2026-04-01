# ─── Stage 1: Build the React app ───────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN CYPRESS_INSTALL_BINARY=0 npm install

COPY . .


RUN npm run build

# ─── Stage 2: Serve with Nginx ──────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom config
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy the built React app
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
