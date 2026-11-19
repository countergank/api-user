# 557 — Añadir eliminación de foto de perfil en api-user

Feature branch: `feature/557-eliminar-foto-perfil` (base `origin/develop`).
Issue: #557 · estimate 3 · assignee Leandro Javier Cepeda.

## Specs

- S1: "`DELETE /users/profile/photo` borra el archivo del storage y deja `avatarUrl` en `null`."
- S2: "Responde `200` con el perfil actualizado; idempotente si ya no hay foto."
- S3: "La respuesta no expone la key cruda del storage (regla introducida en #548)."
- S4: "Registrado en audit-logs."
- S5: "Documentado en OpenAPI."
- S6 (reporte del usuario en sesión): "luego de hacer un delete de profile photo del usuario y hacer un get a profile me devolvio la url, aparentemente esta cacheado porque despues de cierta cantidad de minutos devolvio sin la imagen como correspondia" — la escritura debe emitir la invalidación de caché de usuario (PERF-12) para que `GET /users/profile` refleje el cambio de inmediato y no al expirar el TTL.
- S7 (no-objetivos): "Eliminación de fotos de otros usuarios por un admin. Historial de fotos anteriores."

## Tasks

- T1 (S1, S2): `UserService.deleteProfilePhoto` — unset del campo `avatarUrl` (estado "sin foto" del documento), borrado best-effort del archivo después de commitear la referencia, no-op idempotente sin foto, `USER_NOT_FOUND` para usuario inexistente. Tests: bloque nuevo en `user.service.spec.ts`.
- T2 (S6): `invalidateUserCache(userId)` tras commitear el cambio de referencia, en `deleteProfilePhoto` y en el `updateProfilePhoto` preexistente (misma causa raíz: ambos escribían por repositorio directo). Tests RED→GREEN que pinean el evento `cache.invalidate.user` en ambos métodos y su ausencia en el no-op idempotente.
- T3 (S1, S2, S3, S4): endpoint `DELETE /users/profile/photo` en `user-profile.controller.ts` con `@AuditAction('user.delete-profile-photo')` (actor desde CLS, patrón de los vecinos de perfil) y respuesta de perfil con `avatarUrl: null` resuelto por el resolver. Tests: bloque nuevo en `user-profile.controller.spec.ts` (respuesta, propagación de errores, metadata de audit).
- T4 (S5): OpenAPI — `ApplyDeleteProfilePhotoDoc` y `DeleteProfilePhotoResponse` (avatarUrl `nullable`). Pin e2e en `swagger-user-response.e2e-spec.ts` sobre el path documentado y el schema.
- T5 (hallazgos advisory del review nativo, aprobado): `invalidateUserCacheSafe` post-commit en ambas escrituras de foto (un emit que falle ya no rompe el request ni dispara el cleanup del archivo commiteado), cleanup del delete fire-and-forget, remoción del hook muerto `getResourceId` del `@AuditAction` (rutas sin params/body lo dejan en undefined; el actor registrado por el interceptor es el usuario afectado), y pins de tests: orden invalidación-después-del-commit + no-emit en fallo, y pasaje por el resolver sin filtrar la key cruda.

Todo el trabajo viaja en el commit único `feat(user): add profile photo deletion endpoint` de esta rama; los fixes del review en el commit `fix(user): harden photo cache invalidation after review`.

## Verificación

- RED observado antes de cada GREEN: método inexistente (TS2551) y eventos de invalidación ausentes.
- Suite unit: 88 suites, 1138 tests, todos en verde (13 tests nuevos).
- e2e de área (`user-profile` + `swagger-user-response`): 23 tests en verde (incluye el pin nuevo del endpoint documentado).
- `tsc --noEmit` limpio; `biome lint` limpio.
- Incidentes de entorno: `nest build` falla con EACCES (`dist/` es del contenedor en ejecución) — verificación de tipos cubierta con `tsc --noEmit --incremental false`; `biome format` tiene drift preexistente en archivos no tocados y no se reformateó.
- Reporte manual del usuario (L2) reproducido por lectura del camino: `AuthService.validateUser` cachea el documento bajo `cache:user:<id>`; sin invalidación, `GET /profile` servía el documento viejo hasta el TTL. Fix cubierto por T2; el contenedor `api-user` sirve el build viejo hasta rebuild.
- Review nativo (RDD, lineage `review-e3d719f045147537`): APPROVED, 3 lentes, presupuesto de corrección sin consumir. 7 hallazgos advisory no bloqueantes corregidos en T5 (RED→GREEN en los 3 tests de comportamiento; los textos completos no quedaron persistidos, la reconstrucción salió de ids + ubicaciones + lectura del código).

## Log

- L1: "go" — autorización de implementación de #557 tras el kickoff (continuidad del arco de foto de perfil: #539 → #546 → #550 → #548).
- L2: "lo probe y luego de hacer un delete de profile photo del usuario y hacer un get a profile me devolvio la url, aparentemente esta cacheado porque despues de cierta cantidad de minutos devolvio sin la imagen como correspondia" — deriva en S6/T2, incluido el fix del upload preexistente.
- L3: "ok vamos con commit push y pr, si hay que actualizar odd hacelo antes no despues del merge y hacelo antes del commit" — este archivo se crea antes del commit único y viaja en él.
- L4: "corregimos todo" — corrección de los 7 hallazgos advisory del review nativo aprobado (T5), con tests RED→GREEN antes del fix.
