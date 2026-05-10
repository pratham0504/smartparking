#!/bin/bash

# This script builds and pushes the Python base image
# It should be run whenever dependencies change or periodically (e.g., weekly)

set -e

DOCKER_USERNAME=${DOCKER_USERNAME:-aymenjallouli}
TAG=$(date +%Y%m%d)

echo "Building Python base image..."
docker build -t "${DOCKER_USERNAME}/parkEz-python-base:${TAG}" -t "${DOCKER_USERNAME}/parkEz-python-base:latest" -f base-image.Dockerfile .

echo "Logging in to Docker Hub..."
docker login -u "${DOCKER_USERNAME}"

echo "Pushing Python base image..."
docker push "${DOCKER_USERNAME}/parkEz-python-base:${TAG}"
docker push "${DOCKER_USERNAME}/parkEz-python-base:latest"

echo "Base image built and pushed successfully."
