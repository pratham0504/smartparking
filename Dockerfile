FROM node:20-alpine AS builder
# Utiliser une image officielle de Node.js

WORKDIR /app
COPY Backend/package*.json ./
# Installer les dépendances
RUN npm install --legacy-peer-deps 

COPY Backend ./

EXPOSE 3001
CMD ["npm", "start"]
