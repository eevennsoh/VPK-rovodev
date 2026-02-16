FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install -g pnpm && pnpm install

COPY rovo ./rovo
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public

# Build Next.js in export mode to generate static HTML
# Remove API routes entirely (they're handled by Express in production)
# Note: Use rm -rf, not mv, because Turbopack still processes .bak folders
RUN rm -rf app/api && \
    NEXT_OUTPUT=export pnpm run build

FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/server.js ./
COPY rovo ./rovo

# Copy the Next.js export output (static HTML files)
COPY --from=builder /build/out ./public

EXPOSE 8080

CMD ["node", "server.js"]
