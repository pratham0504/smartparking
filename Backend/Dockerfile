
# Utiliser une image officielle de Node.js
FROM node:20-alpine

# Install system dependencies including Python early in build
RUN apk add --no-cache \
    python3 \
    py3-pip \
    build-base \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && python3 --version

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install --legacy-peer-deps

# Copier le reste des fichiers de l'application
COPY . .

# Install Python dependencies for Python services (rfid-bridge, plate-detector)
RUN python3 -m pip install --no-cache-dir \
    pyserial \
    requests \
    flask \
    torch \
    torchvision \
    pillow \
    opencv-python || true

# Exposer le port utilisé par Express
EXPOSE 3001

# Démarrer le serveur
CMD ["npm", "start"]