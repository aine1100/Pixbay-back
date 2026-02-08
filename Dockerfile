# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and prisma schema
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built assets and dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./
COPY --from=builder /app/controller ./controller
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/service ./service
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/prisma ./prisma

# Expose the API port
EXPOSE 3000

# Install PM2 globally
RUN npm install pm2 -g

# Set environment to production
ENV NODE_ENV=production

# Start the application with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.cjs", "--env", "production"]
