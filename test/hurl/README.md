# Suite Hurl (COU-325)

Requests declarados en archivos de texto, ejecutados a mano contra una **API levantada por HTTP
real**. Cubren lo que el e2e de Jest no puede ver (`src/main.ts`: CORS, `helmet`, `compression`,
`/docs-json`, el `ValidationPipe` custom) y los flujos que necesitan estado y datos sembrados.

**No corre en CI**: el workflow valida con Jest (unit + e2e). Esta suite es una herramienta manual.

## Cómo se usa (desde el editor)

1. **Las variables se levantan solas**: la extensión busca `hurl.vars` en la carpeta del notebook
   (`test/hurl/hurl.vars`) y lo pasa como `--variables-file`. No hay que configurar nada; si un
   archivo necesita pisar un valor, se crea `<archivo>.hurl.vars` al lado (por ejemplo
   `05-lockout-and-403.hurl.vars`).
2. **Tener la API levantada** (ver abajo) y Mailpit.
3. **Correr el archivo completo**: `Run All`. Las capturas (`{{token}}`, `{{code}}`,
   `{{confirmToken}}`) sólo existen dentro de una corrida, así que ejecutar una celda suelta falla
   con *"variable has not been set"*.

## Requisitos

- `hurl` 8.x si vas a usar la CLI (la extensión trae el suyo). En esta máquina:
  `~/.local/bin/hurl` (8.0.1).
- MongoDB en replica set y Redis (los de `make up` sirven).
- **Mailpit**, el buzón de la suite — obligatorio para el flujo de cambio de email:
  ```bash
  docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
  ```
- Usuarios de prueba: los crea `npx ts-node test/hurl/fixtures/seed-hurl.ts` sobre la base que
  apuntes. Ya están creados en `api_user_hurl` si corriste la suite antes.

## Levantar la API para la suite

La app tiene que correr con **su propia base** y con el correo apuntando a Mailpit, para no tocar la
base de desarrollo ni mandar correos reales. Desde la raíz del repo:

```bash
set -a; . ./.env.hurl; set +a
JEST_WORKER_ID=1 node dist/main.js
```

`.env.hurl` es el entorno **de la API** (`DATABASE_HOST=127.0.0.1`, `DATABASE_NAME=api_user_hurl`,
`EMAIL_HOST=127.0.0.1`, `EMAIL_PORT=1025`, `PORT=3100`). Es local y está gitignoreado. No
confundirlo con `test/hurl/hurl.vars`, que es el de Hurl. `JEST_WORKER_ID=1` es el mecanismo que el repo ya usa para conectar desde el host:
activa `ignoreEnvFile` (manda el entorno exportado) y `directConnection=true` en Mongo.

Si preferís usar el contenedor de `make up` (`:3000`), ojo: ese usa la base de desarrollo y manda
correos reales por Gmail, así que el flujo 04 no puede leer el código.

## Archivos

**Un archivo por controller**, con todos sus endpoints adentro. La matriz completa
(endpoint → archivo → código esperado → acceso) está en [`ENDPOINTS.md`](./ENDPOINTS.md).

| Archivo | Controller | Endpoints |
|---|---|---|
| `app.hurl` | `app.controller.ts` | `/`, `/health`, `/message-microservice/:pattern` |
| `auth.hurl` | `auth.controller.ts` | 12: register, verify, resend, login, refresh, forgot/reset, me, logout, logout-all, confirm/revert email |
| `user-profile.hurl` | `user-profile.controller.ts` | 5: profile get/patch, change-password, change-email/code y change-email |
| `user.hurl` | `user.controller.ts` (`/admin/users`) | 7: list, create, get, update, toggle, unlock, delete |
| `role.hurl` | `role.controller.ts` | 5: list, create, patch, put permissions, delete |
| `permission.hurl` | `permission.controller.ts` | `GET /permissions` |
| `email.hurl` | `email.controller.ts` | `send`, `send-direct` |
| `email-template.hurl` | `email-template.controller.ts` | 5: list, create, get, patch, delete |
| `audit.hurl` | `audit.controller.ts` | `GET /admin/audit-logs` |
| `parameter-admin.hurl` | `parameter-admin.controller.ts` | 3: list, por grupo, put |
| `i18n-admin.hurl` | `i18n-admin.controller.ts` | `POST /admin/i18n/reload` |
| `fixtures/seed-hurl.ts` | — | usuarios de prueba (`hurl.flow`, `hurl.locked`, `hurl.viewer`, `hurl.admin`) |

Cada archivo hace su propio login y **restaura lo que toca**: crea un rol/plantilla/usuario temporal y
lo borra; el `PUT /admin/parameters/:key` se ejerce con el valor que ya tiene. Si un archivo falla a
mitad deja residuos: limpiá los `hurl-*` antes de volver a correr.

## Variables

| Variable | Valor local | Para qué |
|---|---|---|
Las variables viven en `hurl.vars`, al lado de los `.hurl`:

| `baseUrl` | `http://127.0.0.1:3100` | base de la API |
| `mailpitUrl` | `http://127.0.0.1:8025` | API HTTP de Mailpit |
| `adminEmail` / `adminPassword` | `admin@test.com` / `XyzAdmin1@` | admin de los seeds |
| `flowEmail` / `flowPassword` | `hurl.flow@test.com` / `HurlFlow1@` | sujeto del cambio de email |
| `newEmail` | `hurl.flow.new@test.com` | dirección nueva (no debe existir como usuario) |
| `lockedEmail` | `hurl.locked@test.com` | cuenta bloqueada |
| `viewerEmail` | `hurl.viewer@test.com` | usuario sin rol admin |

## Notas que costaron encontrar

- **`--variables-file` es cli-only** en Hurl: no se puede declarar dentro de un `.hurl`, y las
  variables **no se comparten entre archivos**. Lo único intra-archivo es `[Options] variable:`, que
  persiste para los entries siguientes y **gana sobre `--variable` de la CLI** (por eso no se usan
  valores locales dentro de los archivos del repo).
- **`regex` en `[Captures]` devuelve el grupo de captura**, no el match completo: sin paréntesis da
  `No query result`. De ahí `regex /token=([0-9a-f-]{36})/`.
- **El envío de email es asíncrono**: las lecturas del buzón usan `[Options] retry: 10` +
  `retry-interval: 500ms`, y entre el código y el cambio se vacía el buzón
  (`DELETE /api/v1/messages`) para no leer el mensaje anterior.
- **En este WSL `hurl` se cuelga contra un puerto cerrado** (`curl` también). Si la API no está
  arriba, no esperes un error rápido: levantala antes de correr.
