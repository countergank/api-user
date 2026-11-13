# 550-pulir-storage-fotos-review

Endurecimiento del módulo de storage de fotos tras el review nativo del #546 (12 hallazgos no bloqueantes). Issue: https://github.com/countergank/api-user/issues/550 — Board: In Progress. Rama: `feature/550-pulir-storage-fotos-review`.

## Specs

Cita verbatim de los criterios de aceptación del ticket:

- S1: "El `delete` local solo borra archivos cuyo basename calza con el patrón `<userId>-<timestamp>.<ext>` (hallazgos 1; test que pruebe el rechazo de basenames ajenos)."
- S2: "El logueo del error del driver sanea el mensaje (sin newlines/control chars) y el motivo real queda visible (hallazgos 2, 7)."
- S3: "El compose de MinIO dev documenta/restringe el binding de puertos para uso local (hallazgo 3)."
- S4: "El tratamiento de URLs legacy en S3 queda definido y documentado en el código (hallazgo 4)."
- S5: "El arranque valida la coherencia driver/config cuando aplique (hallazgo 5)."
- S6: "El resolver valida `STORAGE_PUBLIC_URL` y el formato de key, con comportamiento definido ante valores inesperados (hallazgos 6, 9, 10)."
- S7: "Los deletes fallidos del reemplazo quedan visibles (warn/log) sin convertir el update en error (hallazgos 9, 11)."
- S8: "El spec del factory ya no prueba un valor de driver fuera del enum como válido (hallazgo 8)."
- S9: "Suite completa en verde y cobertura de `src/user/storage` sin bajar de la actual (93.9%)."
- S10 (no-objetivos, verbatim): "Cambiar el contrato del módulo (interfaz, factory, keys `avatar/...`, resolver con `STORAGE_PUBLIC_URL`): se corrigen los casos de borde dentro del diseño actual." / "Migrar a otro proveedor de storage o sumar drivers nuevos." / "UI del frontend." / "Smoke contra R2 real (sigue pendiente de la alta del bucket, fuera de este ticket)."

## Tasks

- T1 (S1) `LocalProfilePhotoStorage.delete`: aceptar solo basenames `<userId>-<timestamp>.<ext>` (keys `avatar/...` y URLs legacy `/uploads/avatars/...`); rechazar/ignorar basenames ajenos. Test de rechazo. — commit: pendiente.
- T2 (S2, S7, hallazgos 7) `UserService.updateProfilePhoto`: saneamiento del mensaje (sin newlines/control chars, truncado), warn en delete best-effort fallido sin convertir el update en error, desambiguación save-vs-cleanup en el log. — commit: pendiente.
- T3 (S3) `docker-compose.yml`: comentarios/restricción de binding local de MinIO. — commit: pendiente.
- T4 (S4) `S3ProfilePhotoStorage.delete`: documentar en el código el tratamiento de URLs legacy (no-op deliberado). — commit: pendiente.
- T5 (S5) `env.validation.ts`/driver: validar coherencia driver/config al arranque cuando aplique. — commit: pendiente.
- T6 (S6) `resolveProfilePhotoPublicUrl`: validar `STORAGE_PUBLIC_URL` (http/https) y formato de key; comportamiento definido ante valores inesperados. — commit: pendiente.
- T7 (S8) `profile-photo-storage.factory.spec.ts`: reemplazar caso `gcs` por prueba del enum real. — commit: pendiente.
- T8 (S9) Suite completa + cobertura en verde. — commit: pendiente.

## Log

- L1 (13/11): «ok vamos con el ticket de los hallazgos» — kickoff de #550: board In Progress, rama desde origin/develop actualizado (f826a39). Los 12 hallazgos del review `review-0865f4e2f3626022` son la fuente; los S# provienen verbatim del ticket.
- L2 (13/11): Decisión de alcance por hallazgo: R3-2/R4-1/R4-2 se resuelven juntos en el resolver (validación de base y key, comportamiento definido: devolver undefined ante valores inesperados es equivalente a 'sin foto' y es el fallo más seguro para el front); R4-4 se cubre con T2 (la ventana save→commit ya borra el objeto nuevo en el catch existente — se verifica y se documenta).
- L3 (13/11): Implementación T1-T7 completada. T1: `AVATAR_BASENAME_PATTERN` compartida en `profile-photo-storage.ts` (`/^[^/]+-\d+\.(?:jpg|png|webp)$/` — dígitos flexibles para no acoplar a la longitud de `Date.now()`), `LocalProfilePhotoStorage.delete` la aplica a keys y URLs legacy (RED→GREEN). T2: `sanitizeLogValue` (flattens control chars + ANSI escapes, cap 200) aplicada a todos los logs del flujo de foto; delete best-effort fallido ahora hace `warn` (S7); catch distingue objeto guardado vs nunca guardado (S2). T3: puertos de MinIO en compose bound a `127.0.0.1`. T4: no-op de URLs legacy en S3 documentado en código (nunca existieron en buckets). T5: `validate()` exige las 5 vars `S3_*` cuando `STORAGE_DRIVER=s3` (fail-fast con mensaje que lista las faltantes). T6: `resolveProfilePhotoPublicUrl` valida key con `isAvatarObjectKey` y base con `isValidPublicBaseUrl` — valores inesperados → undefined (fallback = estado sin foto); base inválida → fallback local. T7: spec del factory prueba el enum real sin caso `gcs` como válido.
- L4 (13/11): Fixture viejo `avatar/u-1-170.png` del spec rompía con el patrón de 13 dígitos → patrón aflojado a `\d+`; test de cross-validation del factory eliminado (contradecía el fail-fast `getOrThrow` del driver S3).
- L5 (13/11): Interrupción Engram (session binding ended tras finalize del 12/11; capture en background fallaba con 'Pi runtime session is closing'). Reanudado en sesión nueva; doc en disco era la fuente. Verify subagent no se usará (sin Risk line declarada a tiempo el 12/11, runtime lo prohíbe agregar solo para entrar): verificación inline con suite + cobertura + tsc + biome.
- L6 (13/11): Review nativo de #550 (linaje review-91d23e4760f295a2, tier medium) APPROVED con receipt quemado; slot reliability rechazado una vez por payload malformado ('unsupported evidence class') y regenerado limpio vía STATUS reoffer (los bytes rechazados nunca se reenviaron). PR #551 abierto, board In Review. 5 hallazgos informativos nuevos: R3-1 (patrón laxo), R3-2 (doble fallo sin log), R3-3 (doc patrón), R4-legacy-orphan (crash a mitad de save), R4-s3-public-url-gap (validación env no cruza base con driver).
- L7 (13/11): «resolvemos todos» — los 5 hallazgos nuevos resueltos en la misma rama: R4-gap = validate() exige STORAGE_PUBLIC_URL con driver s3 y rechaza bases no-http(s) (aplica a ambos drivers); R3-1 = patrón userId endurecido a [A-Za-z0-9_-]+ (ObjectId/uuid/underscore ok, espacios/separadores/puntos rechazados); R3-2 = warn del orphan no borrable en el catch; R3-3 = doc del patrón ampliada; R4-legacy-orphan = cleanup del archivo creado por 'wx' cuando la escritura falla (writer inyectable por constructor para el test). Commit pendiente de autorización; luego nuevo ciclo de review nativo por RRD.
