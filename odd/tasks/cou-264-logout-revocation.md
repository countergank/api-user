# COU-264 — Implementar cierre de sesión y revocación de refresh tokens

- **Feature**: `cou-264-logout-revocation`
- **Issue**: https://linear.app/countergank/issue/COU-264/implementar-cierre-de-sesion-y-revocacion-de-refresh-tokens
- **Base**: `origin/develop` @ `87a5603` — **Rama**: `feat/cou-264-logout-revocation`
- **Estado**: EN PLANIFICACIÓN — decisiones de diseño cerradas (S11, S12, S13), sin código escrito.

## Specs

Requisitos tal como los escribe el ticket (verbatim) más las decisiones del maintainer.

- **S1** — “`POST /auth/logout` (revoca el refresh actual) y `POST /auth/logout-all` (revoca todos
  los del usuario).”
- **S2** — “Almacén de revocación por `jti` en Redis, con TTL alineado a la expiración del token.”
- **S3** — “Rechazar el canje de refresh tokens revocados.”
- **S4** — “Revocar sesiones al cambiar la contraseña o el email.”
- **S5** — “**Fuera de alcance**: migrar a refresh tokens opacos; se mantiene el JWT con `jti`.”
- **S6** — “`POST /auth/logout` revoca el refresh usado.”
- **S7** — “Un refresh revocado responde 401 y el cliente debe ir a login.”
- **S8** — “`POST /auth/logout-all` revoca todas las sesiones del usuario.”
- **S9** — “Cambiar la contraseña revoca todas las sesiones activas.”
- **S10** — “Test e2e del canje de un refresh revocado.”
- **S11** — Decisión (maintainer, selección en UI): con Redis no disponible el canje es
  **fail-closed** — “Si el store no responde, el canje de refresh devuelve 401 y el usuario va a
  login. El login no escribe nada (denylist), así que sigue funcionando. Seguridad por encima de
  disponibilidad.”
- **S12** — Decisión (maintainer, selección en UI): `POST /auth/logout` recibe el refresh en el
  body y **no lleva guard** — “basta el refresh token en el body. Permite cerrar sesión aunque el
  access token (15m) ya venció.” → `POST /auth/logout { refreshToken }` → `200 { message }`; `401
  INVALID_REFRESH_TOKEN` si el token no verifica.
- **S13** — Decisión (parent, consecuencia de S2/S7): un refresh **sin `jti`** (emitido antes de
  este cambio) se rechaza con `401 INVALID_REFRESH_TOKEN` en el canje y en el logout. Alternativa
  descartada: aceptarlo como `tv=0`, que dejaría tokens no revocables vivos hasta 7 días.
- **S14** — Decisión (parent, post-entrega del writer): `POST /auth/reset-password` **también**
  revoca todas las sesiones. S4 dice “Revocar sesiones al cambiar la contraseña”; un reset cambia
  la contraseña, y sin esto un atacante con un refresh vivo sobrevive al reset que el dueño hace
  justamente para echarlo. El writer lo había dejado fuera de alcance.
- **S15** — Decisión (parent): el `SessionModule` se cablea **explícitamente** (`UserModule` y
  `AuthModule` lo importan) en vez de `@Global()`; la dependencia de seguridad queda visible en el
  grafo de módulos.

## Diseño (para el writer)

- **Store** (`src/session/session-revocation.service.ts`, módulo propio `src/session/session.module.ts`
  que sólo depende de `CacheModule` para que `AuthModule` y `UserModule` lo importen sin ciclo):
  - `revokeJti(jti: string, expSeconds: number)` → `revoked:refresh:<jti>` con TTL = `exp - now`
    (mínimo 1s; si ya expiró, no escribe).
  - `isJtiRevoked(jti: string)` → booleano. **Error de store ⇒ lanza** (S11).
  - `revokeAllForUser(userId: string)` → `INCR revoked:user:<userId>:epoch`, expiración 7d.
  - `getUserEpoch(userId: string)` → número (default 0). **Error de store ⇒ lanza** (S11).
- **Token**: `RefreshTokenPayload extends JwtPayload { jti: string; tv: number }`. `generateAuthResponse`
  firma el refresh con `jwtid: randomUUID()` y `tv = getUserEpoch(user.id)` degradado a `0` si el
  store falla (falla cerrado después: el epoch real invalidará ese token). El access token no cambia.
- **Canje** (`AuthService.refreshToken`): verifica firma → `401` si no hay `jti` (S13) → `isJtiRevoked`
  → `tv < epoch` → emitir. Cualquier error de store ⇒ `DomainError.fromKind('INVALID_REFRESH_TOKEN')`
  (401, S7+S11). No se agrega error kind nuevo.
- **Endpoints** (`AuthController`): `POST /auth/logout` (`@HttpCode(200)`, body `{ refreshToken }`,
  sin guard) y `POST /auth/logout-all` (`JwtAuthGuard`, `@HttpCode(200)`), con `@AuditAction`
  (`auth.logout`, `auth.logout-all`) y mensajes i18n nuevos (`messages.logged_out`,
  `messages.logged_out_all`) en los archivos de idioma existentes.
- **Revocación cruzada** (S4): `UserService.changePassword` y `AuthService.confirmEmailChange` llaman
  `revokeAllForUser(userId)`.
- **Swagger**: factories `ApplyLogoutDoc()` / `ApplyLogoutAllDoc()` en `src/auth/api-docs/auth.decorator.ts`
  con ejemplos en `src/auth/api-docs/examples/`, siguiendo el patrón de `ApplyRefreshDoc()`.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | `SessionModule` + `SessionRevocationService` + unit spec (TTL, fail-closed, idempotencia) | S2, S11 | delegado (writer) | 1 |
| T2 | `jti`/`tv` en el refresh y rechazo en el canje | S3, S7, S13 | delegado (writer) | 1 |
| T3 | `POST /auth/logout` y `POST /auth/logout-all` + Swagger + i18n + e2e | S1, S6, S8, S10, S12 | delegado (writer) | 1 |
| T4 | Revocación en cambio de password y de email + tests | S4, S9 | delegado (writer) | 1 |
| T4b | `resetPassword` revoca todas las sesiones (RED→GREEN, `auth.service.spec.ts`) | S14 | inline (parent) | 1 |
| T4c | Cableado explícito de `SessionModule` (`UserModule` + `AuthModule`), mudanza del spec de
      wiring a `src/user/service/` | S15 | inline (parent) | 1 |
| T5 | Verificación: tsc, biome focalizado, suite unit, e2e; review nativo | todas | inline (parent) | — |

## Log

- **L1** (usuario, verbatim): “acordate que todo lo encaramos con odd”. Refuerza el workflow ODD
  para esta feature.
- **Antecedente** (usuario, verbatim): “vamos con el recomendado” — elige COU-264 entre los
  pendientes de Linear, sobre la recomendación del orquestador.
- **L2** (usuario, selección en UI, sin texto libre): “Fail-closed (recomendado)” para S11.
- **L3** (usuario, selección en UI, sin texto libre): “Body con refreshToken, sin guard
  (recomendado)” para S12.
- **Evidencia T4b** (observada por el parent): RED con `npx jest src/auth/auth.service.spec.ts -t
  "S14"` → `Expected: undefined` (revokeAllForUser no llamado) con el código del writer; GREEN tras
  agregar la revocación en `resetPassword`: 4 suites / 77 tests PASS, `tsc` exit 0.
