# Base stage
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production dependencies stage
FROM base AS prod-deps
RUN npm ci --only=production

# Production build stage
FROM base AS production
RUN npm ci
COPY . .
# Add any build steps here if needed
RUN npm prune --production

# Final production stage
FROM node:20-alpine AS prod
WORKDIR /app

# Install curl for recipe extraction fallback (bypasses Cloudflare TLS fingerprinting)
RUN apk add --no-cache curl

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy application code
COPY --from=production /app/package*.json ./
COPY --from=production /app/src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/index.js"]
