# COU-268 — Permitir asignar permisos al crear usuarios desde el panel admin

- **Feature**: `cou-268-create-user-permissions`
- **Issue**: https://linear.app/countergank/issue/COU-268/permitir-asignar-permisos-al-crear-usuarios-desde-el-panel-admin
- **Base**: `origin/develop` @ `76264b4` — **Rama**: `feat/cou-268-create-user-permissions`
- **Estado**: EN PLANIFICACIÓN — sin código escrito.

## Specs

Requisitos tal como los escribe el ticket (verbatim) más las decisiones del parent.

- **S1** — “Agregar `permissions?: string[]` a `CreateUserDTO`.”
- **S2** — “Validar cada permiso contra el catálogo y persistirlo en el alta.”
- **S3** — “Mantener el comportamiento actual cuando el campo se omite.”
- **S4** — “`POST /admin/users` acepta `permissions` y los persiste.”
- **S5** — “Permiso desconocido → 400 con el `UA-*` correspondiente.”
- **S6** — “`permissions` omitido → el usuario hereda los permisos de su rol (según la regla
  de A6).”
- **S7** — “`POST /auth/register` sigue ignorando rol y permisos (test de regresión que lo
  garantiza).”
- **S8** — “Swagger actualizado.”
- **S9** — “**Fuera de alcance**: `POST /auth/register` y cualquier vía de autoregistro.” El
  registro público mantiene `role: UserRole.USER`, `permissions: []`, `isActive: false`
  hardcodeados.
- **S10** — Decisión (parent): el comodín `*` se **rechaza** como permiso explícito de usuario.
  `*` no es un documento del catálogo y otorgarlo por alta sería una escalada de privilegios
  silenciosa (el guard lo interpreta como acceso total).
- **S11** — Decisión (parent): los permisos duplicados se **rechazan en el borde** con `400
  UA-COM-005` (`@ArrayUnique()` en el DTO), que es explícito para el cliente; el servicio igual
  deduplica de forma defensiva porque es un método público que también pueden llamar llamadores
  internos.

Nota de implementación: el `ValidationPipe` global corre con `forbidNonWhitelisted: true`, así que
un payload con propiedades desconocidas —incluido `role`/`permissions` en `POST /auth/register`—
responde `400 UA-COM-005` en lugar de ignorarlas. El e2e lo pina en ambos lados (S7).

## Diseño

- **DTO** (`src/user/dto/create-user.dto.ts`): `permissions?: string[]` con `@IsOptional()`,
  `@IsArray()`, `@ArrayUnique()` y `@IsString({ each: true })`, documentado en Swagger como
  opcional. `toEntity()` las copia al documento (default `[]`) para que las dos vías de alta
  (`UserService.create` y `UserService.createWithRole`) se comporten igual.
- **Validación contra el catálogo**: vive en `UserService.createWithRole` (el camino que usa
  `POST /admin/users`), con un `assertPermissionsExist(permissions)` que consulta el modelo
  `Permission` por nombre. `UserModule` registra `MongooseModule.forFeature([Permission])` para
  inyectarlo: **no** se importa `RbacModule` porque éste ya importa `UserModule`
  (`RoleService` → `UserService`) y sería un ciclo.
  - Motivo de no reusar `PermissionService`: hacerlo exigiría extraer un módulo de catálogo
    compartido. Queda anotado como refactor posterior; acá se paga una query por alta de admin.
  - Falta de permiso ⇒ `DomainError.fromKind('VALIDATION_ERROR')` (`UA-COM-005`, 400) con el
    detalle de los nombres desconocidos (S5).
- **Controller** (`src/user/controller/user.controller.ts`): `POST /admin/users` pasa
  `permissions: createUserDTO.permissions ?? []` en lugar del `[]` hardcodeado (S1/S4).
- **Swagger**: ejemplo y descripción del campo en `src/user/api-docs/examples/create-user.request.ts`
  (+ `CreateUserDoc()` si hace falta).
- **Sin cambios** en `src/auth/**`: `RegisterUserDTO` y `authService.register()` no se tocan (S9).

## Entrega

- Estrategia: **single-pr** contra `develop`, la misma que COU-265/266/267/264.
- Rebanada: **una sola unidad de trabajo de 508 líneas autoradas** (código + tests + doc). Se excede
  la guía de ~400 líneas y se acepta el costo: DTO, validación de catálogo, controller, Swagger,
  unit y e2e se sostienen mutuamente, y partirla dejaría la validación del borde sin el endpoint
  que la usa. No hay segundo commit previsto.
- El e2e es el único criterio de aceptación que no se puede ejecutar en local (sin MongoDB ni
  Redis); se valida en CI.

## Fuera de alcance (anotado como follow-up)

- `PUT /roles/:id/permissions` tampoco valida `permissionIds` contra el catálogo. Es una brecha
  preexistente, hermana de S2, pero el ticket acota el cambio al alta de usuarios; se documenta
  para el ticket de CRUD de roles (COU-269).
- **`PATCH /admin/users/:id`** hereda `permissions` de `CreateUserDTO` vía `PartialType` y las
  persiste **sin pasar por `assertPermissionsAssignable`**, así que acepta `*` y nombres fuera del
  catálogo. Preexistente (verificado contra `origin/develop`), no lo introduce este cambio; queda
  como follow-up explícito para que la validación del borde cubra alta y edición.
- El lookup del catálogo no filtra `isActive`, así que un permiso desactivado todavía se puede
  otorgar. Se deja como follow-up: desactivar un permiso no lo saca hoy de los `permissionIds` de
  los roles, así que filtrarlo acá solo crearía una asimetría.
- `UserService.create()` (vía `toEntity`) no tiene llamador HTTP; si alguna vez se cablea, deberá
  pasar por la misma validación que `POST /admin/users`.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | DTO con `permissions` + `toEntity` + Swagger (RED→GREEN en el spec del DTO) | S1, S3, S8, S11 | inline (parent) | 1 |
| T2 | Validación contra el catálogo en `createWithRole` + wiring del modelo `Permission` | S2, S5, S10 | inline (parent) | 1 |
| T3 | Controller: persistir los permisos del DTO y test de regresión del registro público | S4, S6, S7 | inline (parent) | 1 |
| T4 | e2e: alta con permisos, permiso desconocido → 400, omisión → herencia, registro intacto | S4–S7 | inline (parent) | 1 |
| T5 | Verificación (tsc, biome, suite unit) y review nativo | todas | inline (parent) | — |

## Log

- **L1** (usuario, verbatim): “mergeado, vamos con lo que sigue”.
- **L2** (usuario, selección en UI, sin texto libre): “COU-268 — permisos al crear usuarios
  (recomendado)” como próximo ticket.
- **Clasificación**: Task Size = **large** por riesgo item 2 (superficie de permisos: un error
  en el alta otorga capacidades a quien no debe) ⇒ documento de feature y verificación
  independiente vía `assess` con `escalate`.
