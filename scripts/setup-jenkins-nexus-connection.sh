#!/bin/bash
# Script pour configurer et diagnostiquer la connexion entre Jenkins et Nexus

# Variables de configuration
NEXUS_HOST="172.20.0.2"
NEXUS_PORT="8082"
NEXUS_USER="admin"  # Remplacer par le vrai utilisateur Nexus si différent
NEXUS_PASS="admin"  # Remplacer par le vrai mot de passe

# Fonction pour afficher des messages colorés
print_status() {
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[0;33m'
    NC='\033[0m' # No Color
    
    case $1 in
        "info") echo -e "${YELLOW}[INFO]${NC} $2" ;;
        "success") echo -e "${GREEN}[SUCCESS]${NC} $2" ;;
        "error") echo -e "${RED}[ERROR]${NC} $2" ;;
        *) echo "$2" ;;
    esac
}

# Vérifier que le script est exécuté dans le conteneur Jenkins
if [ ! -d "/var/jenkins_home" ]; then
    print_status "error" "Ce script doit être exécuté dans le conteneur Jenkins."
    exit 1
fi

print_status "info" "Début de la configuration Jenkins-Nexus..."

# 1. Vérifier les dépendances
print_status "info" "Vérification des dépendances..."
which curl || { apt-get update && apt-get install -y curl; }
which ping || { apt-get update && apt-get install -y iputils-ping; }
which jq || { apt-get update && apt-get install -y jq; }

# 2. Configurer les hosts
print_status "info" "Configuration des hosts..."
if ! grep -q "$NEXUS_HOST nexus" /etc/hosts; then
    echo "$NEXUS_HOST nexus" >> /etc/hosts
    print_status "success" "Entrée ajoutée à /etc/hosts."
else
    print_status "info" "L'entrée existe déjà dans /etc/hosts."
fi

# 3. Configurer Docker pour accepter le registre insécurisé
print_status "info" "Configuration de Docker..."
mkdir -p ~/.docker
cat > ~/.docker/config.json << EOF
{
  "insecure-registries": ["$NEXUS_HOST:$NEXUS_PORT", "nexus:$NEXUS_PORT"],
  "live-restore": true,
  "debug": true
}
EOF
print_status "success" "Configuration Docker créée."

# 4. Tester la connexion à Nexus
print_status "info" "Test de la connexion à Nexus..."
if curl -fs http://$NEXUS_HOST:8081/service/rest/v1/status; then
    print_status "success" "Nexus est accessible."
else
    print_status "error" "Nexus n'est pas accessible sur http://$NEXUS_HOST:8081."
    print_status "info" "Vérification des diagnostics réseau..."
    ping -c 3 $NEXUS_HOST || print_status "error" "Impossible de pinger $NEXUS_HOST"
fi

# 5. Tester la connexion au registry Docker
print_status "info" "Test de la connexion au registry Docker..."
REGISTRY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://$NEXUS_HOST:$NEXUS_PORT/v2/)
if [ "$REGISTRY_RESPONSE" = "401" ]; then
    print_status "success" "Registry Docker accessible (code 401 attendu car authentification nécessaire)."
else
    print_status "error" "Registry Docker non accessible. Code reçu: $REGISTRY_RESPONSE"
fi

# 6. Test login Docker
print_status "info" "Test de login Docker..."
echo "$NEXUS_PASS" | docker login -u $NEXUS_USER --password-stdin $NEXUS_HOST:$NEXUS_PORT 
if [ $? -eq 0 ]; then
    print_status "success" "Login Docker réussi!"
    docker logout $NEXUS_HOST:$NEXUS_PORT
else
    print_status "error" "Login Docker échoué."
fi

# 7. Vérifier les paramètres de Docker
print_status "info" "Vérification de la configuration Docker..."
docker info | grep -A 5 "Insecure Registries" || print_status "error" "Impossible d'afficher la configuration Docker"

print_status "info" "Configuration terminée. Vérifiez les messages d'erreur éventuels ci-dessus."
