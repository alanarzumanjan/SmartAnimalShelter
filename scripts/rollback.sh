#!/bin/bash
set -e

# Rollback script for SmartAnimalShelter
# Usage: ./rollback.sh [backup-tag]

REPO="ghcr.io/${GITHUB_REPOSITORY:-your-org/your-repo}"
BACKEND_IMAGE="${REPO}/backend"
FRONTEND_IMAGE="${REPO}/frontend"
BACKUP_TAG="${1:-backup}"

echo "🔙 Rolling back to tag: ${BACKUP_TAG}"

cd ~/SmartAnimalShelter || exit 1

# Tag current as failed
docker tag "${BACKEND_IMAGE}:latest" "${BACKEND_IMAGE}:failed-$(date +%s)" 2>/dev/null || true
docker tag "${FRONTEND_IMAGE}:latest" "${FRONTEND_IMAGE}:failed-$(date +%s)" 2>/dev/null || true

# Pull backup images
docker pull "${BACKEND_IMAGE}:${BACKUP_TAG}" 2>/dev/null || {
  echo "❌ Backup tag ${BACKUP_TAG} not found for backend. Trying previous local image..."
}
docker pull "${FRONTEND_IMAGE}:${BACKUP_TAG}" 2>/dev/null || {
  echo "❌ Backup tag ${BACKUP_TAG} not found for frontend. Trying previous local image..."
}

# Retag backup to latest
docker tag "${BACKEND_IMAGE}:${BACKUP_TAG}" "${BACKEND_IMAGE}:latest" 2>/dev/null || true
docker tag "${FRONTEND_IMAGE}:${BACKUP_TAG}" "${FRONTEND_IMAGE}:latest" 2>/dev/null || true

# Restart services
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Health check
echo "⏳ Waiting for health check..."
for i in {1..30}; do
  if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Rollback successful! Backend is healthy."
    exit 0
  fi
  echo "   Attempt $i/30..."
  sleep 5
done

echo "❌ Rollback failed! Backend still unhealthy. Manual intervention required."
exit 1

