# Frontend Dockerfile - Multi-stage build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy shared types
COPY shared ./shared

# Copy package files
COPY frontend/package*.json ./frontend/

WORKDIR /app/frontend

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ .

# Build the app
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose frontend port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
