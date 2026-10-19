# COU-312 — Parametrizar el origen de las variables de entorno en `make up`

- **Feature**: `cou-312-parametrizar-entorno`
- **Issue**: https://linear.app/countergank/issue/COU-312/parametrizar-el-origen-de-las-variables-de-entorno-en-make-up
- **Base**: `origin/develop` @ `9482e80` — **Rama**: `chore/COU-312-parametrizar-entorno`
- **Estado**: IMPLEMENTADO Y PROBADO — **sin commitear** por regla explícita del usuario.

## Specs

Criterios de aceptación del ticket, ya corregidos con lo aprendido al probar.

- **S1** — `make up` con Doppler disponible y con los secretos de la app en el config mapeado usa
  los valores de Doppler, y el log dice `env ← Doppler (project api-users, config dev)`.
- **S2** — `make up` sin Doppler (ausente, sin auth, o config sin secretos) usa `.env.development` y
  el log lo dice.
- **S3** — `make up ENV=staging` usa el config `stg`; `ENV=prod` usa `prd`. `NODE_ENV` del
  contenedor sigue siendo `development|staging|production`.
- **S4** — `ENV_FILE` acepta **cualquier ruta absoluta o relativa**, con cualquier nombre, y tiene
  prioridad sobre Doppler y sobre `.env.<env>`. Es la salida para quien levanta el stack con su
  propio archivo, sin depender de las convenciones de este repo.
- **S5** — Sin ninguna fuente, el mensaje lo dice explícitamente y sugiere `ENV_FILE=`.
- **S6** — `docker compose config` muestra el `env_file` resuelto a la ruta elegida.
- **S7** — `curl localhost:3000/health` responde `200` con `database: up` y `redis: up` en los tres
  caminos.
- **S8** — El render de Doppler no queda en el árbol ni se versiona: va a un directorio temporal con
  prefijo propio y se borra en un `trap EXIT`, incluso si compose falla.
- **S9** — **Corregido tras la prueba D**: el script **no** valida variables críticas. El contenido
  lo valida la aplicación al arrancar (`src/config/env.validation.ts`). En **dev** el repo está
  bind-mounteado en `/usr/src/app`, así que la app además carga `.env.<NODE_ENV>` del disco y
  **completa** las claves que falten: un `env_file` incompleto arranca igual. En **prod**
  `ignoreEnvFile` es `true` y la app falla con su propio mensaje.

## Diseño

- **`docker-compose.yml`**: `env_file: ${ENV_FILE:-.env.development}` en el servicio `api-user`. Lo
  probé aislado: compose interpola la ruta y sus variables salen como `environment` del contenedor.
- **`scripts/resolve-env.sh`** (82 líneas): resuelve la fuente en un solo lugar y loguea cuál usó.
  Orden: `ENV_FILE` explícito → Doppler (sondea `JWT_SECRET` para distinguir un config con secretos
  de uno con sólo metadatos) → `.env.<env>` → error. Mapeo `development→dev`, `staging→stg`,
  `prod→prd`, sobreescribible con `DOPPLER_CONFIG_<env>`.
- **`Makefile`**: `up` usa el script y le pasa `ENV_FILE`; `down` y `logs` dejan de duplicar el
  bloque de Doppler, que no necesitan y sólo confundía.
- **Sin cambios de código de la app**: `dotenv` sólo pisa `process.env` con `override: true` y
  `@nestjs/config` no lo usa, así que por clave gana el env del contenedor y el archivo montado sólo
  completa lo faltante.

## Verificación (observacional, sin harness)

No hay tests automatizados para el Makefile ni para compose: la evidencia es el protocolo que
ejecuté, usando `THROTTLE_LIMIT` como valor distinguible (Doppler y `.env` tienen `10`).

| Camino | Comando | Log | Valor en el contenedor | Health |
|---|---|---|---|---|
| A — archivo propio | `ENV_FILE=/tmp/probe.env make up` (con `THROTTLE_LIMIT=99`) | `env ← archivo explícito` | **99** | 200 |
| B — Doppler | `make up` | `env ← Doppler (project api-users, config dev)` | **10** | 200 |
| C — fallback | `DOPPLER_CONFIG_development=nope make up` | `env ← archivo local .env.development` | **10** | 200 |
| D — env incompleto | `ENV_FILE=/tmp/incomplete.env make up` | `env ← archivo explícito` | arranca igual (ver S9) | 200 |

Los tres caminos dejan **cero residuo** en `/tmp`.

## Bugs propios encontrados al probar

- **La limpieza intentaba borrar `/tmp`**: con `ENV_FILE` explícito, `dirname` era `/tmp` y el
  `rm -rf` apuntaba ahí (falló por permisos, pero era inaceptable). Ahora sólo borra directorios con
  prefijo `api-user-env.*`, y corre en `trap EXIT` para limpiar también cuando compose falla.
- **`mktemp` moría con `TMPDIR` roto**: esta sesión tiene `TMPDIR` apuntando a un directorio que ya
  no existe. El script ahora cae a `/tmp`. Ese mismo `TMPDIR` rompe el build de Docker
  (`invalid output path`), así que acá hay que correr `TMPDIR=/tmp make up`.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | `env_file` parametrizado en compose | S4, S6 | inline (parent) | pendiente de autorización |
| T2 | `scripts/resolve-env.sh` con resolución y log de fuente | S1–S5 | inline (parent) | pendiente de autorización |
| T3 | `Makefile`: `up` con el script, `down`/`logs` sin Doppler | S1–S3, S8 | inline (parent) | pendiente de autorización |
| T4 | Protocolo de verificación A/B/C/D | S7, S9 | inline (parent) | — |

## Entrega

- Estrategia prevista: **single-pr** contra `develop`, con `fixes COU-312`.
- Rebanada real: ~90 líneas (script 82 + 2 líneas de compose + 4 de Makefile).
- **Regla del usuario**: no se commitea nada sin autorización explícita. El diff queda en el árbol.

## Log

- **L1** (usuario, verbatim): “quiero saber si make up levanta las variables de doppler y cuales usa,
  que entorno? local dev o cual”.
- **L2** (usuario, verbatim): “no commitees nada sin mi autorizacion explicita” (aplica a COU-312).
- **L3** (usuario, verbatim): “sacaria la validacion del script si”.
- **L4** (usuario, verbatim): “lo que no quiero es dejar fijo que env usar, esto es opensource”.
- **Corrección 1**: una medición con `doppler secrets --only-names` reportó 3 secretos por config y
  llevó a concluir que Doppler estaba vacío. El conteo real en `dev` es **40**, con `JWT_SECRET`.
  El ticket y este documento quedaron corregidos; el error fue de parseo del output.
- **Corrección 2**: la validación de 4 claves salió del script (S9) porque duplicaba
  `env.validation.ts` y podía rechazar configuraciones legítimas ajenas — que es justo lo contrario
  de lo que pide un repo open source.
- **Corrección 3**: el AC original prometía que un entorno incompleto impide arrancar el contenedor.
  La prueba D mostró que en dev no es así por el bind-mount. Separado en S9.
