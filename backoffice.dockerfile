# Stage 1: Build the application
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY Front-end-Back-Office-/package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the application code
COPY Front-end-Back-Office-/ ./

# Build the application (production build)
RUN npm run build

# Stage 2: Create production image with Nginx
FROM nginx:alpine

# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration if needed
COPY Front-end-Back-Office-/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]