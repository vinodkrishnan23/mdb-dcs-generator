# Dockerfile for TigerLens - Next.js 14 Application

# Use Node.js 20 LTS (better compatibility with Next.js 14)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
# Note: Environment variables for build time should be passed during docker build
RUN npm run build

# Production image - minimal runtime environment
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Change ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8080

# Set port environment variable
ENV PORT=8080
#ENV HOSTNAME="0.0.0.0"

# Start the application TigerLens
CMD ["node", "server.js"]