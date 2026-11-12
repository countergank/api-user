# Carga de foto de perfil del usuario autenticado (#539)

Feature `POST /users/profile/photo` con validación de formato/tamaño, storage local y `avatarUrl` en `GET /users/profile` y `GET /auth/me`. Rama: `feature/539-carga-foto-perfil` (base `origin/develop`). Issue: countergank/api-user#539. Bloquea ui-user#59.

## Specs

- **S1** — "`POST /users/profile/photo` acepta `multipart/form-data` con el campo `file`, requiere JWT y queda documentado en OpenAPI."
- **S2** — "Solo acepta los formatos habilitados (jpg/png/webp) y rechaza el resto con error del catálogo (`UA-*`/`400`), sin exponer stack."
- **S3** — "Rechaza archivos por encima del límite de tamaño definido (p. ej. 2 MB) con error claro."
- **S4** — "La imagen queda almacenada y servible por URL: `GET /users/profile` y `GET /auth/me` devuelven `avatarUrl`."
- **S5** — "Reemplazar la foto reemplaza la referencia (la anterior deja de referenciarse en el documento `User`)."
- **S6** — "Test: subida exitosa devuelve `avatarUrl` servible; subida de formato inválido devuelve 400 con error tipado y no muta el usuario."

## Tasks

- **T1** (S1, S2, S3) — ✅ Errores de catálogo (UA-USR-005/006) + validación de formato/tamaño (magic bytes, `file-type`). Ruta: `src/user/service/user.service.ts`, `src/common/errors/error-kind.ts`. Commit: `0bee6b6`
- **T2** (S4, S5) — ✅ Storage local (`UserProfilePhotoStorage`), borrado del archivo reemplazado, `avatarUrl` en `User`. Ruta: `src/user/storage/`, `src/user/entities/user.entity.ts`. Commit: `0bee6b6`
- **T3** (S1, S4) — ✅ Endpoint multipart (`@fastify/multipart` v8.3.1, límite en plugin), OpenAPI, `avatarUrl` en perfil y `/auth/me`, servido estático `@fastify/static` en `main.ts`. Commit: `5ae15df`
- **T4** (S6, S1–S5) — ✅ Tests RED→GREEN: 134/134 en suites enfocadas; suite completa 1056/1056 (un contrato legacy de 6 claves en `/auth/me` actualizado a 7 por S4). Tests viajan con el código de cada tarea. Commits: `e6bdbb0` (deps, slice 1), `0bee6b6` + `5ae15df` (slice 2, 517 líneas autorales — frontera registrada; entrega como un solo PR de feature).

## Log

- **L1** (2026-11-11) — "usa la skill kickoff" → issue #539 elegido por continuidad del área `feature,api` de usuarios. Specs citadas verbatim del cuerpo del issue.
- **L2** (2026-11-11) — Exploración: app corre Fastify (multer/Express NO viable); sin deps de multipart ni file-writing; error catálogo en `src/common/errors/error-kind.ts` (patrón `UA-<GRP>-NNN`); `UserService.update` acepta `Partial<User>` sin whitelist; `MeResponseDTO` sin avatar; `@fastify/static` declarado pero no registrado; `.env.example` bloqueado por política de seguridad del harness (convención de env nueva la define T2 y se documenta).
- **L3** (2026-11-11) — Decisiones de implementación: formato decidido solo por magic bytes (`file-type` v16, CJS `fromBuffer`); buffer truncado o ilegible se rechaza, nunca se adivina por el mimetype declarado. Límite de tamaño doble: plugin-level `limits.fileSize` (lanza `RequestFileTooLargeError` en `toBuffer()` → 413 tipado) y chequeo de `size` en el servicio. Storage escribe `public/uploads/avatars` (flag `wx`, nombre `userId-timestamp.ext`); `main.ts` sirve `/uploads/` con `@fastify/static`. Reemplazo: borra el archivo anterior recién después de commitear la nueva referencia; fallo de storage limpia el huérfano. Sin commits: autorización de commit pendiente.
- **L4** (2026-11-11) — Contratos legacy actualizados por S4: registro `ErrorKind` 32→34 (`error-kind.spec.ts`) y whitelist de `/auth/me` 6→7 claves (`auth.controller.spec.ts`, `me-response.dto.spec.ts`).
- **L5** (2026-11-11) — Commits autorizados por el humano en sesión: `e6bdbb0`, `0bee6b6`, `5ae15df` (+ doc ODD). Decisiones registradas para el follow-up (ticket aparte): refactor de storage con patrón Strategy por `STORAGE_DRIVER` (local default / S3 hacia Cloudflare R2, cuenta existente de countergank con dominio), keys de objeto en Mongo en vez de URLs, antes de que acumulen datos reales.
