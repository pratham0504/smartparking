
# Utiliser une image officielle de Node.js
FROM node:20-alpine AS builder

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install --legacy-peer-deps 

# Ensure Python3 and pip are available for spawned Python services (rfid/plate-detector)
# and create a python symlink for compatibility.
RUN apk add --no-cache python3 py3-pip && \
	python3 -m pip install --upgrade pip setuptools wheel || true && \
	if [ ! -e /usr/bin/python ]; then ln -s /usr/bin/python3 /usr/bin/python; fi


# Copier le reste des fichiers de l'application
COPY . .

# Exposer le port utilisé par Express
EXPOSE 3001

# Démarrer le serveur
CMD ["npm", "start"]