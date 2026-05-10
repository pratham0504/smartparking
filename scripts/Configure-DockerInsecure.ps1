# Script PowerShell pour configurer Docker afin d'accepter un registre insécurisé

# IP et port du registre Nexus
$NEXUS_IP = "172.20.0.10"
$NEXUS_PORT = "8082"

Write-Host "Configuration de Docker pour accepter le registre insécurisé $NEXUS_IP`:$NEXUS_PORT..."

# Chemin du fichier de configuration Docker
$DOCKER_CONFIG_PATH = "C:\ProgramData\Docker\config"
$DOCKER_CONFIG_FILE = "$DOCKER_CONFIG_PATH\daemon.json"

# Création du répertoire si nécessaire
if (-not (Test-Path -Path $DOCKER_CONFIG_PATH)) {
    New-Item -Path $DOCKER_CONFIG_PATH -ItemType Directory -Force | Out-Null
    Write-Host "Répertoire de configuration Docker créé."
}

# Vérifier si le fichier existe déjà
if (Test-Path -Path $DOCKER_CONFIG_FILE) {
    Write-Host "Fichier de configuration Docker existant détecté."
    
    # Lire la configuration existante
    $configContent = Get-Content -Path $DOCKER_CONFIG_FILE -Raw | ConvertFrom-Json
    
    # Vérifier si la propriété insecure-registries existe
    if (Get-Member -InputObject $configContent -Name "insecure-registries" -MemberType Properties) {
        # Vérifier si le registre est déjà dans la liste
        $registryExists = $false
        foreach ($registry in $configContent."insecure-registries") {
            if ($registry -eq "$NEXUS_IP`:$NEXUS_PORT") {
                $registryExists = $true
                break
            }
        }
        
        # Ajouter le registre s'il n'existe pas déjà
        if (-not $registryExists) {
            $configContent."insecure-registries" += "$NEXUS_IP`:$NEXUS_PORT"
            Write-Host "Ajout du registre insécurisé à la configuration existante."
        } else {
            Write-Host "Le registre insécurisé est déjà configuré."
        }
    } else {
        # Ajouter la propriété insecure-registries
        $configContent | Add-Member -Name "insecure-registries" -Value @("$NEXUS_IP`:$NEXUS_PORT") -MemberType NoteProperty
        Write-Host "Ajout de la propriété insecure-registries à la configuration."
    }
    
    # Enregistrer la configuration mise à jour
    $configContent | ConvertTo-Json | Out-File -FilePath $DOCKER_CONFIG_FILE -Encoding ascii
} else {
    # Créer un nouveau fichier de configuration
    @{
        "insecure-registries" = @("$NEXUS_IP`:$NEXUS_PORT")
    } | ConvertTo-Json | Out-File -FilePath $DOCKER_CONFIG_FILE -Encoding ascii
    Write-Host "Nouveau fichier de configuration Docker créé."
}

Write-Host "Configuration créée dans $DOCKER_CONFIG_FILE :"
Get-Content -Path $DOCKER_CONFIG_FILE

Write-Host "Redémarrage du service Docker..."
try {
    Restart-Service docker
    Write-Host "Service Docker redémarré avec succès."
} catch {
    Write-Host "Impossible de redémarrer le service Docker automatiquement. Veuillez le redémarrer manuellement."
    Write-Host "Vous pouvez le faire en exécutant la commande suivante en tant qu'administrateur: Restart-Service docker"
    Write-Host "Ou en utilisant l'interface graphique de Docker Desktop: clic droit sur l'icône Docker > Restart"
}

Write-Host "Attente du redémarrage de Docker..."
Start-Sleep -Seconds 5

Write-Host "Test de la configuration Docker :"
docker info

Write-Host "Test de connexion au registre Docker Nexus :"
try {
    Invoke-WebRequest -Uri "http://$NEXUS_IP`:$NEXUS_PORT/v2/" -Method Get -TimeoutSec 10
    Write-Host "Connexion au registre réussie."
} catch {
    Write-Host "Échec de la connexion au registre : $_"
    Write-Host "Veuillez vérifier que Nexus est bien démarré et accessible sur $NEXUS_IP:$NEXUS_PORT"
}

Write-Host "Configuration terminée."
