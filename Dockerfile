# ========= Build stage =========
FROM oven/bun:1 AS build
WORKDIR /app

# Copy dependency descriptors
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript → dist  (target Bun runtime)
RUN bun build src/index.ts --outdir dist --target bun

# ========= Runtime stage =========
FROM oven/bun:1 AS runtime
WORKDIR /app

# Copy only what’s needed to run
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY package.json bun.lock ./

ENV NODE_ENV=production
ENV PORT=6969
ENV LOG_LEVEL=info

EXPOSE 6969

# Run built server
# CMD ["bun", "run", "dist/index.js"]
CMD bunx drizzle-kit push || true && bun run dist/index.js
