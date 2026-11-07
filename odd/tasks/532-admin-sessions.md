# Feature 532 — API de sesiones activas con revocación y force-logout admin

Issue: https://github.com/countergank/api-user/issues/532 (Estimate 5, @leandrojaviercepeda).
Rama: `feature/532-sesiones-activas-admin`. Board: In Progress. Estado: implementación completa y verificada; esperando autorización de commits.

## Specs

- **S1**: "`GET /admin/users/:id/sessions` devuelve las sesiones activas del usuario con metadatos (dispositivo, IP, último acceso)."
- **S2**: "Existe un endpoint admin para revocar una sesión individual y el refresh token revocado queda inutilizado en el siguiente refresh."
- **S3**: "Existe un endpoint admin para revocar todas las sesiones de un usuario; los tokens previos fallan con 401."
- **S4**: "Todos los endpoints nuevos quedan protegidos con JWT + permiso apropiado (p. ej. `user:update` o uno dedicado) y quedan documentados en OpenAPI."
- **S5**: "Test: un refresh token revocado individualmente no puede refrescar, pero los demás del mismo usuario siguen funcionando."
- **S6** (decisión del usuario, sesión 2026-11-06): "Invalidación total" — para S3, el access token también queda inválido al instante: `JwtStrategy` valida la versión de sesión (`tv`) contra `sessionEpoch`; sin margen de 15 min.

- **S7** (decisión del usuario tras investigación OWASP ASVS 3.3.3 + cheat sheet, 2026-11-06): rotar en vez de cortar — "Cambio de contraseña revoca las demás sesiones al instante y devuelve tokens frescos (accessToken/refreshToken/sessionId) para la sesión actual. El reset por email sigue matando todo." Evidence: ASVS 3.3.3 (option to terminate OTHER sessions), Session Cheat Sheet (renew on privilege change), GitHub model. Flujos por token (reset-password, confirm/revert email) mantienen kill-all.

- **S8** (decisión del usuario, 2026-11-06): self-service de sesiones — "un administrador si puede listarlas sesiones y revocar las que quiera, pero un usuario no admin no puede? en ese caso hay que permitirlo". El usuario autenticado puede listar SUS sesiones activas y revocar cualquiera de las suyas por id (alineado con ASVS 3.3.3 y el modelo GitHub de sesiones). Rango: `/auth/sessions` (GET) y `/auth/sessions/:sessionId` (DELETE), solo JwtAuthGuard, sin permisos admin.

Hechos base verificados (exploración):
- Redis solo guarda JTIs **revocados** (`revoked:refresh:`): imposible listar sesiones activas sin persistencia nueva (Mongo).
- `refreshToken()` rota el `jti` en cada refresh (`src/auth/auth.service.ts:439-470`): el id de sesión debe ser estable y propio del registro.
- No existe ningún permiso `session:*`; hay que seedearlos (`test/global-setup.js`).
- `JwtStrategy.validate` hoy solo carga el usuario (`src/auth/strategies/jwt.strategy.ts:21-29`).

## Tasks

| ID | Specs | Ruta | Commit |
|----|-------|------|--------|
| T1 | S1,S2,S3 datos | Entidad `active-session` + repositorio + wiring en `src/session/` (userId, sessionId, jti, ip, userAgent, issuedAt, lastAccessAt, expiresAt, revoked) | — |
| T2 | S1,S2,S3 datos | Escritura/rotación/last-access del registro en `generateAuthResponse` y `refreshToken`; ip/user-agent pasados desde los controllers | — |
| T3 | S6 | Validación de `tv` en `JwtStrategy` + claim `tv` en el access token | — |
| T4 | S2,S3 | Servicio de revocación: revocar una (denylist JTI + marca) y revocar todas (bump epoch + revoke registro) | — |
| T5 | S1,S2,S3,S4 | Endpoints admin: list / revoke-one / logout-all bajo `admin/users/:id`, guards + permisos + AuditAction + doc decorators OpenAPI | — |
| T6 | S4 datos | Permisos `session:read`/`session:revoke` en seed + i18n (en/es/pt) + ENDPOINTS/Hurl si aplica | — |
| T7 | S1..S5 | Tests: unit del servicio/estrategia + e2e de flujo completo (listar, revocar una, revocar todas con access+refresh 401) | — |
| T2b | S7 | sid claim + rotateCurrentSession + rotación en POST /users/change-password; e2e user-profile adaptado | — |
| T8 | S8 | Self-service: GET /auth/sessions + DELETE /auth/sessions/:sessionId propio, dto reutilizado, unit + e2e | — |
| T9 | S4 datos | Fix defecto preexistente de auditoría: AuditAspectInterceptor derivaba args de http getArgs (request/response) en vez de los params de la ruta; resourceId = request circular → stack overflow y cero filas (USER_UPDATE nunca persistió). Ahora args = valores de `request.params` + body, y userId/resourceId se coaccionan a string. Pin en audit-aspect.interceptor.spec | — |

## Log

- **L1**: "si vamos con ese" (continuación deisible kickoff: "Re visa kickoff y veamos con que ticket continuar" y el board eligió #532). Spec fuente: cuerpo verbatim de issue #532 (criterios arriba en S1–S5).
- **L3**: Decisión del usuario tras investigación (OWASP ASVS 3.3.3 + cheat sheet + modelo GitHub): "Rotar sesión propia" — verbatim: "Cambio de contraseña revoca las demás sesiones al instante y devuelve tokens frescos (accessToken/refreshToken/sessionId) para la sesión actual. El reset por email sigue matando todo." → S7 (T2b). Evidencia: ASVS 3.3.3, Session Cheat Sheet (renew on privilege change), GitHub sessions doc. Elección técnica del ModuleRef lazy sobre forwardRef triple: evita el ciclo UserModule⇄AuthModule⇄RbacModule.
- **L4**: Verificación independiente (gentle-ai-verify) FALL con 2 blockers y se corrigieron: F1 audit `getAfter` firma 1-arg (500 en runtime), F2 `expiresAt` viaja con cada rotación (denylist TTL cubre vida real del token; registro vencido ya no es irrevocable, sessionId estable preservado), F3 `@HttpCode(200)` en admin logout-all. Adoptado `src/session/session-revocation.guard.spec.ts` (probes P1–P7, 13 tests). Advisory F4 (re-cache pre-bump hasta 300s) registrado, fuera de scope. Suite final: 1010 unit / 99 e2e user / tsc clean.
- **L5**: Nota para ui-user: registro abre una sesión (`device: null`); la UI consume `sessionId` en login/register/refresh y tokens frescos en change-password.
- **L6**: Pulido autorizado por el usuario: dedupe del `sessionContext` repetido en auth/user-profile controllers (nuevo decorador compartido `@SessionContext()` + `SessionContext` base en common/decorators) y barrido de comentarios según `.agents/skills/code-comments` (sin ticket IDs ni refs internas; solo nesting/hidden effect; sin banners).
- **L7**: S8 añadido a este ciclo (self-service de sesiones), decisión del usuario en sesión.
- **L8**: Verificación manual contra servidor HTTP real (createTestApp sobre DB de test aislada, curl): S1–S8 todos verificados en vivo; el listado muestra device/ip por sesión sin jti, revocación individual mata solo esa sesión (401 UA-AUTH-009) y las hermanas siguen refrescando, force-logout invalida access+refresh al instante, viewer 403, change-password retorna tokens frescos con el MISMO sessionId y el access previo muere. Hallazgo en vivo: las filas de audit de los endpoints nuevos no persistían — causa un defecto PREEXISTENTE del AuditAspectInterceptor (getArgs HTTP vs params; USER_UPDATE tenía 0 filas históricas). Corregido (T9) y verificado: filas persisten con rid/uid correctos, 0 fallos del listener.
