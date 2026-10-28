# COU-343 — Evitar el flake de MongoMemoryReplSet reusando el MongoDB del workflow

- **Feature**: `cou-343-mongo-flake`
- **Issue**: https://linear.app/countergank/issue/COU-343/evitar-el-flake-de-mongomemoryreplset-reusando-el-mongodb-del-workflow
- **Base**: `origin/develop` @ `b6ac58e` — **Rama**: `feature/cou-343-evitar-el-flake-de-mongomemoryreplset-reusando-el-mongodb`
- **Estado**: EN IMPLEMENTACIÓN

## Specs

Criterios de aceptación del ticket, citados verbatim.

- **S1** — “`npm test` en local sigue funcionando **sin** Docker ni Mongo levantado, usando el memory server como hoy.”
- **S2** — “En CI las suites de unit se conectan al replica set del workflow, sin descargar ni arrancar mongod propio.”
- **S3** — “Cada suite corre sobre su propia base, así `dropDatabase()` en el teardown no toca `api_user` ni la base de otra suite.”
- **S4** — “La suite completa pasa en CI sin `MongoMemoryReplSet` ni `ECONNREFUSED` en el paso de unit.”
- **S5** — “El helper queda documentado en un solo lugar (`src/test-utils/index.ts`), no repetido por suite.”

## Contexto

`mongodb-memory-server@10.0.0` descarga **mongod 7.0.11** a `node_modules/.cache/mongodb-memory-server`
y lo arranca como replica set. En CI ese directorio no se cachea, así que cada corrida descarga el
binario; en el run 40750362691 mongod murió con `UnexpectedCloseError ... code "100"` seis veces y el
paso `Run unit tests` terminó con `5 failed / 70 passed` suites y `39 failed / 868` tests. Los 5
suites no tienen relación con el cambio evaluado y el mismo commit pasó una vez (`907/907`).

El workflow **ya** levanta un replica set real (`mongo:6.0.3`, `rs0`, usuario `dev_user`) en
`localhost:27017` y expone `DATABASE_*` al paso de unit: el memory server es redundante en CI.

## Diseño

- **Un solo punto de arranque**: `src/test-utils/index.ts` exporta `startTestMongo(label)` que
  devuelve `{ uri, mongod }`, con `mongod` **`null`** cuando usa un Mongo externo.
  - Con `MONGO_TEST_EXTERNAL=1` (lo setea el workflow): arma la URI desde `DATABASE_USER`,
    `DATABASE_PASSWORD`, `DATABASE_HOST`, `DATABASE_PORT` con `authSource=admin` y una **base única por
    suite** derivada de `label` (por ejemplo `unit_<label>_<pid>_<counter>`), para que el
    `dropDatabase()` del teardown nunca toque `api_user` (S3).
  - Sin esa variable (local, S1): `MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine:
    'wiredTiger' } })` como hoy.
- **`clearMongoConnection(conn, mongod?)`**: `mongod` pasa a opcional; si no hay, sólo cierra la
  conexión. Las 5 suites dejan de instanciar `MongoMemoryReplSet` por su cuenta (S5).
- **Workflow**: el paso `Run unit tests` agrega `MONGO_TEST_EXTERNAL: '1'`. No se toca el servicio
  Mongo ni el paso de e2e.
- **Verificación (T1, RED determinista sin depender de CI)**: un unit spec del helper
  (`src/test-utils/index.spec.ts`) que con `MONGO_TEST_EXTERNAL=1` afirma que `startTestMongo()`
  devuelve `mongod === null`, que la URI apunta al host/puerto externos y que dos `label` distintos
  producen bases distintas (S2, S3). Hoy esa rama no existe → RED.
- **Verificación de S1** (que local no cambia): correr la suite completa **sin** la variable y
  comprobar que sigue verde usando el memory server.
- **Verificación de S4 simulada**: correr las 5 suites con `MONGO_TEST_EXTERNAL=1` contra el `db-user`
  del `docker-compose` local (mismo replica set), comprobando que pasan y que ninguna levanta mongod
  propio, y que `api_user` queda intacta.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: spec del helper con Mongo externo (rama nueva) | S2, S3 | `src/test-utils/index.spec.ts` | — |
| T2 | GREEN: `startTestMongo` + `clearMongoConnection` con `mongod` opcional | S1–S3, S5 | `src/test-utils/index.ts` | — |
| T3 | Adoptar el helper en las 5 suites, sin memoria propia | S5 | `src/common/audit/*.spec.ts`, `src/user/repository/user.repository.spec.ts` | — |
| T4 | Workflow: `MONGO_TEST_EXTERNAL=1` en el paso de unit | S2, S4 | `.github/workflows/test.yml` | — |
| T5 | Verificación: suite local sin la variable, y 5 suites contra el replica set local | S1, S4 | inline | — |

## Log

- **L1** (usuario, verbatim): “hay que corregir de alguna manera los checks is o si”.
- **L2** (decisión, parent): se elige el enfoque B — “Helper único + 5 suites + workflow. Saca el
  binario descargado del camino de CI. Estimación 3, diff de ~7 archivos, verificación full suite.” —
  sobre el enfoque A (cachear el binario y fijar la versión), porque A no elimina la dependencia que
  falla: sólo la hace menos probable. B saca el binario del camino de CI por construcción.
- **L3** (evidencia): la causa se confirmó antes de tocar código — `mongodb-memory-server@10.0.0`
  descarga `mongod-x64-ubuntu-7.0.11` a `node_modules/.cache/mongodb-memory-server`, que `setup-node`
  no cachea, mientras el workflow ya levanta `mongo:6.0.3` en `localhost:27017` con `dev_user`. Los 3
  runs rojos de #444 fallaron en `Run unit tests` con `code "100"` y `ECONNREFUSED` a puertos altos,
  en suites ajenas al PR.
- **L4** (decisión, parent): la señal para usar el Mongo externo es explícita
  (`MONGO_TEST_EXTERNAL=1`) y no la mera presencia de `DATABASE_*`, porque esos valores también están
  definidos en local (`.env.local.testing`) y `npm test` en local **no** debe exigir Docker (S1).
- **Clasificación**: Task Size = **medium** — un helper, cinco specs y una línea de workflow; el
  riesgo está en que el teardown con base compartida borre datos de otra suite, y S3 lo acota con base
  única por suite.
