# Base image with Python dependencies
FROM python:3.11-slim

# Add build-time label for identification
LABEL maintainer="Aymen Jallouli"
LABEL description="Base image with Python dependencies for parkEz"

# Install only essential build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set up pip caching
RUN pip install --no-cache-dir --upgrade pip wheel setuptools

# Copy and install Python requirements
WORKDIR /build
COPY Backend/Car-Number-Plates-Detection-IA-Model-/requirements.txt ./

# Install dependencies
RUN pip wheel --wheel-dir=/wheels -r requirements.txt
RUN pip install --no-index --find-links=/wheels -r requirements.txt

# Keep wheels for future builds
VOLUME /wheels

# This image is meant to be used as a base, not run directly
CMD ["echo", "This is a base image for parkEz Python dependencies"]
