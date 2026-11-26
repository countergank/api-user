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
| T1 | S1-S4 | inline: entity fields + AES-256-GCM cipher + TwoFactorService (enroll/activate) | |
| T2 | S1, S3 | inline: `/auth/2fa` controller + DTOs + Swagger docs | |
| T3 | S6 | inline: unit specs (service) | |
| T4 | S6 | inline: e2e specs (enroll → activate, budget exhausted, secret no expuesto) | |
| T5 | S6 | inline: suite completa + lint + build | |

Suite final (2026-11-05): unit 1187/1187 (incluye fix del error-kind.spec que pinneaba el registro en 34 kinds; ahora 36 con los dos de #566) · e2e 374/374 · lint sin diagnósticos nuevos · build limpio.

## Log

L1 (2026-11-05, usuario): «vamos» — acepta arrancar el issue #566 (Añadir enrolamiento TOTP con secreto cifrado) tras la creación de tickets #566-#571.
L2 (2026-11-05): kickoff completo — board #566 → In Progress, estimate 3, assignee leandrojaviercepeda, rama `feature/566-totp-enrollment` desde `origin/develop`.
L3 (2026-11-05): decisión — se instala `otplib` (RFC 6238 TOTP, CSPRNG); el cifrado usa AES-256-GCM con clave derivada por scrypt del `ENCRYPTION_PASSWORD` ya requerido en `env.validation.ts` (hoy sin uso). Budget de activación: 5 intentos, igual que la familia email-change-code.
L4 (2026-11-05, incidente de tooling): `pnpm add otplib` re-resolvió node_modules (el repo no commitea lock de pnpm; CI usa `npm ci` con package-lock) y rompió tsc/e2e con un error de tipos en `user-profile.controller.ts` ajeno al feature. Resolución: reinstall con npm (`npm install`), que además agrega `otplib` al package-lock.json requerido por CI.
L5 (2026-11-05): otplib v13 es ESM-first (`@scure/base` y `@noble/hashes` sin build CJS) y Jest 29 + ts-jest no logra transformarlos (transformIgnorePatterns + allowJs probados y revertidos). Decisión: downgraded a `otplib@^12.0.1` (CJS puro) + `@otplib/core@12.0.1` explícito. El servicio usa `authenticator.clone({ window: 1 })` para tolerancia de ±1 step sin mutar el singleton global.
L6 (2026-11-05): bug propio detectado por los specs — condición invertida en `activate` (habilitaba con código inválido); corregido. T1-T3 verdes: 12 unit tests. T4 verde: 7 e2e tests (enroll auth/URL, activate válido/inválido, budget purgado, no exposición en /auth/me). Lint: sin diagnósticos nuevos (estado preexistente idéntico a develop). Build: compila limpio (dist/ local es root-owned, ajeno al cambio; verificado con outDir temporal).
