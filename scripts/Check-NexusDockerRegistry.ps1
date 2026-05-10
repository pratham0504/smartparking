# Script PowerShell pour vérifier et configurer le registre Docker dans Nexus

# Variables
$NEXUS_URL = "http://localhost:8081"
$NEXUS_DOCKER_PORT = "8082"
$NEXUS_USER = "admin"
$NEXUS_PASS = "admin" # Remplacez par votre mot de passe réel
$NEXUS_DOCKER_REPO = "parkEz-docker"

Write-Host "===== Vérification de Nexus Docker Registry =====" -ForegroundColor Cyan

Write-Host "1. Vérifier que Nexus est en fonctionnement" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$NEXUS_URL/service/rest/v1/status" -ErrorAction Stop
    Write-Host "Nexus est opérationnel" -ForegroundColor Green
} catch {
    Write-Host "Erreur: Impossible de se connecter à Nexus sur $NEXUS_URL" -ForegroundColor Red
}

Write-Host "`n2. Se connecter à l'API Nexus pour vérifier la configuration" -ForegroundColor Yellow
$securePassword = ConvertTo-SecureString $NEXUS_PASS -AsPlainText -Force
$credentials = New-Object System.Management.Automation.PSCredential ($NEXUS_USER, $securePassword)

try {
    $repositories = Invoke-RestMethod -Uri "$NEXUS_URL/service/rest/v1/repositories" -Credential $credentials -ErrorAction Stop
    $dockerRepos = $repositories | Where-Object { $_.format -eq "docker" }
    
    if ($dockerRepos) {
        Write-Host "Dépôts Docker trouvés:" -ForegroundColor Green
        $dockerRepos | ForEach-Object { 
            Write-Host "  - $($_.name) (type: $($_.type))" -ForegroundColor Green
        }
    } else {
        Write-Host "Aucun dépôt Docker trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erreur: Impossible de récupérer les dépôts Nexus: $_" -ForegroundColor Red
}

Write-Host "`n3. Vérifier si le dépôt Docker existe déjà" -ForegroundColor Yellow
try {
    $repoExists = $false
    $dockerRepos | ForEach-Object {
        if ($_.name -eq $NEXUS_DOCKER_REPO) {
            $repoExists = $true
            Write-Host "Dépôt '$NEXUS_DOCKER_REPO' trouvé!" -ForegroundColor Green
        }
    }
    if (-not $repoExists) {
        Write-Host "Dépôt '$NEXUS_DOCKER_REPO' non trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erreur lors de la vérification du dépôt: $_" -ForegroundColor Red
}

Write-Host "`n5. Tester la connexion au registre Docker" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$NEXUS_DOCKER_PORT/v2/" -ErrorAction Stop
    Write-Host "Connexion réussie au registre Docker" -ForegroundColor Green
    $response.Headers | Where-Object { $_ -match "Docker-Distribution-Api-Version" }
} catch {
    Write-Host "Erreur de connexion au registre Docker: $_" -ForegroundColor Red
}

Write-Host "`n6. Vérifier que Docker est configuré pour accepter les registres non sécurisés" -ForegroundColor Yellow
$dockerInfo = docker info --format '{{json .}}' | ConvertFrom-Json
if ($dockerInfo.SecurityOptions -match "insecure-registries") {
    Write-Host "Registres insécurisés configurés:" -ForegroundColor Green
    $dockerInfo.SecurityOptions | ForEach-Object { Write-Host "  $_" -ForegroundColor Green }
} else {
    Write-Host "Aucun registre insécurisé configuré" -ForegroundColor Yellow
}

Write-Host "`n7. Tester le login à Nexus avec Docker" -ForegroundColor Yellow
$loginOutput = "$NEXUS_PASS" | docker login -u $NEXUS_USER --password-stdin "localhost:$NEXUS_DOCKER_PORT" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Login Docker réussi" -ForegroundColor Green
} else {
    Write-Host "Échec du login Docker: $loginOutput" -ForegroundColor Red
}

Write-Host "`n===== Résultats du diagnostic =====" -ForegroundColor Cyan
Write-Host "Si vous ne voyez pas d'erreur ci-dessus et que le test de login a réussi,"
Write-Host "alors votre registre Docker Nexus devrait être correctement configuré."
Write-Host "En cas d'erreur, vérifiez:"
Write-Host "1. Que Nexus est bien démarré" -ForegroundColor Yellow
Write-Host "2. Que le registre Docker est configuré sur le port $NEXUS_DOCKER_PORT" -ForegroundColor Yellow
Write-Host "3. Que le dépôt $NEXUS_DOCKER_REPO existe et est de type 'docker-hosted'" -ForegroundColor Yellow
Write-Host "4. Que Docker est configuré pour accepter $($NEXUS_URL):$NEXUS_DOCKER_PORT comme registre non sécurisé" -ForegroundColor Yellow
