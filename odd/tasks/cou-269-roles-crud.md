# COU-269 — Completar el CRUD de roles en el módulo RBAC

- **Feature**: `cou-269-roles-crud`
- **Issue**: https://linear.app/countergank/issue/COU-269/completar-el-crud-de-roles-en-el-modulo-rbac
- **Base**: `origin/develop` @ `31aafcc` — **Rama**: `feat/cou-269-roles-crud`
- **Estado**: EN PLANIFICACIÓN — sin código escrito.

## Specs

Requisitos tal como los escribe el ticket (verbatim) más las decisiones del parent.

- **S1** — “`POST /roles` (crear).”
- **S2** — “`PATCH /roles/:id` (actualizar nombre/descripción).”
- **S3** — “`DELETE /roles/:id` (eliminar).”
- **S4** — “Proteger los roles con `isSystem: true` para que no puedan renombrarse ni eliminarse.”
- **S5** — “**Fuera de alcance**: CRUD de permisos; los permisos se siguen sembrando desde
  `PermissionService`.”
- **S6** — “`POST /roles` crea un rol; nombre duplicado → 409.”
- **S7** — “`PATCH /roles/:id` actualiza nombre y descripción.”
- **S8** — “`DELETE /roles/:id` elimina un rol no-sistema.”
- **S9** — “Un rol `isSystem: true` no puede renombrarse ni eliminarse.”
- **S10** — “Un rol con usuarios asignados no puede eliminarse.”
- **S11** — “Los `permissionIds` se validan contra el catálogo existente.”
- **S12** — “`@AuditAction` en cada mutación.”
- **S13** — Decisión (parent): **para roles el comodín `*` sí es válido** (el rol `admin` lo usa),
  pero cualquier otro nombre que no exista en el catálogo se rechaza con `400 UA-COM-005`. Esto se
  aplica también a `PUT /roles/:id/permissions`, que hoy persiste `permissionIds` sin validar: es el
  último escritor de permisos sin control del módulo.
- **S14** — Decisión (parent): se agrega el error kind `ROLE_IN_USE` (`UA-RBAC-001`, **409**) para
  el borrado bloqueado por usuarios asignados (S10). Para la protección de roles de sistema (S9) se
  reusa `FORBIDDEN` (`UA-SEC-002`, **403**): es una restricción de política, no un conflicto de
  estado, y no amplía el catálogo de errores sin necesidad.
- **S15** — Decisión (parent): borrar un rol invalida las cachés de rol igual que `create` y
  `updatePermissions` (`delByPattern('cache:rbac:roles:*')` + `del(ROLE_ALL_KEY)`), y no toca los
  documentos de usuario.
- **S16** — Decisión (parent): renombrar un rol a un nombre ya existente responde **409
  `UA-COM-003`**, igual que el alta. Sin este guardia, el índice único de Mongo filtrado como error
  crudo produce un 500 en lugar de un conflicto.
- **S17** — Decisión (parent): el guardia de “rol con usuarios asignados” necesita un método público
  `UserService.findIdsByRole(role: UserRole): Promise<string[]>`, que delega en el método homónimo
  del repositorio. Hoy sólo existe privado dentro de `invalidateUsersByRole`, así que `RoleService`
  no tiene cómo consultarlo. Se agrega con su test unitario en lugar de aproximar el conteo con
  `findPaginated`, que traería documentos para contar.

## Diseño

- **DTOs** (`src/rbac/dto/`, el directorio no existe todavía): `CreateRoleDTO`
  (`name` obligatorio, `description` opcional, `permissionIds` opcional, `isSystem` **no** aceptado
  por API — sólo el seeder lo define) y `UpdateRoleDTO` (`name` y `description` opcionales; **no**
  acepta `permissionIds`, que siguen por `PUT /roles/:id/permissions`).
- **`RoleService`**: `update(roleId, dto)` y `remove(roleId)`; `create` existente se reutiliza pero
  debe rechazar nombre duplicado con `ENTITY_NAME_ALREADY_EXISTS` (`UA-COM-003`, 409, ya existente).
  `remove` consulta `userService.findIdsByRole(role.name)` y lanza `ROLE_IN_USE` si hay usuarios.
  La validación de `permissionIds` vive en el servicio (a diferencia de usuarios, acá `RoleService`
  ya tiene acceso al catálogo vía `PermissionService` — mismo módulo, sin ciclo):
  `assertPermissionsExist(permissionIds)` acepta `*` y nombres del catálogo.
- **`RoleController`**: `POST /roles` (`role:create`), `PATCH /roles/:id` (`role:update`),
  `DELETE /roles/:id` (`role:delete`), todos con `@Roles(UserRole.ADMIN)` como el `PUT` existente,
  `@AuditAction` (`role.create`, `role.update`, `role.delete`) y Swagger en `src/rbac/api-docs/`.
  `PUT /roles/:id/permissions` pasa a validar `permissionIds` (S13).
- **Sin cambios** en `PermissionService` ni en el sembrado (S5).

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | `ROLE_IN_USE` en `error-kind.ts` + `assertPermissionsExist` en `RoleService` (acepta `*`) y aplicación en `updatePermissions` | S11, S13, S14 | delegado (worker) | 1 |
| T2 | `CreateRoleDTO` / `UpdateRoleDTO` + `RoleService.create/update/remove` con duplicados, `isSystem` y usuarios asignados | S1–S4, S6–S10 | delegado (worker) | 1 |
| T3 | Rutas del controller + `@AuditAction` + Swagger | S1–S3, S12 | delegado (worker) | 1 |
| T4 | Unit de servicio y controller + e2e `test/e2e/rbac/roles-crud.e2e-spec.ts` | todas las AC | delegado (worker) | 1 |
| T5 | Verificación (tsc, biome, suite unit) y RDD | todas | inline (parent) | — |

## Entrega

- Estrategia: **single-pr** contra `develop`. Rebanada estimada: ~350–450 líneas; **real: ~1512**
  (18 archivos). Se acepta el desvío y se justifica: el e2e de roles (292 líneas) y los specs de
  servicio/controller concentran la mayor parte, y partir la unidad dejaría rutas sin cobertura o
  validación sin consumidor. La revisión se hace por lente con el candidato commiteado completo.
- El e2e se valida en CI: en local no hay MongoDB ni Redis.

## Verificación independiente (resultado)

`gentle-ai-verify` sobre el candidato: **PASS en 7 de 9 puntos**, sin bloqueantes. Confirmó con
evidencia: rutas con guards y auditoría que efectivamente dispara, `isSystem` bloqueado antes de
cualquier escritura, duplicados 409 en alta y renombre, `ROLE_IN_USE` con el camino de lectura
correcto, validación de `permissionIds` en los dos caminos de escritura (el único escritor sin
validar es el seeder, excluido por S5), el fix del body vacío en DTO y servicio, y —el punto que más
me importaba— **ninguna aserción previa debilitada ni borrada**: las únicas líneas removidas son
imports, un parámetro sin uso y el conteo 29→30 del registro.

Correcciones aplicadas a partir de su informe (ambas en el e2e, ambas habrían puesto CI en rojo):

- Se afirmaba que el mensaje del 400 contenía el nombre rechazado, pero `AllExceptionsFilter`
  traduce el mensaje de `DomainError`, así que el nombre no llega al cliente. Ahora se afirma el
  código, y los nombres rechazados quedan cubiertos por el unit del servicio.
- El caso de body vacío esperaba `UA-COM-005`, pero lo rechaza el DTO y el harness de e2e usa el
  `ValidationPipe` de Nest sin el `exceptionFactory` custom, que responde `HTTP_400`. Se afirma el
  status y la invariante que importa (los permisos del rol intactos); el guardia del servicio lo
  pinea su unit test.

## Follow-up detectado por el verificador

- **Renombrar un rol que tienen usuarios asignados** deja a esos usuarios con un nombre de rol
  inexistente y, por lo tanto, sin permisos de rol. Hoy es **inalcanzable por HTTP** porque el rol
  de un usuario está restringido al enum (`admin|user|viewer`) y los roles personalizados todavía no
  se pueden asignar, pero sí es alcanzable desde llamadores internos que usen `createWithRole`. Va
  como ticket propio junto con la asignación de roles personalizados.

## Log

- **L1** (usuario, verbatim): “listo, mergeado, que sigue?”.
- **L2** (usuario, selección en UI, sin texto libre): “COU-269 — roles CRUD + validar permissionIds
  (recomendado)”.
- **Clasificación**: Task Size = **large** por riesgo item 3 (contrato nuevo del API de roles) e
  item 2 (permisos: un rol con `permissionIds` no validados cambia los permisos efectivos de todos
  sus usuarios).
- **Corrección del parent tras la entrega del worker** (observada): `PUT /roles/:id/permissions`
  con body vacío pasaba `undefined` a la validación, que devolvía `[]` y **vaciaba los permisos del
  rol** — antes Mongo ignoraba `undefined` y los dejaba intactos. Se agregó el guardia de array en el
  servicio (`VALIDATION_ERROR`), el DTO `UpdateRolePermissionsDTO` obligatorio en el borde, y un caso
  e2e que verifica que el body vacío responde 400 **y** que los permisos siguen intactos. RED
  observado antes del guardia (`Received promise resolved instead of rejected`).
