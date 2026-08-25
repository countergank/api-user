# Spec: Parameter Definitions — Email & Throttle

## Scope
Registrar nuevas definiciones de parámetros en `ParameterRegistry` para cubrir las variables de entorno que migraremos.

## Definitions

### Email Group (group: `email`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `EMAIL_HOST` | `string` | `'smtp'` | SMTP server hostname |
| `EMAIL_PORT` | `number` | `587` | SMTP server port |
| `EMAIL_SECURE` | `boolean` | `false` | Use TLS for SMTP |
| `EMAIL_FROM` | `string` | `'noreply@countergank.com'` | Default from address |
| `RESEND_FROM_EMAIL` | `string` | `'noreply@countergank.com'` | Resend from address |

### Throttle Group (group: `throttle`)

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `THROTTLE_LIMIT` | `number` | `10` | Global rate limit max requests |
| `THROTTLE_TTL` | `number` | `60` | Global rate limit TTL in seconds |
| `LOGIN_THROTTLE_LIMIT` | `number` | `5` | Login endpoint max requests |
| `LOGIN_THROTTLE_TTL` | `number` | `60` | Login endpoint TTL |
| `REGISTER_THROTTLE_LIMIT` | `number` | `3` | Register endpoint max requests |
| `REGISTER_THROTTLE_TTL` | `number` | `60` | Register endpoint TTL |
| `FORGOT_PASSWORD_THROTTLE_LIMIT` | `number` | `3` | Forgot password max requests |
| `FORGOT_PASSWORD_THROTTLE_TTL` | `number` | `300` | Forgot password TTL (5 min) |

## Validation Rules
- All `_PORT` and `_LIMIT` / `_TTL` params: `isInt({ min: 1 })`
- `EMAIL_SECURE`: `isBoolean()`
- `EMAIL_HOST`, `EMAIL_FROM`, `RESEND_FROM_EMAIL`: `isString()` with `minLength: 1`
- Env var override mapping: each key maps to its env var name directly

## Files to modify
- `src/config/parameters/parameter-definitions.ts`
- `src/config/parameters/__tests__/parameter-registry.spec.ts`
