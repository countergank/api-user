#!/usr/bin/env bash
# docker-redeploy.sh — Tear down and redeploy Docker services for a given environment.
# Usage: bash scripts/docker-redeploy.sh [environment]
#   environment: local | development | production (default: local)

set -euo pipefail

# ---------------------------------------------------------------------------
# Resolve environment
# ---------------------------------------------------------------------------
if [ -z "${1:-}" ]; then
    NODE_ENV="local"
else
    NODE_ENV="$1"
fi

ENV_FILE=".env.${NODE_ENV}"

# ---------------------------------------------------------------------------
# Validate env file exists
# ---------------------------------------------------------------------------
if [ ! -f "${ENV_FILE}" ]; then
    echo "Error: ${ENV_FILE} not found."
    echo "Create it before deploying, e.g.: cp .env.example ${ENV_FILE}"
    exit 1
fi

echo "Deploying environment: ${NODE_ENV} (using ${ENV_FILE})"

# ---------------------------------------------------------------------------
# Detect Docker Compose version
# ---------------------------------------------------------------------------
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    echo "Warning: docker-compose (v1) detected. Consider upgrading to Docker Compose v2."
    COMPOSE_CMD="docker-compose"
else
    echo "Error: Docker Compose is not installed."
    echo "Install Docker Compose v2: https://docs.docker.com/compose/install/"
    exit 1
fi

# ---------------------------------------------------------------------------
# Redeploy
# ---------------------------------------------------------------------------
# -d   run in detached mode
# -V   force recreate volumes (picks up schema/init changes)
# --build rebuild images before starting
${COMPOSE_CMD} --env-file "${ENV_FILE}" down
${COMPOSE_CMD} --env-file "${ENV_FILE}" up -d -V --build

echo "Redeployment complete for environment: ${NODE_ENV}"
