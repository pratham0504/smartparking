# Script pour réparer Docker après une erreur de configuration

Write-Host "Tentative de réparation de Docker Desktop..." -ForegroundColor Yellow

# Chemin du fichier de configuration
$configPath = "C:\ProgramData\Docker\config\daemon.json"

# Sauvegarder le fichier existant si présent
if (Test-Path $configPath) {
    Copy-Item -Path $configPath -Destination "$configPath.bak" -Force
    Write-Host "Le fichier de configuration actuel a été sauvegardé sous $configPath.bak" -ForegroundColor Cyan
}

# Créer un fichier de configuration minimal avec la syntaxe PowerShell correcte
$configuration = @{
    builder = @{
        gc = @{
            defaultKeepStorage = "20GB"
            enabled = $true
        }
    }
    "insecure-registries" = @(
        "172.20.0.10:8082"
    )
    experimental = $false
}

# Convertir l'objet en JSON et l'écrire dans le fichier
$configuration | ConvertTo-Json | Out-File -FilePath $configPath -Encoding ascii

Write-Host "Un nouveau fichier de configuration minimal a été créé." -ForegroundColor Green

# Arrêter tous les services Docker
Write-Host "Arrêt des services Docker..." -ForegroundColor Yellow
Stop-Service -Name docker -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object { $_.Name -like "*docker*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Attente de 5 secondes..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Démarrer Docker Desktop manuellement
Write-Host "Tentative de redémarrage de Docker Desktop..." -ForegroundColor Yellow
Start-Process -FilePath "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue

Write-Host "Patientez pendant que Docker Desktop démarre (environ 30 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Vérifier si Docker fonctionne
Write-Host "Vérification de Docker..." -ForegroundColor Yellow
docker info
$dockerSuccess = $?

if ($dockerSuccess) {
    Write-Host "Docker a été réparé avec succès!" -ForegroundColor Green
    
    Write-Host "Test de connexion au registre Nexus..." -ForegroundColor Yellow
    # Utiliser les identifiants fournis pour Nexus
    docker login 172.20.0.10:8082 -u admin -p admin
    
    if (-not $?) {
        Write-Host "Échec de connexion au registre Nexus. Vérifiez les identifiants." -ForegroundColor Red
    }
} else {
    Write-Host "Docker n'a pas pu être réparé automatiquement." -ForegroundColor Red
    Write-Host "Suggestions:" -ForegroundColor Yellow
    Write-Host "1. Redémarrez votre ordinateur" -ForegroundColor Yellow
    Write-Host "2. Réinstallez Docker Desktop" -ForegroundColor Yellow
    Write-Host "3. Si vous utilisez Windows 10/11, vérifiez que WSL2 et la virtualisation sont correctement configurés" -ForegroundColor Yellow
}
