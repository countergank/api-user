# COU-325 — Añadir una suite Hurl para los flujos contra el servidor levantado

- **Feature**: `cou-325-suite-hurl`
- **Issue**: https://linear.app/countergank/issue/COU-325/anadir-una-suite-hurl-para-los-flujos-contra-el-servidor-levantado
- **Base**: `origin/develop` @ `302e6ad` — **Rama**: `feature/cou-325-anadir-una-suite-hurl-para-los-flujos-contra-el-servidor`
- **Estado**: **VERDE EN LOCAL** (2026-10-23) — 5/5 archivos, 28 requests, exit 0 contra el
  stack de `make up` (Mongo replica set + Redis + Mailpit), con la app local en `:3100` y base
  `api_user_hurl`. **Sin commitear** (el usuario quiere testearlo él). Falta el estreno en CI.

## Specs

- **S1** (usuario, verbatim) — “quiero testear de manera manual o automatizada con alguna herramienta o
  script, todas las características de la API, sus endpoints mas que nada”.
- **S2** (usuario, verbatim) — “ok perfecto! vamos con lo de hurl entonces, armemos un ticket para
  esto si es que ya no tenemos uno y usamos kickoff para llevarlo”.
- **S3** — Un comando corre la suite completa contra el stack levantado y devuelve código de salida
  utilizable en CI.
- **S4** — Cada flujo afirma status **y** los campos clave de la respuesta, no sólo el código.
- **S5** — El flujo de cambio de email llega al 200 real, obteniendo el código de 6 dígitos sin leerlo
  de la respuesta HTTP.
- **S6** — El lockout se prueba con una cuenta efectivamente bloqueada (`423 UA-AUTH-003`) y deja de
  depender de `MAX_LOGIN_ATTEMPTS`, que en CI vale 100.
- **S7** — **Descartado por el usuario**: la suite **no** corre en CI. El workflow valida con Jest
  (unit + e2e) y la suite Hurl es una herramienta manual. Se asume el riesgo: si nadie la ejecuta se
  desactualiza sin avisar.
- **S8** — Un flujo que se rompe a propósito hace fallar la suite (verificado al menos una vez).
- **S9** — Está documentado cómo correrla localmente y qué env necesita.
- **S10** — No duplica casos ya cubiertos por los 22 e2e de Jest (el e2e in-process no ejecuta el
  bootstrap; Hurl cubre justo eso y los flujos con estado).

## Diseño

- **Qué cubre Hurl y qué no**: el arnés de Jest arma el `AppModule` con su propio `ValidationPipe` y
  `listen(0)` (`test/helpers/create-test-app.ts`), así que nunca ejecuta `src/main.ts`: no ve CORS,
  `helmet`, `compression`, `/docs-json` ni el contrato de error del pipe custom. Hurl pega por HTTP
  al proceso real, así que cubre esa capa y los flujos con estado. La lógica con datos sigue en Jest.
- **Lección de COU-223**: el repo ya había eliminado `httpyac` (herramienta de requests en archivos)
  al unificar en Jest + supertest. El riesgo de repetir esa historia es real y está asumido: la suite
  queda **manual**, no duplica los 22 e2e y cubre justo lo que el arnés in-process no ve.
- **Estructura (decisión final del usuario)**: **un archivo por controller**, con todos sus endpoints
  adentro y el mismo nombre del controller (`auth.hurl`, `user.hurl`, `role.hurl`, …). Dentro del
  archivo el `[Captures]` del login vale para todos sus entries. Cada archivo restaura lo que toca
  (crea-y-borra roles/templates/usuarios; el `PUT` de parámetros usa el valor vigente). La matriz
  endpoint → archivo está en `test/hurl/ENDPOINTS.md`. Los archivos por endpoint y los 5 de flujo
  anteriores se eliminaron.
- **Ejecución manual desde el editor**: se carga `.env.hurl.vars` con *Select Environment File* (o
  `--variables-file`), se levanta la API con su propio entorno y se corre cada archivo completo. No
  hay script orquestador: `test/hurl/run.sh` se escribió y **se borró** al pasar la suite a manual
  (L12).
- **Seeds**: los scripts `seed:*` de `package.json` pasan por `docker compose exec`, así que **no
  sirven en CI**. El runner los invoca directo con `npx ts-node src/database/seeds/<x>.ts` y el env
  del caller. Usuarios sembrados: `admin@test.com / XyzAdmin1@` (admin).
- **Sin CI**: el job `hurl` que se había armado en `.github/workflows/test.yml` se retiró (el archivo
  volvió al estado de `develop`). La suite es manual y no tiene script orquestador.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | README de uso manual (edición desde el editor) | S9 | inline (parent) | — |
| T2 | Slice 1: health, `/docs-json`, contrato del pipe (`UA-COM-005`), login + lectura de admin | S3, S4, S10 | inline (parent) | — |
| T3 | Job `hurl` en CI con hurl pinneado y sha256 | S3, S7 | inline (parent) | — |
| T4 | Slice 2: cambio de email completo con código de 6 dígitos (Mailpit) | S5 | inline (parent) | — |
| T5 | Slice 3: lockout `423` con cuenta bloqueada + 403 por permisos | S6 | inline (parent) | — |
| T6 | Verificar que un flujo roto hace fallar la suite | S8 | inline (parent) | — |

## Log

- **L1** (usuario, verbatim): “revisemos los tickets actuales disponibles a ver con que podemos
  seguir sino iria por una etapa de test completo e2e de toda la api pero pegandole al servidor
  levantado usando alguna herramienta para definir las request en codigo directamente, pero hay que
  analizarlo bien antes de mandarse, sino es armar coleccion de postman y hacer todo manual”.
- **L2** (usuario, selección en UI): “Sólo analizar, sin crear tickets todavía”.
- **L3** (usuario, verbatim): “es que la verdad no le veo tanta utilidad a lo de /docs-json y la razon
  es porque los mocks que ya tiene la api, no son reales, y la idea es probar con datos seedeados,
  ademas probar todos los casos que son muy dificiles de testear, debido a que se necesitan otros
  datos que no se acceden directamente, ejemplo para cambiar un email o para o algun caso asi”.
  Se descarta el barrido automático desde `/docs-json` como estrategia principal.
- **L4** (usuario, verbatim): “ok perfecto! vamos con lo de hurl entonces, armemos un ticket para esto
  si es que ya no tenemos uno y usamos kickoff para llevarlo”.
- **Análisis previo (observado)**: 45 endpoints en 11 controllers; 42 con referencia textual en algún
  e2e; sin referencia `PUT /roles/:id/permissions`, `GET /` y `POST /message-microservice/:message-pattern`.
  Cobertura unit: 79.56% stmts / 65.95% branch / **65.14% funcs** / 79.41% lines; los huecos están en
  adaptadores (`config/redis` 10.8%, `email/repository` 26-38%, `common/i18n` 34%, `auth/strategies` 43%).
- **Historia del repo**: COU-223 eliminó `httpyac` al unificar en Jest + supertest. De ahí las dos
  condiciones de diseño (job propio en CI, sin duplicar el e2e).
- **Entorno**: sin Docker/Mongo/Redis ni `hurl` en este WSL. El slice 1 se escribe y se valida en CI,
  igual que el e2e de COU-261.
- **L13** (usuario, verbatim): “todos los archivos de hurl, que tengan el mismo nombre de los
  controladores y dentro de ellos todos sus respectivos endpoints encaralo con ODD el resto de hurls
  que sobren se eliminan”. Se cancela la generación por endpoint, se consolida a 11 archivos (uno por
  controller) y se borran los 27 por-endpoint y los 5 de flujo.
- **Corrida completa (observado)**: 45 endpoints / 11 archivos, **11/11 OK** contra `:3100`
  (`api_user_hurl`). Comportamientos documentados en `ENDPOINTS.md`: envelope en `GET /admin/users`
  aun sin `page`, borrado lógico (200 + `isActive:false`), permisos por nombre en `PUT
  /roles/:id/permissions`, `409 UA-PAR-002` al tocar un parámetro overrideado, `400 UA-USR-003` en
  change-password con contraseña incorrecta, `404` del microservicio apagado, y la política de
  contraseñas que rechaza dobles letras y secuencias comunes.
- **L12** (usuario, verbatim): “ok porque hay dos env.hurl? hace falta dos? po otro lado, es necesario el
  run.sh?”. Se aclara que `.env.hurl.vars` es de Hurl y `.env.hurl` es el entorno de la API, y se
  **borra `run.sh`**: sin CI y con ejecución desde el editor es código muerto.
- **L11** (usuario, verbatim): “Lo que busco no es que se ejecuten en CI busco ejecutarlos manual nada
  mas, no necesito correrlos en un workflow, con que pasen los e2e en el workflow ya esta”. Se retira
  el job `hurl` del workflow y S7 se descarta; la suite queda como herramienta manual.
- **L10** (usuario, verbatim): “cerramos por hoy, mañana seguimos”. Se pausa con el trabajo en el
  árbol, sin commit; el ticket vuelve a `Todo` con el detalle de dónde quedó.
- **Para retomar**: rama `feature/cou-325-anadir-una-suite-hurl-para-los-flujos-contra-el-servidor`
  (sin commits, todo en el working tree). Primero, correr la suite contra un stack real (Mailpit +
  Mongo replica set + Redis) y corregir lo que salte; después commit y push para estrenar el job
  `hurl` de CI. Nada de esto está validado todavía en ejecución real.
- **Canal del código de 6 dígitos (decisión)**: el e2e de Jest lo captura escuchando el
  `EventEmitter` del proceso; Hurl sólo tiene HTTP, así que el correo es el único canal posible. Se
  agrega **Mailpit** al job y la app corre con `EMAIL_ENABLED=true`. Beneficio lateral: es la primera
  cobertura del **envío real** de emails (hoy los providers están al 46-57% de cobertura).
- **Fixtures determinísticos**: `test/hurl/fixtures/seed-hurl.ts` borra y recrea los usuarios
  (`hurl.flow`, `hurl.flow.new`, `hurl.locked`, `hurl.viewer`, `hurl.admin`) para que el cambio de
  email del flujo 04 no ensucie la corrida siguiente. El login no exige email verificado (sólo
  credenciales, lock e `isActive`), así que alcanza con crearlos activos.
- **Bug encontrado y corregido antes de CI**: `jsonpath "$.paths./admin/users"` es un JSONPath
  inválido (Hurl devuelve `error: Invalid JSONPath`). La forma correcta es
  `jsonpath "$.paths['/admin/users']"`. Se detectó ejecutando el archivo contra un servidor falso.
- **S8 verificado de forma empírica**: con un servidor HTTP mínimo que cumple el contrato,
  `01-health.hurl` sale **exit 0** (`Succeeded files: 1`); con una sola assertion cambiada a
  `== "degraded"`, sale **exit 4** con `error: Assert failure`. La suite propaga el fallo al código de
  salida, que es lo que necesita CI.
- **Validación sin stack**: los 5 archivos pasan `hurlfmt --check`; `tsc
  --noEmit` en 0 con el fixture incluido; YAML del workflow parseado con `jobs: [test, hurl]` y el
  job de Jest intacto (`EMAIL_ENABLED: false`).
- **Pendiente de verificación real**: la corrida en CI con Mongo, Redis y Mailpit. No se pudo ejecutar
  en local.

## Primera corrida real (2026-10-23, stack de `make up`)

Corrida contra Mongo/Redis del compose y Mailpit, con la app local en `:3100` y base `api_user_hurl`.
Cuatro bugs reales aparecieron acá y ninguno es de la suite:

- **`/auth/login` no valida su body**: `login(@Body() body: { email: string; password: string })`
  recibe un **tipo inline**, no una clase DTO, así que el `ValidationPipe` global no tiene metatype
  que validar y acepta cualquier propiedad extra con 200. El contrato `UA-COM-005` recién se puede
  afirmar en una ruta con DTO (se usa `/auth/register`). **Candidato a ticket.**
- **Los overrides de entorno del `ParameterStore` no se coercen**: `EMAIL_SECURE=false` en el env
  llega como el string `"false"`, que es *truthy*, así que el factory arma el provider con
  `secure: true` y nodemailer intenta TLS contra el puerto plano de Mailpit
  (`SSL routines::wrong version number`). El envío quedaba en `emaillogs` como `failed` sin ruido en
  consola. Afecta a **cualquier parámetro booleano** overrideado por entorno. **Candidato a ticket.**
- **Los templates de email son parte del setup**: `sendBySlug('email-change-code')` resuelve el
  template en la base; sin `seed-email-templates.ts` el correo nunca sale, y el fallo sólo se ve en
  `emaillogs`.
- **La API rechaza con 409 cambiar a una dirección ya tomada** (comportamiento correcto): el fixture
  creaba esa dirección como usuario. Ahora `HURL_FREE_EMAIL` se borra pero no se crea.

Y dos cosas de Hurl que costaron iteraciones:

- **`regex` en `[Captures]` devuelve el grupo de captura, no el match completo**: sin paréntesis
  devuelve `No query result`. Por eso el token se captura como `regex /token=([0-9a-f-]{36})/`.
- **El envío de email es asíncrono** (`email.send` por `EventEmitter`): las lecturas del buzón usan
  `[Options] retry: 10` + `retry-interval: 500ms`, y entre el código y el cambio se vacía el buzón
  (`DELETE /api/v1/messages`) para no leer el mensaje anterior.

### Tickets derivados

Los dos bugs de la API que encontró la corrida real quedaron como tickets con el estándar del repo
(proyecto `api-user`, estimación, asignado, `type:bug` + `api`):

- **COU-326** (est. 1) — Validar el body de inicio de sesión con un DTO.
- **COU-327** (est. 2) — Coercionar los overrides de entorno del ParameterStore.

### Receta local (host → compose)

El replica set del compose anuncia el miembro como `db-user:27017`, que no resuelve desde el host, y
`@nestjs/config` **sobrescribe** `process.env` con `.env.<NODE_ENV>`. Para correr desde el host:

- `NODE_ENV=local` + `JEST_WORKER_ID=1`: `isTestRunner` hace `ignoreEnvFile: true` (manda el entorno
  real) y `MongooseModuleOption` usa `directConnection=true`, el mecanismo que el repo ya tiene para
  "conectar desde fuera de la red docker".
- `.env.hurl` (gitignoreado por `.env.*`) con `DATABASE_HOST=127.0.0.1`, `DATABASE_NAME=api_user_hurl`,
  `EMAIL_HOST=127.0.0.1`, `EMAIL_PORT=1025`, **sin** `EMAIL_SECURE` (por el bug de coerción).
- `HURL_BIN=~/.local/bin/hurl` si el binario no está en el PATH, y `SKIP_BUILD=1` si el contenedor ya
  escribió `dist/` como root.
