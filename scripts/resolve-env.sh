#!/usr/bin/env bash
# COU-312 — resuelve de dónde salen las variables de entorno del contenedor.
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
#      levanta el stack con su propio archivo, sin Doppler y sin .env.
#   2. Doppler, si el binario está y el config mapeado responde con los secretos
#      de la app (se sondea JWT_SECRET). Se renderiza a un directorio temporal.
#   3. El archivo .env.<env> local.
#   4. Nada: error explícito.
#
# El contenido lo valida la aplicación al arrancar (src/config/env.validation.ts),
# no este script: así no se rechaza una configuración legítima distinta a la de
# este repo. Si el entorno está incompleto, el contenedor no levanta y la app
# dice qué variable falta.

set -euo pipefail

ENV_NAME="${1:-development}"

# Mapeo env del repo → config de Doppler. NODE_ENV no cambia: la app valida
# development|staging|production.
case "$ENV_NAME" in
  development) DEFAULT_DOPPLER_CONFIG="dev" ;;
  staging)     DEFAULT_DOPPLER_CONFIG="stg" ;;
  prod)        DEFAULT_DOPPLER_CONFIG="prd" ;;
  *)           DEFAULT_DOPPLER_CONFIG="$ENV_NAME" ;;
esac

DOPPLER_CONFIG_VAR="DOPPLER_CONFIG_${ENV_NAME}"
DOPPLER_CONFIG="${!DOPPLER_CONFIG_VAR:-$DEFAULT_DOPPLER_CONFIG}"

log() { printf '[env] %s\n' "$*" >&2; }

# 1. Override explícito: cualquier archivo, cualquier fuente.
if [ -n "${ENV_FILE:-}" ]; then
  [ -f "$ENV_FILE" ] || { log "ERROR: ENV_FILE=$ENV_FILE no existe"; exit 1; }
  log "env ← archivo explícito $ENV_FILE"
  printf '%s\n' "$ENV_FILE"
  exit 0
fi

# 2. Doppler
if command -v doppler >/dev/null 2>&1; then
  if doppler secrets get JWT_SECRET -c "$DOPPLER_CONFIG" --plain >/dev/null 2>&1; then
    tmp_base="${TMPDIR:-/tmp}"
    [ -d "$tmp_base" ] || tmp_base=/tmp
    rendered="$(mktemp -d "$tmp_base/api-user-env.XXXXXX")/env"
    if doppler secrets download --no-file --format=env -c "$DOPPLER_CONFIG" >"$rendered" 2>/dev/null; then
      chmod 600 "$rendered"
      project="$(doppler configure get project --plain 2>/dev/null || echo '?')"
      log "env ← Doppler (project $project, config $DOPPLER_CONFIG)"
      printf '%s\n' "$rendered"
      exit 0
    fi
    log "WARN: Doppler respondió pero la descarga del config $DOPPLER_CONFIG falló"
  else
    log "INFO: Doppler disponible pero el config $DOPPLER_CONFIG no tiene los secretos de la app; se usa el archivo local"
  fi
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
log "  - Doppler config '$DOPPLER_CONFIG' sin secretos (o doppler no instalado)"
log "  - y no existe $local_file"
log "  Pasá uno propio con: make up ENV_FILE=/ruta/a/tu.env"
exit 1
