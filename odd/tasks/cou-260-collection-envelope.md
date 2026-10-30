# COU-260 — Unificar el envelope de respuestas de colección

- **Feature**: `cou-260-collection-envelope`
- **Issue**: https://linear.app/countergank/issue/COU-260/unificar-el-envelope-de-respuestas-de-coleccion-en-api-user
- **Base**: `origin/develop` @ `ae846ff` — **Rama**: `feature/cou-260-unificar-el-envelope-de-respuestas-de-coleccion-en-api-user`
- **Estado**: EN IMPLEMENTACIÓN
- **Estimate**: 5 (escala `linear` del team COU, tope 5 con `issueEstimationExtended: false`; el 8 propuesto no existe)

## Specs

Criterios de aceptación del ticket, citados verbatim.

- **S1** — “Todas las colecciones devuelven el mismo envelope `{ data, total, page, limit, totalPages }`.”
- **S2** — “`GET /admin/users` sin `page` deja de devolver un array plano (o emite el aviso de deprecación acordado).”
- **S3** — “Swagger actualizado en cada endpoint afectado.”
- **S4** — “Test e2e por endpoint verificando la forma del envelope.”
- **S5** — “Nota de migración para consumidores existentes.”
- **S6** (decisión del usuario, verbatim) — “Paginación real en ambos endpoints” (aplica a `GET /admin/parameters` y `GET /email/templates`).
- **S7** (decisión del usuario, verbatim) — “A — Borrar la rama muerta”.
- **S8** (decisión del usuario, verbatim) — “busquemos recomendaciones en internet acerca de esto, de todas maneras si necesitamos modificar varios tests lo haremos”. Resultado: envelope único con clave `data` (ver Diseño / Fuentes).
- **S9** (scope fuera, verbatim del ticket) — “cambiar rutas, cambiar nombres de campos de las entidades, o agregar paginación a endpoints que hoy devuelven un único recurso.”

## Contexto real (verificado, corrige al ticket)

El ticket afirma dos cosas que no son ciertas en `ae846ff`:

1. `GET /admin/users` **no** devuelve array plano sin `page`. El `ValidationPipe` instancia
   `PaginationQueryDTO` (`page?: number = 1`), así que la rama "backward compat"
   (`src/user/controller/user.controller.ts:80-84`, desde `dcde4bf`) es inalcanzable por HTTP.
   Ya está pinneado en `test/e2e/user/admin-crud-pagination.e2e-spec.ts:309` y documentado en
   `test/hurl/ENDPOINTS.md:56`.
2. `GET /roles` y `GET /permissions` **no** devuelven arrays planos: devuelven `{ roles: [...] }` y
   `{ permissions: [...] }` (`role.controller.ts:49`, `permission.controller.ts:37`), con 20+ asserts
   e2e/hurl sobre esas claves.

Sí son arrays planos: `GET /admin/parameters`, `GET /admin/parameters/:group`, `GET /email/templates`.

## Diseño

- **`src/common/dto/paginated-response.dto.ts`** (nuevo): `PaginatedResponseDTO<T>` con
  `data: T[]`, `total`, `page`, `limit`, `totalPages` y `static of(data, total, page, limit)`
  (misma aritmética que hoy: `total > 0 ? Math.ceil(total / limit) : 0`). Es el **único** envelope.
- **Se eliminan** `PaginatedUserResponseDTO` y `PaginatedAuditLogResponseDTO` y sus specs: dos clases
  con la misma forma son la razón por la que el envelope no estaba unificado. Usuarios, audit logs,
  parameters, templates, roles y permisos pasan a usar la genérica.
- **`src/common/dto/collection-pagination-query.dto.ts`** (nuevo): `page` (default 1, `@Min(1)`) y
  `limit` (default 20, `@Min(1) @Max(100)`), reusando los mensajes `PAGE_MIN` / `LIMIT_MIN` /
  `LIMIT_MAX` que ya traduce el i18n. `PaginationQueryDTO` de user queda intacto (fuera de scope
  refactorizarlo).
- **Paginación real** en parameters (`getAll` + `:group`) y templates (`findAll`, conservando
  `?active=true`): repositorio/servicio con `skip`/`limit` + conteo, no slicing en el controller.
- **roles/permissions**: la clave `roles`/`permissions` se reemplaza por `data`. La traducción i18n
  (`translateRbacItems`) se mantiene intacta; cambia sólo la envoltura.
- **`/admin/users`**: se borra el `if` inalcanzable y el tipo de retorno pasa a
  `PaginatedResponseDTO<AdminUserDTO>`. La respuesta HTTP no cambia (S7).
- **Swagger**: cada endpoint afectado documenta el envelope como schema de respuesta (S3).
- **Nota de migración**: `CHANGELOG.md` (`### Changed`, formato Keep a Changelog que ya usa el repo) +
  la nota de comportamiento en `test/hurl/ENDPOINTS.md`.

### Fuentes de la decisión de forma (S8)

- Zalando RESTful API Guidelines #167 — objeto JSON como estructura raíz, "*also applies to collection
  resources, where you ad-hoc would use an array*".
- Zalando #159 — paginación obligatoria en listas que puedan crecer.
- Microsoft REST API Guidelines, *Collections* — "*DO* structure the response to a list operation as an
  object with a top-level array field"; "It is a breaking change to add paging in the future".
- Google AIP-132 / AIP-158 — campo repetido nombrado como el recurso en plural + `total_size`.
  Se descarta la clave nombrada porque reintroduce el ramifique-por-endpoint que el ticket elimina.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: spec de `PaginatedResponseDTO.of()` (aritmética de `totalPages`, página vacía) | S1 | `src/common/dto/paginated-response.dto.spec.ts` | 60f6228 |
| T2 | GREEN: `PaginatedResponseDTO` genérica | S1 | `src/common/dto/paginated-response.dto.ts` | 60f6228 |
| T3 | Migrar users + audit logs a la genérica; borrar las dos clases viejas y sus specs | S1, S7 | `src/user/**`, `src/common/audit/**` | 60f6228 |
| T4 | `/admin/users`: borrar la rama muerta y el tipo unión | S2, S7 | `src/user/controller/user.controller.ts` | 60f6228 |
| T5 | `CollectionPaginationQueryDTO` + paginación real de parameters + Swagger | S1, S3, S6 | `src/config/parameters/**`, `src/common/dto/` | 6bbde8c |
| T6 | Paginación real de email templates (`?active` intacto) + Swagger | S1, S3, S6 | `src/email/**` | bd50319 |
| T7 | roles/permissions: clave `data` + Swagger de ejemplos | S1, S3, S8 | `src/rbac/**` | ae230b3 |
| T8 | e2e de forma de envelope por endpoint afectado | S4 | `test/e2e/**` | 60f6228..ae230b3 |
| T9 | Nota de migración: CHANGELOG + ENDPOINTS.md (+ openspec del endpoint de parámetros) | S5 | `CHANGELOG.md`, `test/hurl/ENDPOINTS.md`, `openspec/specs/parameter-admin-controller/spec.md` | este commit |
| T10 | Suites Hurl reapuntadas y verificación completa (unit, e2e, tsc, hurl) | S1-S8 | `test/hurl/**` | sin commit (verificación) |

## Tasks — ronda de hallazgos del review (L23)

| ID | Tarea | Hallazgos | Ruta |
|----|-------|-----------|------|
| T11 | `?active=false` vuelve a significar "sin filtro" + e2e auto-contenido | R1-active-false-filter, R3-active-false-semantics | controller + e2e de templates |
| T12 | `page`/`limit` enteros (`@IsInt`) en los dos query DTOs + clave `PAGINATION_INTEGER` + spec | R3-fractional-page | `src/common/dto`, `src/user/dto`, i18n |
| T13 | `paginateRbacItems` compartido; los controllers dejan de hacer aritmética de páginas | R2-dup-pagination, R3-in-memory-paging-rbac | `src/common/i18n`, `src/rbac/controllers` |
| T14 | `ParameterService.getByGroup` eliminado (código muerto) y sus tests | R2-group-filter-dup | `src/config/parameters` |
| T15 | Clave i18n propia `ACTIVE_BOOLEAN` (es/en/pt) | R2-i18n-key | `src/common/i18n/translations` |
| T16 | `PaginatedUserResponseMock` borrado: no tenía consumidores | R2-mock-name | `src/user/mocks` |
| T17 | e2e de `limit=100` sin asumir catálogo acotado | R3-limit100-catalog-assumption | `test/e2e/rbac` |
| T18 | 400 por query param desconocido: documentado en Swagger de los 4 endpoints + CHANGELOG | R1-nonwhitelisted-400, R3-unknown-query-400 | api-docs + CHANGELOG |

## Verificación

- **S1/S6**: unit del `of()` (aritmética y página vacía) + unit por servicio paginado (skip/limit
  aplicados, `total` del conjunto completo, no de la página) + e2e de forma del envelope por endpoint.
- **S2/S7**: e2e `GET /admin/users` sin query devuelve envelope `data/total/page/limit/totalPages`
  (el existente en `admin-crud-pagination.e2e-spec.ts:309` debe seguir verde sin tocarlo).
- **S3**: los specs de Swagger derivados (COU-319) siguen verdes; se agrega la aserción del envelope
  donde el endpoint no tenía doc.
- **S9**: ningún endpoint de recurso único cambia (`/roles/:id`, `/email/templates/:slug`,
  `/admin/users/:id` siguen devolviendo su objeto).

## Log

- **L1** (usuario, verbatim): “buenas chat, comencemos usando la skill kickoff”.
- **L2** (usuario, verbatim): “vamnos con 2260” / “vamnos con 260”.
- **L3** (kickoff): proyecto `api-user`; referencia previa COU-346 mergeado (PR #450); rama local de
  COU-346 era idéntica al squash de `develop`, así que se partió de `origin/develop` @ `ae846ff`.
- **L4** (readiness): `project` ✓, `assignee` ✓ (`Leandro Javier Cepeda`), `estimate` propuesto 8 →
  **rechazado por la escala**, guardado 5. `state` → `In Progress`. Rama creada con `--no-track`.
- **L5** (usuario, verbatim): “despues de que hagas esto, espera un poco asi levanto el server y testeo
  algo en front”.
- **L6** (usuario, verbatim, decisión S6): “Paginación real en ambos endpoints”.
- **L7** (usuario, verbatim, decisión S7): “A — Borrar la rama muerta”.
- **L8** (usuario, verbatim, decisión S8): “busquemos recomendaciones en internet acerca de esto, de
  todas maneras si necesitamos modificar varios tests lo haremos”.
- **L9** (decisión, parent): envelope único con clave `data` para las seis colecciones; se descarta la
  clave nombrada de AIP-132 porque el cliente seguiría ramificando por endpoint.
- **L10** (decisión, parent): se agrega `page`/`limit` a las cuatro colecciones que no paginaban
  (parameters, templates, roles, permissions) para que el envelope tenga la misma semántica en todos
  lados; Microsoft advierte que agregar paginación después es breaking change.
- **L11** (hallazgo): el ticket describe `/admin/users` y `/roles` con formas que no existen en el
  repo; el alcance real es el de "Contexto real".
- **L12** (evidencia, RED→GREEN por unidad): `PaginatedResponseDTO.of()` 4 casos; `findAll` de users
  1 caso nuevo (RED por instancia de array → GREEN); `ParameterService.findPaginated` 3 casos (RED por
  método inexistente); `EmailTemplateService.findPaginated` 3 casos (igual); `RoleController.findAll`
  2 casos. Unit: 268 + 114 + 42 + 102 verdes por área.
- **L13** (evidencia, e2e): `/permissions` y `/roles` migrados a `.body.data` → 9/9 fallas RED contra el
  código viejo; tras el cambio de controllers, `parameters` + `email-templates` dieron 7 fallas RED
  (todavía esperaban array raíz) y `GET /email/templates/:slug` siguió verde (S9 intacto).
- **L14** (incidente): la corrida del worker de tests se cortó por un cuelgue de la máquina del humano;
  los archivos quedaron escritos en disco y se verificó su contenido antes de seguir.
- **L15** (decisión, parent): el spec vivo de openspec documentaba `ParameterResponseDto[]` y
  "empty array `[]`" para `/admin/parameters`; se actualizó porque el contrato cambió. Los demás specs
  vivos de openspec no describen la forma de las colecciones afectadas.
- **L16** (hallazgo + fix, regresión propia): al pasar `GET /email/templates` a `@Query()` con
  `CollectionPaginationQueryDTO`, `?active=true` empezó a responder **400**. Causa: el
  `ValidationPipe` global corre con `whitelist: true` + `forbidNonWhitelisted: true`, así que un query
  param no declarado se rechaza. Fix: `ListTemplatesQueryDTO extends CollectionPaginationQueryDTO` que
  declara `active?: boolean` con transform `'true'/'false'` y `@IsBoolean`. Efecto secundario
  deliberado: `?active=false` ahora devuelve los inactivos (antes devolvía todos) y un valor no
  booleano responde 400 (antes se ignoraba). Documentado en CHANGELOG y en el doc de Swagger.
- **L17** (evidencia): e2e `email-templates` 21/21 verde y unit del DTO nuevo 4/4. Gate completo:
  unit **926/926**, e2e completo **276/276**, `tsc` limpio.
- **L18** (verificación independiente, `gentle-ai-verify`, read-only): 9 hallazgos. Corregidos acá:
  (1) Swagger de `/permissions` documentaba `{ permission: string }` cuando la API devuelve
  `name/description/category/isSystem/isActive` → nuevo `PermissionResponse`;
  (2) la paginación de templates no tenía test que ejercitara `skip`/`limit` → e2e con
  `limit=1` y `page=2&limit=1` que compara slugs distintos;
  (3) `/permissions` quedaba en 20 de 22 sin que nadie lo notara → el e2e ahora afirma
  `data.length === min(total, 20)` y un caso `limit=100` que alcanza el catálogo entero;
  (4) `paginatedSchema` con `allOf` no tenía evidencia de OpenAPI generado → e2e que lee el documento
  emitido y verifica envelope + `items.$ref` por endpoint;
  (5) `UserService.findPaginated` con `page`/`limit` ausentes daba `totalPages: NaN` → fallback
  a 1/20 + caso unit;
  (6) hurl de roles buscaba el rol creado en la página por defecto → `?limit=100`;
  (7) tests débiles completados: `totalPages` en users, envelope completo en el grupo de parameters,
  `page`/`limit` por defecto en roles, query reenviada en el controller de users.
  Descartados con razones: (a) el 400 por query param desconocido y (b) `?active=false` filtrando
  inactivos son consecuencia del `ValidationPipe` con `forbidNonWhitelisted` y del contrato declarado;
  ambos quedan documentados en CHANGELOG. El doc histórico de COU-319 menciona clases ya borradas:
  es un registro de esa feature, no se reescribe.
- **L19** (evidencia final): `tsc --noEmit` limpio; unit **927/927** (78 suites); e2e completo
  **285/285** (24 suites); biome sin diagnósticos en los archivos tocados. Pendiente por decisión
  humana: suites Hurl contra un server levantado (mutan datos y el humano tiene `api-user`/`ui-user`
  arriba) y la autorización de los 5 commits por unidad revisable.
- **L20** (evidencia, Hurl contra HTTP real): API levantada desde el código sin commitear en `:3100`
  con `.env.hurl` (base `api_user_hurl`, Mailpit) e `ignoreEnvFile` vía `JEST_WORKER_ID=1`. Suite
  completa: app, permission, role, parameter-admin, email-template, user, audit, auth, user-profile →
  **9/9 archivos, 148 requests, 0 fallas**, y repetida dos veces con el mismo resultado. Forma de las
  seis colecciones revisada sobre la respuesta real: todas devuelven
  `data,total,page,limit,totalPages` y `total` refleja el conjunto (22 permisos, 14 parámetros,
  6 en el grupo `email`, 7 templates, 4 roles, 11 usuarios).
- **L21** (dos defectos de la suite encontrados al correrla, corregidos): (a)
  `parameter-admin.hurl` comparaba el valor numérico de `THROTTLE_TTL` con un template entrecomillado
  (integer vs string) — fallaba antes de este ticket, el fix es quitar las comillas; (b)
  `seed-hurl.ts` purgaba sólo los usuarios que siembra, así que los `hurl-ep-*` que crean los
  endpoints (borrado lógico) hacían fallar con 409 la corrida siguiente — se agregaron a
  `HURL_CREATED_EMAILS`. Con eso la suite es repetible (dos corridas seguidas, 100%).
- **L22** (commits, autorizados por el humano en la sesión): `60f6228` envelope genérico + migración de
  users/audit y borrado de las dos clases duplicadas; `6bbde8c` paginación real de `/admin/parameters`;
  `bd50319` paginación real de `/email/templates` + validación de `active`; `ae230b3` envelope `data` en
  `/roles` y `/permissions` + Swagger; `456a55d` fixture Hurl repetible; el commit de documentación
  (este archivo, CHANGELOG, ENDPOINTS.md y el spec de openspec) cierra la serie. Cada commit corrió el
  hook del repo (unit completa) antes de entrar.
- **L23** (usuario, verbatim): “ok perfecto, arreglemos todos los hallazgos ahora nada de hacerlos
  despues, nada de mas tickets para los hallazgos sino es interminable la cantidad de trabajo que se
  pospone como deuda tecnica”.
- **L24** (review nativa, lineage `review-ca777121bd46e336`): aprobada con 3/3 reviewers admitidos y
  11 hallazgos `informational`. Antes falló 3 veces porque `review-readability` corría con
  `nan/mimo-v2.6-flash`, que agotaba sus 32.768 tokens de salida en reasoning sin emitir artifact
  (`stopReason: length`, `textChars: 0`). Se alineó el modelo en las dos capas
  (`~/.pi/gentle-ai/profiles.json` y `~/.pi/agent/subagents.json`) y la corrida cerró. Autoridad
  quemada con `acknowledge-approved`.
- **L25** (ronda de hallazgos, T11-T18): cerrados los 11. Dos cierres son documentación y no código,
  por razones explícitas: el `400` por query param desconocido es la política del `ValidationPipe`
  global (`forbidNonWhitelisted`) y no tiene excepción por ruta; y la paginación de RBAC sigue
  cortando en memoria porque el `CacheService` entrega el catálogo completo, así que bajarla a Mongo
  duplicaría la fuente — lo que sí se eliminó es la aritmética en los controllers y la duplicación
  entre `/roles` y `/permissions`.
- **L26** (defecto propio encontrado al cerrar T11, y el más interesante): el primer fix de
  `?active` no funcionó. Causa: el `ValidationPipe` global corre con `enableImplicitConversion: true`,
  así que el token crudo `'false'` se convierte a `Boolean('false') === true` **antes** de que corra
  el `@Transform`; el decorador nunca ve la cadena. Consecuencia real: `?active=false` filtraba como
  `true` y `?active=now` se aceptaba en silencio como booleano válido. Fix: `@Type(() => String)`
  antes del `@Transform` (el mismo patrón que ya usaba `PaginationQueryDTO.isActive`), y el spec del
  DTO ahora instancia con `{ enableImplicitConversion: true }` para reproducir el pipe real: con las
  opciones por defecto el spec pasaba y el runtime seguía roto. RED observado en el spec antes del
  fix (`false`→`true`, `now` aceptado) y en el e2e (`all.total=10` vs `active=false`→9).
- **L27** (segunda ronda de hallazgos, review nativa `review-c961dc0ef2645c89` sobre el delta
  `25e5bca..HEAD`): aprobada con 3/3 reviewers y 6 hallazgos informativos, cerrados en el momento en
  vez de diferirse. (a) `PAGINATION_INTEGER` se parte en `PAGE_INTEGER` / `LIMIT_INTEGER` para no dar
  un mensaje genérico a dos campos distintos; (b) `paginateRbacItems` sale del helper de i18n a
  `src/rbac/rbac-pagination.ts` y recibe el DTO entero, así ningún controller repite los defaults;
  (c) el caso `?active=true&active=false` queda pinneado como `400` en el spec del DTO; (d) el spec de
  `CollectionPaginationQueryDTO` instancia con `enableImplicitConversion`, igual que el pipe real;
  (e) una línea pegada que introduje en este documento.
- **L28** (evidencia de la ronda L27): unit **930/930** (79 suites), e2e de `rbac` + `email-templates`
  **100/100**, `tsc` limpio.

- **Clasificación**: Task Size = **large** (6 endpoints, 2 clases de envelope a eliminar, Swagger,
  e2e ×4, Hurl ×5, nota de migración; no se puede retomar sólo desde el diff).
