#!/usr/bin/env bash
# 531 — resuelve de dónde salen las variables de entorno del contenedor.
#
# Uso: scripts/resolve-env.sh <env>
#
# Imprime en stdout la ruta del archivo elegido y explica por stderr qué fuente
# usó. El Makefile se lo pasa a compose como ENV_FILE y compose lo consume como
# `env_file` del servicio api-user: eso es lo que realmente inyecta variables en
# el contenedor.
#
# Orden de resolución — la primera que exista gana:
#   1. ENV_FILE: cualquier ruta, con cualquier nombre. Es la salida para quien
#      levanta el stack con su propio archivo, sin Infisical y sin .env.
#   2. Infisical, si el binario está y el entorno mapeado renderiza los secretos
#      de la app (el archivo debe contener JWT_SECRET). Se renderiza a un
#      directorio temporal con permisos 600.
#   3. El archivo .env.<env> local.
#   4. Nada: error explícito.
#
# El proyecto y la organización salen de .infisical.yaml (o del login de la
# CLI); este script solo elige el entorno. En un servidor sin login
# interactivo, la machine identity entra por el entorno: INFISICAL_TOKEN
# (access token de machine identity) y INFISICAL_PROJECT_ID — con token la CLI
# ignora .infisical.yaml para `secrets export`, así que el projectId es
# obligatorio y este script lo pasa cuando está definido. El contenido lo
# valida la aplicación al arrancar (src/config/env.validation.ts), no este
# script: así no se rechaza una configuración legítima distinta a la de este
# repo. Si el entorno está incompleto, el contenedor no levanta y la app dice
# qué variable falta.

set -euo pipefail

ENV_NAME="${1:-development}"

# Mapeo env del repo → slug de entorno en Infisical (development→dev; staging y
# prod ya coinciden con su slug). NODE_ENV no cambia: la app valida
# development|staging|production.
case "$ENV_NAME" in
  development) DEFAULT_INFISICAL_ENV="dev" ;;
  *)           DEFAULT_INFISICAL_ENV="$ENV_NAME" ;;
esac

INFISICAL_ENV_VAR="INFISICAL_ENV_${ENV_NAME}"
INFISICAL_ENV="${!INFISICAL_ENV_VAR:-$DEFAULT_INFISICAL_ENV}"

log() { printf '[env] %s\n' "$*" >&2; }

# 1. Override explícito: cualquier archivo, cualquier fuente.
if [ -n "${ENV_FILE:-}" ]; then
  [ -f "$ENV_FILE" ] || { log "ERROR: ENV_FILE=$ENV_FILE no existe"; exit 1; }
  log "env ← archivo explícito $ENV_FILE"
  printf '%s\n' "$ENV_FILE"
  exit 0
fi

# 2. Infisical
if command -v infisical >/dev/null 2>&1; then
  project_args=()
  [ -n "${INFISICAL_PROJECT_ID:-}" ] && project_args=(--projectId "$INFISICAL_PROJECT_ID")
  tmp_base="${TMPDIR:-/tmp}"
  [ -d "$tmp_base" ] || tmp_base=/tmp
  rendered="$(mktemp -d "$tmp_base/api-user-env.XXXXXX")/env"
  if infisical secrets-manager secrets export --silent --env="$INFISICAL_ENV" "${project_args[@]}" >"$rendered" 2>/dev/null; then
    if grep -q '^JWT_SECRET=' "$rendered"; then
      chmod 600 "$rendered"
      log "env ← Infisical (env $INFISICAL_ENV)"
      printf '%s\n' "$rendered"
      exit 0
    fi
    log "INFO: Infisical respondió pero el entorno $INFISICAL_ENV no tiene los secretos de la app; se usa el archivo local"
  else
    log "INFO: Infisical disponible pero falló el export del entorno $INFISICAL_ENV (¿sin login?); se usa el archivo local"
  fi
  rm -rf "${rendered%/*}"
fi

# 3. Archivo local
local_file=".env.${ENV_NAME}"
if [ -f "$local_file" ]; then
  log "env ← archivo local $local_file"
  printf '%s\n' "$local_file"
  exit 0
fi

# 4. Sin fuente
log "ERROR: no hay fuente de entorno para '$ENV_NAME'."
log "  - Entorno Infisical '$INFISICAL_ENV' sin secretos (o CLI sin login / no instalada)"
log "  - y no existe $local_file"
log "  Pasá uno propio con: make up ENV_FILE=/ruta/a/tu.env"
exit 1
