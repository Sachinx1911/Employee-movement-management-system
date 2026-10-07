# DDSR Movement Register — production image (Next.js standalone output)
# Build:  docker build -t ddsr-movement .
# Run:    docker run -p 3000:3000 --env-file .env.production ddsr-movement
# Migrate (once per release, from the same image):
#         docker run --rm --env-file .env.production ddsr-movement-migrate

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --ignore-scripts && npx prisma generate

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/lib/generated ./lib/generated
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholders; real values are provided at runtime.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" AUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime" npx next build

# Migration runner: has the Prisma CLI and migrations.
FROM deps AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
