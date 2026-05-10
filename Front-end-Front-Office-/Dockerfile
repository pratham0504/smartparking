# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --no-audit

# Copy source files and build
COPY . .
# Set API URL and other environment variables during build
ARG REACT_APP_API_URL=http://localhost:3001
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Production stage using Nginx
FROM nginx:alpine AS production

# Copy build output from builder stage
COPY --from=builder /app/build /usr/share/nginx/html
# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:3000/ || exit 1
