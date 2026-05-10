#!/bin/bash

# Script pour configurer correctement la connexion Jenkins-Nexus
# À exécuter dans le conteneur Jenkins

echo "========== Jenkins-Nexus Connection Fix =========="
echo "Diagnostic et correction de la connexion Jenkins vers Nexus"

# 1. Installation des outils de diagnostic
echo -e "\n[1] Installation des outils de diagnostic..."
apt-get update -qq
apt-get install -y -qq curl jq iputils-ping netcat-openbsd

# 2. Test de connectivité à Nexus
echo -e "\n[2] Test de connectivité à Nexus..."
echo "Ping Nexus:"
ping -c 2 172.20.0.2 || echo "Ping failed but continuing"

echo "TCP Connection test to Nexus Docker Registry:"
nc -zv 172.20.0.2 8082 || echo "Connection failed but continuing"

echo "HTTP Connection test to Nexus API:"
curl -v -m 5 http://172.20.0.2:8081/service/rest/v1/status || echo "Failed to connect to Nexus API"

# 3. Configuration Docker pour accepter registre insécurisé
echo -e "\n[3] Configuration Docker daemon..."

# Créer le fichier de configuration Docker
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << EOF
{
  "insecure-registries": [
    "172.20.0.2:8082", 
    "localhost:8082"
  ],
  "log-level": "debug",
  "debug": true
}
EOF

echo "Docker daemon configuration:"
cat /etc/docker/daemon.json

# 4. Redémarrer Docker avec les nouveaux paramètres si possible
echo -e "\n[4] Tentative de redémarrage Docker (peut ne pas fonctionner dans Jenkins)..."
(service docker restart || systemctl restart docker || echo "Could not restart Docker, please restart Jenkins container") &

# 5. Espérer que Docker redémarre
echo -e "\n[5] Attente de 10 secondes pour Docker..."
sleep 10

# 6. Test de connexion Docker à Nexus
echo -e "\n[6] Test de connexion Docker à Nexus..."

# Cette étape doit être exécutée manuellement avec les identifiants Nexus
echo "Pour tester la connexion, exécutez manuellement :"
echo "  docker login -u admin -p admin 172.20.0.2:8082"

echo -e "\n========== Fin de diagnostic =========="
echo "Si les problèmes persistent, vous devrez peut-être :"
echo "1. Redémarrer le conteneur Jenkins"
echo "2. Configurer un proxy Docker Registry entre Jenkins et Nexus"
echo "3. Utiliser uniquement DockerHub pour les images"
