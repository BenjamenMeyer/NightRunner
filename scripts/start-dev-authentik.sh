#!/usr/bin/env bash
set -e

# script/start-dev-authentik.sh
#
# Helper script to launch NightRunner local development with Authentik OIDC provider.

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo " Starting NightRunner Dev Environment with Authentik OIDC"
echo "=========================================================="

# Check container CLI preference: podman compose / podman-compose -> docker compose / docker-compose
if command -v podman &>/dev/null && podman compose version &>/dev/null; then
  DOCKER_COMPOSE_CMD="podman compose"
elif command -v podman-compose &>/dev/null; then
  DOCKER_COMPOSE_CMD="podman-compose"
elif command -v docker &>/dev/null && docker compose version &>/dev/null; then
  DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE_CMD="docker-compose"
else
  echo "Error: Neither podman nor docker compose commands were found."
  exit 1
fi

echo "Using: $DOCKER_COMPOSE_CMD"

echo "Launching docker containers..."
$DOCKER_COMPOSE_CMD -f docker-compose.yaml -f docker-compose.authentik.yaml up -d --build

echo ""
echo "Waiting for services to become ready..."
echo " - Postgres DB..."
until $DOCKER_COMPOSE_CMD exec -T db pg_isready -U nightrunner -d nightrunner &>/dev/null; do
  sleep 2
done

echo " - Authentik Server..."
until curl -sf http://localhost:9000/-/health/live/ &>/dev/null || curl -sf http://localhost:9000/application/o/nightrunner/ &>/dev/null; do
  sleep 3
done

echo ""
echo "=========================================================="
echo " NightRunner local dev environment is READY!"
echo "=========================================================="
echo " - Frontend:   http://localhost:3000"
echo " - Backend:    http://localhost:8000/v1"
echo " - Authentik:  http://localhost:9000"
echo ""
echo " Authentik Default Credentials:"
echo "   User:       adminuser"
echo "   Password:   password"
echo "=========================================================="
