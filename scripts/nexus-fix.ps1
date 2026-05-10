# Script PowerShell pour diagnostiquer et corriger les problèmes de Nexus

Write-Host "===== Diagnostic Nexus Docker Registry ====" -ForegroundColor Cyan

# Vérification de la connectivité
Write-Host "1) Test de connectivité à Nexus..." -ForegroundColor Yellow
$nexusIP = "172.20.0.2"
$nexusApiPort = "8081"
$nexusDockerPort = "8082"

# Test ping
Write-Host "Test ping:" -ForegroundColor Gray
ping -n 2 $nexusIP

# Test connexion HTTP
Write-Host "Test connexion HTTP à l'API Nexus:" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://${nexusIP}:${nexusApiPort}/service/rest/v1/status" -TimeoutSec 5
    Write-Host "Connexion réussie. Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Échec de connexion: $_" -ForegroundColor Red
}

# Test connexion au registre Docker
Write-Host "Test connexion au registre Docker:" -ForegroundColor Gray
try {
    $response = Invoke-WebRequest -Uri "http://${nexusIP}:${nexusDockerPort}/v2/" -TimeoutSec 5
    Write-Host "Connexion réussie. Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Échec de connexion: $_" -ForegroundColor Red
}

# Vérification de la configuration Docker
Write-Host "2) Vérification de la configuration Docker..." -ForegroundColor Yellow
$dockerInfo = docker info --format "{{json .}}" | ConvertFrom-Json

Write-Host "Registres insécurisés configurés:" -ForegroundColor Gray
if ($dockerInfo.SecurityOptions -match "insecure-registries") {
    Write-Host $dockerInfo.SecurityOptions
} else {
    Write-Host "Aucun registre insécurisé configuré!" -ForegroundColor Red
}

# Recommandations
Write-Host "`n===== Recommandations =====" -ForegroundColor Cyan
Write-Host "1. Vérifiez que '$nexusIP' est bien l'IP de votre conteneur Nexus"
Write-Host "2. Vérifiez que Nexus est configuré pour accepter les connexions HTTP sur le port $nexusDockerPort"
Write-Host "3. Configurez Docker pour accepter le registre insécurisé sur $nexusIP`:$nexusDockerPort"
Write-Host "4. Dans l'interface Nexus, activez 'Allow anonymous docker pull' pour le repository"

# Test de login Docker
Write-Host "`n3) Test de connexion Docker au registre..." -ForegroundColor Yellow
Write-Host "Exécutez cette commande pour tester:"
Write-Host "docker login -u admin -p admin $nexusIP`:$nexusDockerPort" -ForegroundColor Gray
