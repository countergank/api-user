# Feature: Login challenge de segundo factor (#567)

Issue: https://github.com/countergank/api-user/issues/567
Branch: `feature/567-split-login-challenge` (base `origin/develop`)

## Specs

S1. Login con contraseña válida + `twoFactorEnabled` → respuesta de challenge pendiente con identificador de vida corta, **sin** access/refresh tokens.
S2. Mientras el challenge está pendiente no existe sesión activa registrada en el store de sesiones.
S3. `POST /auth/2fa/challenge` con código TOTP válido → emite `AuthResponse` (access + refresh) y registra la sesión activa igual que el login actual.
S4. Código inválido → no emite tokens, con budget de intentos y rate limit propio; agotado el budget, el challenge muere y hay que re-autenticarse con contraseña.
S5. Login de usuario sin 2FA sigue devolviendo `AuthResponse` directo (compatibilidad total con el contrato actual).
S6. Lockout por intentos fallidos, `sessionEpoch` y revocación de refresh tokens siguen aplicando igual que hoy.
S7. Swagger documentado y e2e de ambos caminos (con y sin 2FA).

No-objetivos: códigos de recuperación y OTP por email como alternativas del challenge (#568, #569); enrolamiento TOTP (#566, done).

## Tasks

| ID | Spec | Route | Commit |
|----|------|-------|--------|
| T1 | S1, S2, S4 | worker: challenge store (Redis, token hasheado, TTL, budget) + TwoFactorService startChallenge/verifyChallenge | pending |
| T2 | S1, S3, S5 | worker: split de AuthService.login + POST /auth/2fa/challenge + DTO + Swagger | pending |
| T3 | S7 | worker: unit specs | pending |
| T4 | S7 | worker: e2e specs (ambos caminos, budget agotado, challenge expirado) | pending |
| T5 | S7 | parent: suite completa + lint + build + cierre | |

## Log

L1 (2026-11-27, usuario): «meergeado! vamos de nuevo con kickoff» — cierra #566 (merge de PR #572) y arranca el siguiente ticket por continuidad: #567.
L2 (2026-11-27): kickoff — board #567 → In Progress, rama `feature/567-split-login-challenge` desde `origin/develop`, árbol limpio.
L3 (2026-11-27): decisión de diseño — el challenge pendiente vive en Redis (`CacheService`): token CSPRNG entregado al cliente, solo su sha256 como clave (`2fa:challenge:{hash}` → userId), TTL 5 min, budget de 5 intentos en la misma clave. Patrón espejo del jti denylist de `session-revocation.service.ts`. Ventaja: stateless respecto del documento User, expiry automática sin cron, y el token no es enumerable ni reproducible por el cliente.
L4 (2026-11-27): implementación worker T1-T4 — `TwoFactorChallengeService` (src/auth/two-factor/totp-challenge.ts): token CSPRNG (`randomBytes(32)` base64url) entregado una sola vez, clave `2fa:challenge:{sha256}` vía CacheService con TTL 5 min y budget de 5 intentos (código errado → countdown persistido; budget agotado o token desconocido/expirado/factor deshabilitado → clave borrada y nuevo kind `INVALID_TWO_FACTOR_CHALLENGE` UA-AUTH-014 401; secreto indescifrable → TWO_FACTOR_NOT_ENROLLED). `AuthService.login` bifurca con `twoFactorEnabled` → `{ twoFactorRequired, challengeToken }` sin tokens ni registro de sesión (S1/S2; contrato sin 2FA byte-idéntico, S5); nuevo `completeTwoFactorChallenge` reusa `generateAuthResponse` (S3; sessionEpoch y revocación intactos, S6). `POST /auth/2fa/challenge` público en AuthController con DTO propio y throttle propio (`TWO_FACTOR_CHALLENGE_THROTTLE_LIMIT`/`TTL`, default 10/60 s) siguiendo el patrón DynamicThrottlerGuard + parameter-definitions (S4). Swagger: login con `oneOf` (tokens | challenge) y endpoint documentado (S7). Tests: unit 168/168 (`npx jest --testPathPattern "two-factor|auth.service|auth.controller|error-kind" --forceExit`; +18: 9 totp-challenge, 4 auth.service, 4 auth.controller, 1 error-kind) · e2e 14/14 (`npx jest --config ./test/jest-e2e.json --forceExit two-factor`; +6: challenge S1/S2, intercambio S3 con /auth/me, código malformado 400, token desconocido UA-AUTH-014, budget agotado S4, login directo sin 2FA S5) · specs del throttle/registry tocados: 24/24. Desviaciones mínimas de superficie (necesarias, reportadas al parent): `auth.module.ts` (provider), `api-docs/auth.decorator.ts` + `login.examples.ts` (docs de la variante del login), `config/throttle/dynamic-throttler.guard.ts` + `config/parameters/parameter-definitions.ts` + sus 2 specs (rate limit propio S4).
