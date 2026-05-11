
# Use Node image with Python support (slim has better package support than alpine)
FROM node:20-slim

# Set environment variables for pip to work reliably
ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install Python and required build tools for compiling Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
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

# Copy requirements.txt and install Python dependencies (from root of project)
COPY requirements.txt ./
RUN echo "📦 Installing Python dependencies from requirements.txt..." && \
    pip3 install --break-system-packages -r requirements.txt && \
    echo "✅ Python dependencies installed successfully" && \
    python3 -c "import serial; print('✅ pyserial available'); import requests; print('✅ requests available'); import flask; print('✅ flask available')"

# Copy entire project
COPY . .

# Verify the detector assets are inside the Backend build context
RUN echo "--- /app contents after COPY ---" && ls -la /app || true
RUN echo "--- /app/detector contents ---" && ls -la /app/detector || true

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]