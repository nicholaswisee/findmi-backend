# ========= Build stage =========
FROM oven/bun:1 AS build
WORKDIR /app

# Copy dependency descriptors first for layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy full project source
COPY . .

# Compile TypeScript → dist (target Bun runtime)
RUN bun build src/index.ts --outdir dist --target bun

# ========= Runtime stage =========
FROM oven/bun:1 AS runtime
WORKDIR /app

# Copy only what's needed to run + migrations
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.* ./
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules

# ========= Environment =========
ENV NODE_ENV=production
ENV PORT=6969
ENV LOG_LEVEL=info

EXPOSE 6969

# ========= Startup =========
# Auto-run migrations, then start API
CMD ["bash", "-c", "bunx drizzle-kit push && bun run dist/index.js"]
