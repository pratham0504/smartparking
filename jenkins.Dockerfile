FROM jenkins/jenkins:lts

USER root

# Installation de Node.js et npm
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Installation de Docker
RUN apt-get update && \
    apt-get -y install apt-transport-https ca-certificates curl gnupg2 software-properties-common && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | apt-key add - && \
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable" && \
    apt-get update && \
    apt-get -y install docker-ce docker-ce-cli containerd.io

# Installation de Docker Compose avec permissions correctes
RUN curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose && \
    ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Donner les permissions nécessaires à Jenkins
RUN usermod -aG docker jenkins && \
    chown jenkins:jenkins /usr/local/bin/docker-compose

# Installation des outils nécessaires
RUN apt-get update && apt-get install -y curl docker.io



COPY --chown=jenkins:jenkins jenkins/jenkins.yaml /var/jenkins_home/jenkins.yaml

ENV CASC_JENKINS_CONFIG=/var/jenkins_home/jenkins.yaml
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

EXPOSE 8080 50000 9100

USER jenkins
