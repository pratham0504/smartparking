
# Use Node image with Python support (slim has better package support than alpine)
FROM node:20-slim

# Install Python and required build tools for compiling Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create python symlink for compatibility
RUN ln -sf /usr/bin/python3 /usr/bin/python

# Verify Python is available
RUN python3 --version && pip3 --version

# Set working directory
WORKDIR /app

# Copy and install Node dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Install Python dependencies that services will need
# Use pip3 with --no-cache-dir and specific versions for stability
RUN pip3 install --no-cache-dir \
    pyserial==3.5 \
    requests==2.31.0 \
    flask==2.3.3 \
    python-dotenv==1.0.0 || echo "⚠️  Some Python packages may have failed to install, but continuing..."

# Copy entire project
COPY . .

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]