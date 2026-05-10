#!/bin/bash

# IP du registre Nexus
NEXUS_IP="172.20.0.10"
NEXUS_PORT="8082"

echo "Configuring Docker to accept insecure registry at ${NEXUS_IP}:${NEXUS_PORT}..."

# Créer ou mettre à jour le fichier daemon.json
mkdir -p /etc/docker
DOCKER_CONFIG_FILE="/etc/docker/daemon.json"

if [ -f "$DOCKER_CONFIG_FILE" ]; then
  # Le fichier existe, vérifier s'il contient déjà des insecure-registries
  if grep -q "insecure-registries" "$DOCKER_CONFIG_FILE"; then
    # Ajouter le nouveau registre à la liste existante
    TMP_FILE=$(mktemp)
    cat "$DOCKER_CONFIG_FILE" | jq --arg reg "${NEXUS_IP}:${NEXUS_PORT}" '.["insecure-registries"] += [$reg]' > "$TMP_FILE"
    mv "$TMP_FILE" "$DOCKER_CONFIG_FILE"
  else
    # Ajouter la section insecure-registries
    TMP_FILE=$(mktemp)
    cat "$DOCKER_CONFIG_FILE" | jq --arg reg "${NEXUS_IP}:${NEXUS_PORT}" '. + {"insecure-registries": [$reg]}' > "$TMP_FILE"
    mv "$TMP_FILE" "$DOCKER_CONFIG_FILE"
  fi
else
  # Créer un nouveau fichier
  echo '{
  "insecure-registries": ["'${NEXUS_IP}':'${NEXUS_PORT}'"]
}' > "$DOCKER_CONFIG_FILE"
fi

echo "Configuration created in $DOCKER_CONFIG_FILE:"
cat "$DOCKER_CONFIG_FILE"

echo "Restarting Docker daemon..."
systemctl restart docker || service docker restart

echo "Waiting for Docker to restart..."
sleep 5

echo "Testing Docker configuration:"
docker info | grep -A 5 "Insecure Registries"

echo "Testing connection to Nexus Docker registry:"
curl -v http://${NEXUS_IP}:${NEXUS_PORT}/v2/ || echo "Connection to registry failed"

echo "Configuration complete."
