@echo off
echo ===== Diagnostic Nexus Docker Registry ====
echo.

set NEXUS_IP=172.20.0.2
set NEXUS_API_PORT=8081
set NEXUS_DOCKER_PORT=8082

echo 1) Test de connectivite a Nexus...
echo.
echo Test ping:
ping -n 2 %NEXUS_IP%
echo.

echo Test connexion HTTP a l'API Nexus:
curl -m 5 http://%NEXUS_IP%:%NEXUS_API_PORT%/service/rest/v1/status || echo Echec de connexion a l'API Nexus
echo.

echo Test connexion au registre Docker:
curl -m 5 http://%NEXUS_IP%:%NEXUS_DOCKER_PORT%/v2/ || echo Echec de connexion au registre Docker
echo.

echo 2) Verification de la configuration Docker...
docker info | findstr "Insecure Registries"
echo.

echo ===== Recommandations =====
echo 1. Verifiez que '%NEXUS_IP%' est bien l'IP de votre conteneur Nexus
echo 2. Verifiez que Nexus est configure pour accepter les connexions HTTP sur le port %NEXUS_DOCKER_PORT%
echo 3. Configurez Docker pour accepter le registre insecurise sur %NEXUS_IP%:%NEXUS_DOCKER_PORT%
echo 4. Dans l'interface Nexus, activez 'Allow anonymous docker pull' pour le repository
echo.

echo 3) Test de connexion Docker au registre...
echo Executez cette commande pour tester:
echo docker login -u admin -p admin %NEXUS_IP%:%NEXUS_DOCKER_PORT%
echo.

pause
