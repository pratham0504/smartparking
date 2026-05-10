pipeline {
    agent any
    
    environment {
        // Git configuration
        GIT_CREDS = credentials('Git-Jenkins')
        gitBranch = "main"
        gitRepo = "https://github.com/PiDev-2025/parkEz.git"

        // Dockerhub configuration
        DOCKERHUB_CREDENTIALS = credentials('dockerhub')
        DOCKER_USERNAME = "aymenjallouli"  
        VERSION = "1.0.${BUILD_NUMBER}"

        // SonarQube configuration
        SONAR_URL = "http://sonarqube:9000"
        SONAR_TOKEN = credentials('SonarScan')  
        SONAR_PROJECT_KEY = "AymenJallouli_parkEz"
        SONAR_PROJECT_NAME = "AymenJallouli-parkEz"

        // Nexus configuration - Mise à jour pour utiliser HTTP explicitement
        NEXUS_URL = "http://172.20.0.10:8081"
        NEXUS_DOCKER_REGISTRY = "172.20.0.10:8082"
        NEXUS_CREDENTIALS = credentials('nexus-credentials')
        NEXUS_DOCKER_REPO = "parkEz-docker"

        GIT_TOKEN = credentials('Git-Jenkins')

        // Application environment variables
        CLOUDINARY_CLOUD_NAME = credentials('cloudinary-cloud-name')
        CLOUDINARY_API_KEY = credentials('cloudinary-api-key')
        CLOUDINARY_API_SECRET = credentials('cloudinary-api-secret')
        EMAIL_USER = credentials('email-user')
        EMAIL_PASS = credentials('email-password')
        EMAIL_FROM = credentials('email-from')
        MAPBOX_TOKEN = credentials('mapbox-token')
        JWT_SECRET = credentials('jwt-secret')
        GOOGLE_CLIENT_ID = credentials('google-client-id')
        GOOGLE_CLIENT_SECRET = credentials('google-client-secret')
        VITE_MAPBOX_TOKEN = credentials('mapbox-token')
        STRIPE_SECRET_KEYy = credentials('STRIPE_SECRET_KEY')
        FLOUCI_SECRETt = credentials('FLOUCI_SECRET')
        // Enable BuildKit with better caching settings
        DOCKER_BUILDKIT = '1'
        BUILDKIT_PROGRESS = 'plain'
        COMPOSE_DOCKER_CLI_BUILD = '1'
        
        // Skip tests in development branches for faster builds
        SKIP_TESTS = "${env.BRANCH_NAME != 'main' && env.BRANCH_NAME != 'master' ? 'true' : 'false'}"
        
        NOTIFICATION_EMAIL = "aymen.jallouli@esprit.tn"
    }

    stages {
        stage('Checkout Code') {
            steps {
                script {
                    deleteDir()
                    withCredentials([usernamePassword(credentialsId: 'Git-Jenkins', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
                        sh """
                            # Configure Git
                            git config --global credential.helper store
                            echo "https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com" > ~/.git-credentials
                            chmod 600 ~/.git-credentials
                            
                            # Clone main repository without submodules first
                            git clone https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com/PiDev-2025/parkEz.git . 
                            git checkout ${gitBranch}
                            
                            # Clone each submodule manually
                            git clone https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com/PiDev-2025/Backend.git Backend

                            # Checkout main branch for each repository
                            cd Backend && git checkout main && cd ..
                        
                        """
                    }
                }
            }
        }

        stage('Test') {
            when {
                expression { return env.SKIP_TESTS != 'true' }
            }
            steps {
                dir('Backend') {
                    script {
                        sh '''
                            # Installer les dépendances
                            npm install --legacy-peer-deps 
                            
                            # Exécuter les tests avec couverture
                            npm test -- --coverage
                        '''
                    }
                }
            }
        }

        stage('SonarQube Analysis') {
            when {
                expression { return env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master' }
            }
            steps {
                script {
                    
                    
                    def scannerHome = tool 'SonarScan'
                    withSonarQubeEnv(installationName: 'SonarQube') {
                        withCredentials([string(credentialsId: 'SonarScan', variable: 'SONAR_TOKEN')]) {
                            sh """
                                echo "Running SonarQube analysis..."
                                ${scannerHome}/bin/sonar-scanner \\
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \\
                                -Dsonar.projectName=${SONAR_PROJECT_NAME} \\
                                -Dsonar.host.url=${SONAR_URL} \\
                                -Dsonar.login=$SONAR_TOKEN \\
                                -Dsonar.sources=Backend/src \\
                                -Dsonar.tests=Backend/src/tests \\
                                -Dsonar.exclusions=**/node_modules/**,**/coverage/**,**/tests/** \\
                                -Dsonar.test.inclusions=Backend/src/tests/** \\
                                -Dsonar.javascript.lcov.reportPaths=Backend/coverage/lcov.info \\
                                -Dsonar.verbose=true \\
                                -Dsonar.debug=true
                            """
                        }
                    }
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    // Enable BuildKit for faster builds
                    env.DOCKER_BUILDKIT = '1'
                    def backendDir = 'Backend'
                   
                    def backendImage = "${DOCKER_USERNAME}/parkEz-backend"
                    
                    // Login to Docker Hub once
                    withCredentials([usernamePassword(credentialsId: 'dockerhub', passwordVariable: 'DOCKERHUB_PASSWORD', usernameVariable: 'DOCKERHUB_USERNAME')]) {
                        sh """
                            echo "Logging into Docker Hub..."
                            echo "\${DOCKERHUB_PASSWORD}" | docker login -u "\${DOCKERHUB_USERNAME}" --password-stdin
                        """
                    }

                    try {
                        

                        // Stage 2: Build Final Backend Image using the Base Cache
                        echo "Building final backend image (${backendImage}:${VERSION})..."
                        timeout(time: 15, unit: 'MINUTES') { // Shorter timeout for final build
                            sh """
                                cd ${backendDir}
                                
                                # Pull latest backend image cache if available (for other layers)
                                docker pull "${backendImage}:latest" || true
                                
                                echo "Building final backend image..."
                                docker build \\
                                    --build-arg BUILDKIT_INLINE_CACHE=1 \\
                                    --cache-from "${backendImage}:latest" \\
                                    -t "${backendImage}:${VERSION}" \\
                                    -t "${backendImage}:latest" \\
                                    .
                            """
                        }
                    } finally {
                        // Logout from Docker Hub
                        sh "docker logout"
                    }
                }
            }
        }

        stage('Push Docker Images to DockerHub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'dockerhub', passwordVariable: 'DOCKERHUB_PASSWORD', usernameVariable: 'DOCKERHUB_USERNAME')]) {
                        // Login to Docker Hub
                        sh """
                            echo "\${DOCKERHUB_PASSWORD}" | docker login -u "\${DOCKERHUB_USERNAME}" --password-stdin
                        """
                        
                        try {
                            // Push only the backend image
                            sh """
                                echo "Pushing backend image..."
                                docker tag "\${DOCKER_USERNAME}/parkEz-backend:\${VERSION}" "\${DOCKER_USERNAME}/parkEz-backend:latest"
                                
                                docker push "\${DOCKER_USERNAME}/parkEz-backend:latest"
                            """
                        } finally {
                            sh "docker logout"
                        }
                    }
                }
            }
        }

        stage('Monitor Metrics') {
            steps {
                script {
                    sh '''
                        docker ps | grep prometheus
                        docker ps | grep grafana
                        
                        # Wait for services to be fully operational
                        sleep 10
                        
                        # Check Prometheus targets
                        curl -s http://prometheus:9090/api/v1/targets
                        
                        # Check Grafana health
                        curl -s http://grafana:3000/api/health
                    '''
                }
            }
        }

        stage('Run Application') {
            steps {
                script {
                    withCredentials([
                        string(credentialsId: 'jwt-secret', variable: 'JWT_SECRET'),
                        string(credentialsId: 'cloudinary-cloud-name', variable: 'CLOUDINARY_CLOUD_NAME'),
                        string(credentialsId: 'cloudinary-api-key', variable: 'CLOUDINARY_API_KEY'),
                        string(credentialsId: 'cloudinary-api-secret', variable: 'CLOUDINARY_API_SECRET'),
                        string(credentialsId: 'email-user', variable: 'EMAIL_USER'),
                        string(credentialsId: 'email-password', variable: 'EMAIL_PASS'),
                        string(credentialsId: 'email-from', variable: 'EMAIL_FROM'),
                        string(credentialsId: 'google-client-id', variable: 'GOOGLE_CLIENT_ID'),
                        string(credentialsId: 'google-client-secret', variable: 'GOOGLE_CLIENT_SECRET'),
                        string(credentialsId: 'STRIPE_SECRET_KEY', variable: 'STRIPE_SECRET_KEYy'),
                        string(credentialsId: 'FLOUCI_SECRET', variable: 'FLOUCI_SECRETt')
                    ]) {
                        sh '''
                            echo "Vérification de docker-compose..."
                            docker-compose --version || { echo "docker-compose n'est pas installé"; exit 1; }

                            echo "Création des fichiers .env..."
                            mkdir -p ./Backend

                            cat > ./Backend/.env << EOL
MONGO_URI=mongodb://mongo:27017/parkEzDB
PORT=3001
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS
EMAIL_FROM=$EMAIL_FROM
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEYy
FLOUCI_SECRET=$FLOUCI_SECRETt

EOL

                            echo "Arrêt des conteneurs spécifiques (backend, mongo)..."
                            docker-compose stop backend mongo || true
                            docker-compose rm -f backend mongo || true

                            echo "Vérification et suppression des conteneurs conflictuels..."
                            docker ps -a --filter "name=parkEz-database" --format "{{.ID}}" | xargs -r docker rm -f || true

                            echo "Création du réseau Docker..."
                            docker network inspect app-network || docker network create app-network

                            echo "Démarrage des conteneurs..."
                            docker-compose up -d --no-recreate backend  || true

                            echo "Vérification des conteneurs critiques..."
                            docker ps --filter "name=jenkins" --filter "name=sonarqube" --filter "name=prometheus" --filter "name=grafana"

                            echo "Vérification des variables d'environnement..."
                            
                            # Define default values for missing variables
                            : "${vlP8yRQ0dcInDmuR6MksQu6LIboJYtA8UOoqbrX:=default_value}"

                            # Validate critical environment variables
                            if [ -z "$vlP8yRQ0dcInDmuR6MksQu6LIboJYtA8UOoqbrX" ]; then
                                echo "Error: The 'vlP8yRQ0dcInDmuR6MksQu6LIboJYtA8UOoqbrX' variable is not set and has no default value."
                                exit 1
                            fi

                            echo "All required environment variables are set."

                            echo "Attente de 20 secondes pour l'initialisation..."
                            sleep 20

                            echo "Vérification de l'état des conteneurs..."
                            docker-compose ps

                            echo "Affichage des logs des conteneurs..."
                            docker-compose logs
                        '''
                    }
                }
            }
        }

        stage('Git Push') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'Git-Jenkins', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
                        sh """
                            # Configure Git
                            git config --global user.email "jenkins@example.com"
                            git config --global user.name "Jenkins CI"
                            
                            # Check for changes
                            if git status -s | grep -q .; then
                                echo "Changes detected, committing and pushing..."
                                
                                # Add changes
                                git add .
                                
                                # Commit with build information
                                git commit -m "Jenkins Build #${BUILD_NUMBER}: Auto-commit after successful build" || echo "Nothing to commit"
                                
                                # Push changes
                                git push https://\${GIT_USERNAME}:\${GIT_PASSWORD}@github.com/PiDev-2025/parkEz.git main
                                echo "Successfully pushed changes to repository"
                            else
                                echo "No changes detected, skipping git push"
                            fi
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            script {
                dir('Backend') {
                    sh """
                        echo "Sending success notification email..."
                        npm install
                        
                        # Create a simple success message script
                        cat > success-message.js << 'EOF'
const sendEmail = require('./src/utils/sendEmail.js');

sendEmail({
    email: "aymen.jallouli@esprit.tn",
    subject: "✅ Jenkins Build #${BUILD_NUMBER} Successful",
    message: "The Jenkins pipeline build #${BUILD_NUMBER} has completed successfully.\\n\\n" +
                            "Build Version: ${VERSION}\\n" +
                            "Branch: ${gitBranch}\\n" +
                            "Repository: ${gitRepo}\\n\\n" +
                            "All stages completed successfully.\\n\\n" +
                            "Best regards,\\nJenkins CI/CD Pipeline"
}).catch(err => console.error("Failed to send email:", err));
EOF

                        # Run the script
                        node success-message.js
                    """
                }
                
                echo "Pipeline exécuté avec succès ! Les images Docker ont été construites et déployées."
            }
        }
        
        failure {
            script {
                // Use a simplified email for error notifications to avoid formatting issues
                dir('Backend') {
                    sh """
                        echo "Sending failure notification email..."
                        npm install
                        
                        # Create a simple message 
                        cat > message.js << 'EOF'
const sendEmail = require("./src/utils/sendEmail.js");

sendEmail({
    email: "aymen.jallouli@esprit.tn",
    subject: "❌ Jenkins Build #${BUILD_NUMBER} Failed",
    message: "The Jenkins pipeline build #${BUILD_NUMBER} has failed.\\n\\n" +
                            "Build Version: ${VERSION}\\n" +
                            "Branch: ${gitBranch}\\n" +
                            "Repository: ${gitRepo}\\n\\n" +
                            "Please check the Jenkins logs for details.\\n\\n" +
                            "Best regards,\\nJenkins CI/CD Pipeline"
}).catch(err => console.error("Failed to send email:", err));
EOF

                        # Run the script
                        node message.js
                    """
                }
                
                echo "Le pipeline a échoué ! Vérifiez les logs Jenkins pour plus de détails."
            }
        }
        
        /*always {
            sh """
                echo "Performing post-build cleanup..."
                docker system prune -f || true
                echo "Cleanup complete"
            """
        }*/
    }
}