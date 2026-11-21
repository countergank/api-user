# 561 — Añadir gestión de permisos por administrador en RBAC

Admin-only write endpoints for the RBAC permission catalog: create and edit
permissions over HTTP, restricted to administrators. API only (no UI, no
physical delete, seed stays the source of base permissions).

## Specs

- S1: `POST /admin/permissions` crea un permiso con `name`, `description` y `category` (`user` | `system`).
- S2: Un `name` duplicado responde 409 y no crea el permiso.
- S3: El permiso creado aparece en `GET /permissions` y es asignable a un rol vía `PUT /roles/:id/permissions` sin rechazo de validación.
- S4: `PATCH /admin/permissions/:id` actualiza `description`, `category` e `isActive`.
- S5: Desactivar un permiso (`isActive: false`) no altera las asignaciones existentes en los roles.
- S6: Ambos endpoints quedan documentados en OpenAPI bajo el tag `permissions`, sin secciones sueltas (ver #558).

## Tasks

| ID | Spec | Route | Commit |
|----|------|-------|--------|
| T1 | S1, S2, S4, S5 | inline — PermissionService: duplicate guard on create + update method, unit tests | b156342 |
| T2 | S1, S2, S4 | inline — CreatePermissionDTO/UpdatePermissionDTO, AdminPermissionController, module registration, unit tests | b156342 |
| T3 | S6 | inline — ApplyCreatePermissionDoc/ApplyUpdatePermissionDoc + request example | b156342 |
| T4 | S1–S6 | inline — e2e acceptance spec over HTTP | this commit |
## Log

- L1: «vamos» — implements GitHub issue #561 after kickoff (board `In Progress`, branch `feature/561-gestion-permisos-admin`, base `origin/develop`).
- L2 (evidence): T1 RED→GREEN 37/37 (`permission.service.spec.ts`); T2+T3 GREEN 116/116 across `src/rbac` (4 suites), `tsc --noEmit` clean; T4 e2e `admin-permissions.e2e-spec.ts` 12/12 (S1–S6), hurl purge spec extended 2/2. Files: service guard/update, `admin-permission.controller.ts` + spec, `create/update-permission.dto.ts`, `rbac.decorator.ts` doc decorators, `permission.examples.ts` request/response examples, `rbac.module.ts` registration, `test/hurl/admin-permission.hurl`, `seed-hurl.ts` purge, `ENDPOINTS.md`.
- L3 (evidence, close): full unit suite 1157/1157 (89 suites); `npx biome lint ./src/rbac` 0 diagnostics (repo-wide lint errors are pre-existing in `src/auth/`/`src/main.ts`, untouched by this diff); differential check: `PermissionService.create()` had no callers besides specs before this change (seeder goes through `seedDefaultPermissions` → `createMany`, whose duplicate tolerance is intact), so the 409 guard cannot regress any existing consumer. All S# covered: S1, S2, S3, S4, S5, S6 verified through the public HTTP interface.
- L4 (user report, resolved): «Probe el post pero no logro dar de alta un permiso» — 400 UA-COM-005 with `property: permission, whitelistValidation` plus missing `name`/`category`. Reproduced: the client sent the body wrapped in a `permission` key; the request contract is flat (the envelope is response-only). Added e2e regression pinning the flat contract (`rejects a body wrapped in the response envelope with 400`) and made the OpenAPI description explicit about the flat body. No product code defect.
- L5 (user report, resolved): «no se actualiza correctamente el listado de permisos luego de post o update» — suspected cache staleness. Verified with a warm-cache e2e (`reflects a create and an update over a warm permission cache`): list → POST → list shows the new permission; PATCH → list shows the rotated description. Cache invalidation (`cache.invalidate.rbac` → atomic KEYS+DEL over `cache:rbac:*`) works. Root cause of the perception: COU-260 pagination — `GET /permissions` defaults to 20 items and the seeded catalog holds 23+, so a new permission lands on page 2. Read with `?limit=100` (or `?page=2`).
