FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	DEBIAN_FRONTEND=noninteractive

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		tesseract-ocr \
		libgl1 \
		libglib2.0-0 \
		libgomp1 \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements_prod.txt ./

RUN pip install --no-cache-dir --upgrade pip \
	&& pip install --no-cache-dir -r requirements_prod.txt

COPY . .

EXPOSE 5001

CMD ["python", "plate_detector_hybrid.py"]
