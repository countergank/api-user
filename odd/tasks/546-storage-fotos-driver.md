# 546-storage-fotos-driver

Refactor del storage de fotos de perfil a driver parametrizable (local | s3/R2). Issue: https://github.com/countergank/api-user/issues/546 — Board: In Progress.

## Specs

- S1: "Interfaz `ProfilePhotoStorage` (`save(userId, buffer, ext) → url`, `delete(url)`) con dos implementaciones: `local` (actual) y `s3` (S3-compatible API vía `@aws-sdk/client-s3`, sirve para R2, B2, MinIO)."
- S2: "Selección de driver por variable de entorno `STORAGE_DRIVER=local|s3` mediante provider factory de Nest; default `local` para dev/CI."
- S3: "Persistir la **key del objeto** (p. ej. `avatar/<userId>-<timestamp>.png`) en el campo `User.avatarUrl` y resolver la URL pública al exponerla (`STORAGE_PUBLIC_URL` como base; el driver local sigue devolviendo `/uploads/avatars/...`)."
- S4: "Config S3 por env: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`."
- S5: Criterios de aceptación del ticket, verbatim:
  - S5.1: "Con `STORAGE_DRIVER=local` el comportamiento es idéntico al actual (endpoint, respuesta, archivos servidos por `@fastify/static`), sin requerir credenciales."
  - S5.2: "Con `STORAGE_DRIVER=s3` la foto se almacena en el bucket configurado y la respuesta devuelve la URL pública servible (`STORAGE_PUBLIC_URL` + key)."
  - S5.3: "El reemplazo de foto elimina el objeto anterior en ambos drivers, después de commitear la nueva key."
  - S5.4: "Un fallo del driver S3 rechaza la subida con error tipado y no muta al usuario."
  - S5.5: "`avatarUrl` devuelto por `GET /users/profile` y `GET /auth/me` se resuelve desde la key con la base configurada."
  - S5.6: "Test: el factory entrega el driver correcto por env; cada driver cubre save/delete/reemplazo; smoke opcional contra R2 en dev."

## Tasks

- T1 (S1, S5.1) Extraer interfaz `ProfilePhotoStorage` y `LocalProfilePhotoStorage` desde `user-profile-photo.storage.ts`; ruta: `src/user/storage/`. — commit: pendiente.
- T2 (S1, S4, S5.2, S5.4) `S3ProfilePhotoStorage` con `@aws-sdk/client-s3` (PutObject/DeleteObject), error tipado. — commit: pendiente.
- T3 (S2, S4) Provider factory por `STORAGE_DRIVER` en `user.module.ts` + vars nuevas en `src/config/env.validation.ts`. — commit: pendiente.
- T4 (S3, S5.2, S5.5) Persistir key en `avatarUrl`; resolver URL pública al exponer en `user-profile.controller` y `MeResponseDTO`/`auth.me`. — commit: pendiente.
- T5 (S5.3) Reemplazo: save nueva key → update Mongo → delete objeto anterior (orden actual, ambos drivers). — commit: pendiente.
- T6 (S5.6) Tests: factory, drivers (save/delete/reemplazo), flujo del servicio, resolver. — commit: pendiente.

- T1..T5 → commit `4141ffe` `feat(user): add parametrizable photo storage` (slice 1, ~681 líneas). T6 (compose MinIO) → commit siguiente (slice 2). Commits autorizados explícitamente por el usuario en sesión (12/11).

## Log

- L1 (12/11): «usa la skill kickoff» → kickoff eligió #546 por continuidad con #539; «eliminado, vamos con el ticket». Implementación autorizada; commits requieren autorización explícita por commit (AGENTS.md).
- L2: El mapa de exploración corrige el ticket: el repo usa **Mongoose** (no TypeORM); el flujo de foto corre fuera de `runInTransaction` con limpieza compensada (save → update → delete best-effort). `delete()` actual no-op para URLs ajenas al prefijo.
- L3: Decisión de diseño: `save()` devuelve la **key** (`avatar/<userId>-<ts>.<ext>`); la URL pública se resuelve con función pura `resolveProfilePhotoUrl(key, storagePublicUrl?)` — keys empiezan con `avatar/`, valores legados que empiezan con `/` (URLs previas a este cambio) se devuelven tal cual. `STORAGE_PUBLIC_URL` no definida + key → mapeo local `/uploads/avatars/<basename>`.
- L4: `main.ts` monta `@fastify/static` en `public/uploads` con prefix `/uploads/` — el driver local escribe bajo `public/uploads/avatars` igual que hoy (S5.1 sin cambios en serving).
- L5 (12/11): Implementación completa. Nuevos: `profile-photo-storage.ts` (interfaz + token + key + resolver puro), `local-profile-photo.storage.ts`, `s3-profile-photo.storage.ts`, `profile-photo-storage.factory.ts`, `profile-photo-url.resolver.ts`. `delete()` acepta keys `avatar/...` y URLs legacy `/uploads/avatars/...`; en S3 ignora valores ajenos al prefijo. `MeResponseDTO.of(user, avatarUrl?)` recibe la URL resuelta; resolver inyectado en UserService, UserProfileController y AuthController (UserModule lo exporta).
- L6 (12/11): Specs: los que construyen `UserService` necesitan `{ provide: PROFILE_PHOTO_STORAGE, useValue: ... }` (el token Symbol no lo cubre `Mock(token)`). Casos nuevos: persistencia de key + URL resuelta, reemplazo por key, factory local/s3/default, driver local con tmpdir, driver S3 con `S3Client.send` espiado, resolver puro, `MeResponseDTO` resuelto. Lint biome limpio en archivos del ticket (errores preexistentes en `src/config/parameters/*` y `custom-module-options` no tocados).
- L7 (12/11): Reporte del usuario: el frontend no encuentra la imagen con driver local — el `avatarUrl` relativo se resuelve contra el origen del frontend, no del API (el archivo se sirve bien: 200 en `:3001/uploads/...`). Fix: `resolveProfilePhotoPublicUrl` pasa a ser driver-aware — con `STORAGE_PUBLIC_URL` configurado, local antepone la base al path servido `/uploads/avatars/<archivo>` y s3 a la key; sin base, local sigue relativo (S5.1 intacto). En dev se espera `STORAGE_PUBLIC_URL=http://localhost:3001`. Valores legacy `/` siguen en passthrough.
- L8 (12/11): Decisión de contrato confirmada con el usuario: el API devuelve la URL completa (con `STORAGE_PUBLIC_URL`); el front no arma paths. Guía de R2 + smoke en `.temp/guia-r2-546.md` (ignorada globalmente).
- L9 (12/11): Simulación local S3 en `docker-compose.yml`: servicios `minio` + `minio-init` bajo profile `storage-s3` (patrón mailpit; `COMPOSE_PROFILES=storage-s3` en el `.env` de la raíz los activa con `make up`). Imagen `cgr.dev/chainguard/minio` (MinIO borró sus imágenes de Docker Hub en 09/2026 y quay.io exige login; Chainguard incluye `mc`, usado para el healthcheck y el init). Smoke OK: bucket creado con permiso `download`, upload S3 OK, lectura anónima 200. Defaults parametrizados por `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`/`S3_BUCKET`.
