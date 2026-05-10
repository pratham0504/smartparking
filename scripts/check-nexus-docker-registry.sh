#!/bin/bash
# Script pour vérifier et configurer le registre Docker dans Nexus

# Variables
NEXUS_URL="http://localhost:8081"
NEXUS_DOCKER_PORT="8082"
NEXUS_USER="admin"
NEXUS_PASS="admin" # Remplacez par votre mot de passe réel
NEXUS_DOCKER_REPO="parkEz-docker"

echo "===== Vérification de Nexus Docker Registry ====="

echo "1. Vérifier que Nexus est en fonctionnement"
curl -s $NEXUS_URL/service/rest/v1/status
echo ""

echo "2. Se connecter à l'API Nexus pour vérifier la configuration"
# Utiliser l'API pour obtenir la liste des dépôts
curl -s -u $NEXUS_USER:$NEXUS_PASS $NEXUS_URL/service/rest/v1/repositories | grep -i docker
echo ""

echo "3. Vérifier si le dépôt Docker existe déjà"
curl -s -u $NEXUS_USER:$NEXUS_PASS $NEXUS_URL/service/rest/v1/repositories/docker | grep -i $NEXUS_DOCKER_REPO
echo ""

echo "4. Vérifier que le port Docker est correctement configuré"
docker_repo_config=$(curl -s -u $NEXUS_USER:$NEXUS_PASS $NEXUS_URL/service/rest/v1/repositories/docker-hosted/$NEXUS_DOCKER_REPO)
echo "$docker_repo_config" | grep -i "http"
echo ""

echo "5. Tester la connexion au registre Docker"
curl -v http://localhost:$NEXUS_DOCKER_PORT/v2/ 2>&1 | grep "Docker-Distribution-Api-Version"
echo ""

echo "6. Vérifier que Docker est configuré pour accepter les registres non sécurisés"
docker info | grep -A 5 "Insecure Registries"
echo ""

echo "7. Tester le login à Nexus avec Docker"
echo "$NEXUS_PASS" | docker login -u $NEXUS_USER --password-stdin localhost:$NEXUS_DOCKER_PORT
echo ""

echo "===== Résultats du diagnostic ====="
echo "Si vous ne voyez pas d'erreur ci-dessus et que le test de login a réussi,"
echo "alors votre registre Docker Nexus devrait être correctement configuré."
echo "En cas d'erreur, vérifiez:"
echo "1. Que Nexus est bien démarré"
echo "2. Que le registre Docker est configuré sur le port $NEXUS_DOCKER_PORT"
echo "3. Que le dépôt $NEXUS_DOCKER_REPO existe et est de type 'docker-hosted'"
echo "4. Que Docker est configuré pour accepter $NEXUS_URL:$NEXUS_DOCKER_PORT comme registre non sécurisé"
