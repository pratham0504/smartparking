
FROM node:20 AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Configure npm to be resilient in CI and use the official registry
RUN npm config set registry https://registry.npmjs.org/ \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-factor 2 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000

# Install dependencies using the lockfile for reproducible builds
# Use --legacy-peer-deps to avoid peer dependency failures from older packages
RUN npm ci --legacy-peer-deps --unsafe-perm


# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 5173

# Set environment variable for Vite to bind to all interfaces
ENV HOST=0.0.0.0

# Start the application
CMD ["npm", "run", "dev", "--", "--host"]
