# Backend Dockerfile - Multi-stage build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy shared types
COPY shared ./shared

# Copy package files
COPY backend/package*.json ./backend/

WORKDIR /app/backend

# Install ALL dependencies (including dev for TypeScript compilation)
RUN npm ci

# Copy backend source
COPY backend/ .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy shared types
COPY shared ./shared

# Copy package files and install production deps only
COPY backend/package*.json ./backend/

WORKDIR /app/backend

RUN npm ci --only=production

# Copy compiled JavaScript from builder
COPY --from=builder /app/backend/dist ./dist

# Expose backend port
EXPOSE 3001

# Start the server with compiled JS
CMD ["node", "dist/backend/server.js"]
