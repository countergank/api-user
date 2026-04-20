# auth-login Specification

## Overview

Autenticación de usuarios usando JWT. Login, registro, recuperación de contraseña y refresh token.

## Requirements

### F01 - User Registration
- Endpoint: POST /auth/register
- Body: { email, userName, password, name, lastName }
- Response: { user, accessToken }
- MUST validate email format
- MUST validate password strength (min 8 chars)
- MUST return 409 if email or username exists

### F02 - User Login
- Endpoint: POST /auth/login
- Body: { email, password }
- Response: { user, accessToken, refreshToken }
- MUST return 401 if credentials invalid

### F03 - Forgot Password
- Endpoint: POST /auth/forgot-password
- Body: { email }
- Response: { message }
- MUST generate reset token
- MUST send email with reset link

### F04 - Reset Password
- Endpoint: POST /auth/reset-password
- Body: { token, newPassword }
- Response: { message }
- MUST validate token expiration (24h)
- MUST return 400 if token invalid/expired

### F05 - Refresh Token
- Endpoint: POST /auth/refresh
- Headers: Authorization: Bearer {refreshToken}
- Response: { accessToken, refreshToken }
- MUST rotate refresh token
- MUST return 401 if token invalid/expired

## Acceptance Criteria

- [ ] Registro crea usuario y retorna JWT
- [ ] Login valida credenciales
- [ ] Forgot password genera token
- [ ] Reset password cambia contraseña
- [ ] Refresh token rota tokens