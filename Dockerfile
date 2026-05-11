FROM node:20-slim

ENV PIP_NO_CACHE_DIR=1 \
	PIP_DISABLE_PIP_VERSION_CHECK=1 \
	PYTHONUNBUFFERED=1 \
	PYTHONDONTWRITEBYTECODE=1 \
	PYTHON_BIN=/app/.venv/bin/python

RUN apt-get update && apt-get install -y --no-install-recommends \
	python3 \
	python3-venv \
	python3-pip \
	tesseract-ocr \
	libgl1 \
	libglib2.0-0 \
	libsm6 \
	libxext6 \
	libxrender1 \
	build-essential \
	gcc \
	g++ \
	&& rm -rf /var/lib/apt/lists/*

RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Cache buster: force rebuilds to copy fresh files
ARG BUILD_DATE
ENV BUILD_DATE=${BUILD_DATE}

COPY package*.json ./Backend/
RUN cd Backend && npm install --legacy-peer-deps

COPY . .

RUN python3 -m venv /app/.venv && \
	/app/.venv/bin/pip install --upgrade pip setuptools wheel && \
	/app/.venv/bin/pip install -r requirements.txt && \
	/app/.venv/bin/python -c "import serial, requests, flask, cv2, pytesseract, flask_cors; print('✅ Python deps ready')"

WORKDIR /app/Backend

EXPOSE 3001

CMD ["npm", "start"]
