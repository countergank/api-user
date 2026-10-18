# COU-304 — Validar los permisos asignados al editar usuarios (PATCH /admin/users/:id)

- **Feature**: `cou-304-validate-update-permissions`
- **Issue**: https://linear.app/countergank/issue/COU-304/validar-los-permisos-asignados-al-editar-usuarios-patch-adminusersid
- **Base**: `origin/develop` @ `43f6705` — **Rama**: `feat/cou-304-validate-update-permissions`
- **Estado**: IMPLEMENTADO Y VERIFICADO — 72 suites / 814 tests PASS, `tsc` 0, biome limpio;
  verificación independiente con **PASS en los 8 puntos y sin bloqueantes**; review nativo **no
  corresponde** (`assess`: `reviewDue=false`, nativeRisk medium). El e2e se estrena en CI.

## Specs

- **S1** — Aplicar la misma regla que el alta: sólo nombres presentes en el catálogo y rechazo
  explícito de `*`.
- **S2** — `400 UA-COM-005` listando los nombres rechazados.
- **S3** — Reusar `UserService.assertPermissionsAssignable` en el borde HTTP; no duplicar la regla.
- **S4** — Mantener el comportamiento actual cuando el campo se omite.
- **S5** — “`PATCH /admin/users/:id` con un permiso fuera del catálogo responde `400 UA-COM-005`.”
- **S6** — “`PATCH /admin/users/:id` con `*` responde `400 UA-COM-005`.”
- **S7** — “`PATCH /admin/users/:id` con permisos válidos los persiste y se reflejan en
  `GET /auth/me` del usuario.”
- **S8** — “Omitir `permissions` en el PATCH no altera los permisos existentes.”
- **S9** — “Test e2e de los cuatro casos.”
- **S10** — “**Fuera de alcance**: `PUT /roles/:id/permissions` (va con COU-269) y el filtro
  `isActive` del catálogo.”
- **S11** — Decisión (parent): se agrega `@ArrayUnique()` a `UpdateUserDTO.permissions` para
  igualar el contrato del alta; duplicados ⇒ `400` por el `ValidationPipe`, y
  `assertPermissionsAssignable` sigue deduplicando como defensa del método público.

## Diseño

- **Controller** (`src/user/controller/user.controller.ts`, handler `update`): valida antes de
  tocar la base —
  `const permissions = dto.permissions ? await this.userService.assertPermissionsAssignable(dto.permissions) : undefined;`
  y pasa `{ ...dto, permissions }` a `updateUser`. La validación queda **fuera** de la transacción
  de `updateUser`, igual que en el alta (COU-268), así un rechazo no deja escritura parcial.
- **DTO** (`src/user/dto/update-user.dto.ts`): `@ArrayUnique()` en `permissions` (S11).
- **Sin cambios** en `UserService.updateUser`: sigue persistiendo lo que recibe; el borde es el que
  valida, por la misma razón que en COU-268 (el servicio no puede importar `RbacModule`).
- **Fuera de alcance explícito**: el PATCH también acepta `role`. Un admin puede otorgar `*`
  cambiando el rol a `admin`, y eso **no** lo introduce ni lo cierra este ticket: es una capacidad
  de asignación de rol, ya presente en el alta desde COU-268. Se documenta para que la decisión sea
  visible, no se cambia acá.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED/GREEN: validación en el handler `update` del controller | S1–S3, S5, S6 | inline (parent) | 1 |
| T2 | `@ArrayUnique()` en `UpdateUserDTO.permissions` con su test | S11 | inline (parent) | 1 |
| T3 | e2e de los cuatro casos del AC (S9) | S7–S9 | inline (parent) | 1 |
| T4 | Verificación (tsc, biome, suite unit) y RDD | todas | inline (parent) | — |

## Entrega

- Estrategia: **single-pr** contra `develop`, igual que COU-264/268. Rebanada estimada: ~120–180
  líneas autoradas (controller, DTO, unit, e2e, doc).
- El e2e se valida en CI: en local no hay MongoDB ni Redis.

## Verificación independiente (resultado)

`gentle-ai-verify` sobre `8da62d3`: **PASS en los 8 puntos, sin bloqueantes**. Puntos que confirmó
con evidencia: la validación corre antes de la escritura y no hay otra ruta que llegue a
`updateUser`; `*` y los nombres fuera del catálogo no se persisten; un PATCH valido se refleja en
`/auth/me`; omitir el campo no altera nada (y `permissions: null` tampoco, por ser falsy);
`ArrayUnique` coincide con el alta y el servicio sigue deduplicando; y el vector `role` ya existía
en `develop`.

Correcciones aplicadas a partir de su informe:

- **El e2e dependía del efecto de un test anterior** (el caso de omisión esperaba el `audit:read`
  que otorgaba el test previo). Ahora cada test crea su propio usuario objetivo y el caso de
  omisión arma su propio estado: cualquier falla es local y corre aislado.
- El caso de `*` combinado con `name` ahora también verifica que **el nombre no se aplicó**, es
  decir que el rechazo es total y no parcial.

## Decisiones de alcance aceptadas conscientemente

- **`PATCH` acepta `role`, y `role: admin` otorga `*` por herencia.** No lo introduce este cambio
  (verificado contra `origin/develop`) y **no cruza el límite de privilegios**: el controller
  entero lleva `@Roles(UserRole.ADMIN)` + `RolesGuard`, así que sólo un admin llega al PATCH, y un
  admin ya podía crear usuarios admin desde COU-268. Se acepta como capacidad de asignación de rol,
  fuera del alcance de este ticket.
- **`permissions: []` borra los permisos explícitos** del usuario (queda con los del rol). Es la
  semántica natural de “reemplazar la lista” y no se documentó en el ticket: se deja escrito acá.
- **La validación corre fuera de la transacción** de `updateUser` (TOCTOU teórico entre validar y
  escribir). Es el mismo diseño que el alta: el catálogo cambia por administración, no en carrera
  con un alta, y mover la validación adentro del servicio exigiría el ciclo de módulos que COU-268
  evitó.
- El 400 por permisos duplicados llega en los e2e como `HTTP_400` y no como `UA-COM-005`, porque el
  harness instala el `ValidationPipe` de Nest sin el `exceptionFactory` custom. `ArrayUnique` está
  cubierto por unit, no por e2e.

## Log

- **L1** (usuario, verbatim): “mergeadi, con que seguimos?”.
- **L2** (usuario, selección en UI, sin texto libre): “Nuevo ticket: validar PATCH /admin/users/:id
  (recomendado)” — acepta que el hueco se cree como ticket nuevo y se ataque ahora.
- **Clasificación**: Task Size = **large** por riesgo item 2 (permisos: una validación mal puesta
  deja pasar `*`), aunque la superficie sea chica.
- **Verificación independiente** (parent, observada): 8/8 PASS, sin bloqueantes; sus dos
  observaciones de calidad del e2e fueron corregidas antes de publicar.
