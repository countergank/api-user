# Feature: TOTP enrollment (#566)

Issue: https://github.com/countergank/api-user/issues/566
Branch: `feature/566-totp-enrollment` (base `origin/develop`)

## Specs

S1. `POST /auth/2fa/enroll` (JWT) genera un secreto TOTP aleatorio con CSPRNG (base32) y devuelve la URL `otpauth://` para el QR; el secreto no se vuelve a exponer nunca más.
S2. El secreto se persiste cifrado en el documento de User (AES-256-GCM con clave de entorno) junto con `twoFactorEnabled: false` en estado pendiente.
S3. `POST /auth/2fa/activate` (JWT) valida un código TOTP generado por ese secreto pendiente; correcto → `twoFactorEnabled: true`; incorrecto → rechazo con budget de intentos acotado.
S4. Re-enrolar invalida el secreto pendiente o activo anterior.
S5. El secreto jamás aparece en DTOs de usuario, respuestas de Swagger ni logs.
S6. Swagger documentado y tests unit + e2e del ciclo enroll → activate, incluido el caso de código inválido agotando el budget.

No-objetivos: modificar el login (challenge: #567), códigos de recuperación (#568), OTP por email (#569), DTOs admin ni `/auth/me`.

## Tasks

| ID | Spec | Route | Commit |
|----|------|-------|--------|
| T1 | S1-S4 | inline: entity fields + AES-256-GCM cipher + TwoFactorService (enroll/activate) | 6637e7c |
| T2 | S1, S3 | inline: `/auth/2fa` controller + DTOs + Swagger docs | 6637e7c |
| T3 | S6 | inline: unit specs (service) | 6637e7c |
| T4 | S6 | inline: e2e specs (enroll → activate, budget exhausted, secret no expuesto) | 6637e7c |
| T5 | S6 | inline: suite completa + lint + build | 6637e7c |

Suite final (2026-11-05): unit 1187/1187 (incluye fix del error-kind.spec que pinneaba el registro en 34 kinds; ahora 36 con los dos de #566) · e2e 374/374 · lint sin diagnósticos nuevos · build limpio.
L7 (2026-11-26): entrega en un único commit `6637e7c` (744 líneas authored con tests y locks; límite de slice ~400 registrado como excepción explícita: el feature es una unidad lógica indivisible — entity + cipher + service + controller + specs comparten el ciclo RED→GREEN y partirlo dejaría commits que no compilan ni pasan suite). Pre-commit ejecutó la suite completa en verde.
L9 (2026-11-26): review nativo del commit de fixes `af4fd13` (lineage review-e0ffcd4b03d840c3, tier high): lens review-risk capturado y admitido; lens review-reliability quedó pendiente tras 3 fallos determinísticos de generación del provider (stopReason: length, sin texto). Decisión del usuario (opción 2): dejar el candidate con review parcial y continuar — el trabajo está cubierto por suite completa verde + el review aprobado del candidato padre (`6637e7c`, lineage review-d6e994f2818271c6). El slot de reliability puede completarse más adelante reofreciendo el binding vía STATUS; no se sustituyó ni inventó resultado alguno.
L10 (2026-11-27): verificación manual end-to-end por el usuario — login → enroll → QR renderizado con `qrencode -t UTF8` desde el otpauthUrl → escaneado con app autenticadora real → activate con código TOTP generado por el dispositivo: «¡funciono perfecto!». El ciclo completo del segundo factor queda validado fuera de los tests automatizados. Feature #566 cerrada a nivel ODD; pendiente únicamente el merge del PR #572 por parte del usuario y el cierre del issue/board.

**Estado final**: T1-T5 completos. Commits: `6637e7c` (feature, 744 líneas), `da583c2` (registro ODD), `af4fd13` (fixes post-review, 172 líneas). Verificación: unit 1187/1187 · e2e 374/374 (+8/8 del fix slice) · lint sin diagnósticos nuevos · build limpio · review nativo aprobado (padre) + parcial (fixes, decisión del usuario) · prueba manual con dispositivo real exitosa.

## Log

L1 (2026-11-05, usuario): «vamos» — acepta arrancar el issue #566 (Añadir enrolamiento TOTP con secreto cifrado) tras la creación de tickets #566-#571.
L2 (2026-11-05): kickoff completo — board #566 → In Progress, estimate 3, assignee leandrojaviercepeda, rama `feature/566-totp-enrollment` desde `origin/develop`.
L3 (2026-11-05): decisión — se instala `otplib` (RFC 6238 TOTP, CSPRNG); el cifrado usa AES-256-GCM con clave derivada por scrypt del `ENCRYPTION_PASSWORD` ya requerido en `env.validation.ts` (hoy sin uso). Budget de activación: 5 intentos, igual que la familia email-change-code.
L4 (2026-11-05, incidente de tooling): `pnpm add otplib` re-resolvió node_modules (el repo no commitea lock de pnpm; CI usa `npm ci` con package-lock) y rompió tsc/e2e con un error de tipos en `user-profile.controller.ts` ajeno al feature. Resolución: reinstall con npm (`npm install`), que además agrega `otplib` al package-lock.json requerido por CI.
L5 (2026-11-05): otplib v13 es ESM-first (`@scure/base` y `@noble/hashes` sin build CJS) y Jest 29 + ts-jest no logra transformarlos (transformIgnorePatterns + allowJs probados y revertidos). Decisión: downgraded a `otplib@^12.0.1` (CJS puro) + `@otplib/core@12.0.1` explícito. El servicio usa `authenticator.clone({ window: 1 })` para tolerancia de ±1 step sin mutar el singleton global.
L6 (2026-11-05): bug propio detectado por los specs — condición invertida en `activate` (habilitaba con código inválido); corregido. T1-T3 verdes: 12 unit tests. T4 verde: 7 e2e tests (enroll auth/URL, activate válido/inválido, budget purgado, no exposición en /auth/me). Lint: sin diagnósticos nuevos (estado preexistente idéntico a develop). Build: compila limpio (dist/ local es root-owned, ajeno al cambio; verificado con outDir temporal).
L8 (2026-12-02, post-review): revisión nativa aprobada con hallazgos advisory; el humano autorizó corregirlos. Corregidos: (1) Swagger de activate ahora declara 200 (coincide con @HttpCode(200) y el e2e); (2) un twoFactorSecret indescifrable (p.ej. tras rotar ENCRYPTION_PASSWORD) mapea a TWO_FACTOR_NOT_ENROLLED en vez de 500 (try/catch en torno a decryptTotpSecret); (3) enroll ya no carga el secreto (findById plano, solo chequeo de existencia); (4) escrituras atómicas — el contador de intentos usa un único write $inc (repository.incrementTwoFactorAttempts) y el purgado del budget es un solo write que $unset-ea twoFactorSecret y $set-ea twoFactorEnabled:false/twoFactorAttempts:0 (repository.purgeTwoFactorEnrollment); carrera residual benigna (dos intentos finales concurrentes purgando) documentada en el servicio; (5) el e2e deriva el código errado del válido del momento (nunca '000000' hardcodeado, que podía colisionar con un TOTP real) en el test de código inválido y en el loop del budget; (6) nueva aserción e2e de no-fuga en el detalle admin (GET /admin/users/:id, con seedAdminForE2E — barato). Verificado-seguro (7): el secreto plaintext del enroll NO llega al audit store — AuditInterceptor (HTTP) persiste solo metadatos (método/url/status/duración/ip/user-agent, sin body) y AuditAspectInterceptor persiste solo lo que derivan los hooks del @AuditAction: enroll define getBefore constante, sin getAfter, y getResourceId lee args[0] (params/body, no el resultado); sin cambios en el módulo audit. Omitido (8): upgrade a otplib v13 — ESM-only, incompatible con Jest 29 (ver L5). Verificación: unit 70/70 (`npx jest --testPathPattern "two-factor|error-kind" --forceExit`), e2e 8/8 (`npx jest --config ./test/jest-e2e.json --forceExit two-factor`).
