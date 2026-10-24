# auth.controller.ts — todos sus endpoints.
# Sin capturas cruzadas entre archivos: cada bloque resuelve su propio estado.


# ======================================================================
# 04 — POST /auth/register (público): 201 y limpieza del usuario creado.
#
# El registro crea el usuario inactivo con rol `user`. Para que el archivo sea
# re-ejecutable, el admin borra el usuario temporal al final.

# Registro del usuario temporal.
POST {{baseUrl}}/auth/register
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Endpoint",
  "email": "hurl-ep-register@test.com",
  "userName": "hurl-ep-register",
  "password": "HurlEndpoint1@"
}
HTTP 201
[Captures]
registeredUserId: jsonpath "$.user.id"
[Asserts]
jsonpath "$.user.email" == "hurl-ep-register@test.com"
jsonpath "$.accessToken" isString

# Negativo: email ya registrado → 409.
POST {{baseUrl}}/auth/register
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Duplicado",
  "email": "hurl-ep-register@test.com",
  "userName": "hurl-ep-register-dup",
  "password": "HurlEndpoint1@"
}
HTTP 409
[Asserts]
jsonpath "$.code" == "UA-AUTH-001"

# Negativo: contraseña débil → 400. La contraseña es débil a propósito: el caso prueba que la
# política la rechaza, y como la respuesta es 400 no se crea ningún usuario, así que no deja
# residuos ni ensucia la corrida siguiente.
POST {{baseUrl}}/auth/register
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Debil",
  "email": "hurl-ep-debil@test.com",
  "userName": "hurl-ep-debil",
  "password": "abc"
}
HTTP 400

# Limpieza: login admin y borrado del usuario temporal.
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

DELETE {{baseUrl}}/admin/users/{{registeredUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{registeredUserId}}"


# ======================================================================
# 05 — POST /auth/login (público): 200 con accessToken y refreshToken.

# Login válido con el admin sembrado.
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Asserts]
jsonpath "$.accessToken" isString
jsonpath "$.refreshToken" isString
jsonpath "$.user.email" == "{{adminEmail}}"

# Negativo: contraseña incorrecta → 401 INVALID_CREDENTIALS.
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "WrongPass1@"
}
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-AUTH-002"


# ======================================================================
# 06 — GET /auth/me (JWT): datos del usuario autenticado.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

GET {{baseUrl}}/auth/me
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.email" == "{{adminEmail}}"
jsonpath "$.role" == "admin"
jsonpath "$.permissions" isList

# Negativo: sin token → 401 INVALID_TOKEN.
GET {{baseUrl}}/auth/me
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-SEC-001"


# ======================================================================
# 07 — POST /auth/refresh (público): renueva el par de tokens.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
refreshToken: jsonpath "$.refreshToken"

POST {{baseUrl}}/auth/refresh
Content-Type: application/json
{
  "refreshToken": "{{refreshToken}}"
}
HTTP 200
[Asserts]
jsonpath "$.accessToken" isString
jsonpath "$.refreshToken" isString

# Negativo: refresh token inválido → 401 INVALID_REFRESH_TOKEN.
POST {{baseUrl}}/auth/refresh
Content-Type: application/json
{
  "refreshToken": "not-a-real-refresh-token"
}
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-AUTH-009"


# ======================================================================
# 08 — POST /auth/forgot-password (público): siempre 200 (anti-enumeración).

POST {{baseUrl}}/auth/forgot-password
Content-Type: application/json
{
  "email": "{{adminEmail}}"
}
HTTP 200
[Asserts]
jsonpath "$.message" isString

# Email inexistente: misma respuesta para no filtrar existencia de cuentas.
POST {{baseUrl}}/auth/forgot-password
Content-Type: application/json
{
  "email": "hurl-no-existe@test.com"
}
HTTP 200
[Asserts]
jsonpath "$.message" isString


# ======================================================================
# 09 — POST /auth/reset-password (público).
#
# El token real llega por email y se consume una sola vez; acá se afirma el
# contrato del rechazo: token inexistente → 400 EXPIRED_RESET_TOKEN.

POST {{baseUrl}}/auth/reset-password
Content-Type: application/json
{
  "token": "hurl-token-inexistente",
  "newPassword": "NewSecurePass456@"
}
HTTP 400
[Asserts]
jsonpath "$.code" == "UA-AUTH-005"


# ======================================================================
# 10 — POST /auth/verify-email (público).
#
# El token real se consume una sola vez; el contrato observable sin token
# válido es 400 EXPIRED_VERIFICATION_TOKEN.

POST {{baseUrl}}/auth/verify-email
Content-Type: application/json
{
  "token": "hurl-token-inexistente"
}
HTTP 400
[Asserts]
jsonpath "$.code" == "UA-AUTH-006"


# ======================================================================
# 11 — POST /auth/resend-verification (público): siempre 200 (anti-enumeración).

POST {{baseUrl}}/auth/resend-verification
Content-Type: application/json
{
  "email": "{{flowEmail}}"
}
HTTP 200
[Asserts]
jsonpath "$.message" isString

# Email inexistente: misma respuesta para no filtrar existencia de cuentas.
POST {{baseUrl}}/auth/resend-verification
Content-Type: application/json
{
  "email": "hurl-no-existe@test.com"
}
HTTP 200
[Asserts]
jsonpath "$.message" isString


# ======================================================================
# 12 — POST /auth/logout (público): revoca el refresh token enviado.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
refreshToken: jsonpath "$.refreshToken"

POST {{baseUrl}}/auth/logout
Content-Type: application/json
{
  "refreshToken": "{{refreshToken}}"
}
HTTP 200
[Asserts]
jsonpath "$.message" isString

# El token revocado ya no sirve para refrescar → 401.
POST {{baseUrl}}/auth/refresh
Content-Type: application/json
{
  "refreshToken": "{{refreshToken}}"
}
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-AUTH-009"


# ======================================================================
# 13 — POST /auth/logout-all (JWT): revoca todas las sesiones del usuario.
#
# Se corre contra el usuario de flujo (no el admin) para no pisar otras
# sesiones admin que puedan estar vivas. Ese usuario lo garantiza `fixtures/seed-hurl.ts`,
# que además purga los residuos `hurl-*` de corridas anteriores: el flujo depende del
# fixture, no de un estado que este archivo construya.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{flowEmail}}",
  "password": "{{flowPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"
refreshToken: jsonpath "$.refreshToken"

POST {{baseUrl}}/auth/logout-all
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.message" isString

# Negativo: sin token → 401 INVALID_TOKEN.
POST {{baseUrl}}/auth/logout-all
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-SEC-001"

# La sesión revocada ya no refresca → 401.
POST {{baseUrl}}/auth/refresh
Content-Type: application/json
{
  "refreshToken": "{{refreshToken}}"
}
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-AUTH-009"


# ======================================================================
# 14 — POST /auth/confirm-email-change (público).
#
# El token real se consume una sola vez; el contrato observable sin token
# válido es 400 EXPIRED_CONFIRMATION_TOKEN.

POST {{baseUrl}}/auth/confirm-email-change
Content-Type: application/json
{
  "token": "hurl-token-inexistente"
}
HTTP 400
[Asserts]
jsonpath "$.code" == "UA-AUTH-007"


# ======================================================================
# 15 — POST /auth/revert-email-change (público).
#
# Sin JWT a propósito: el token enviado al email anterior es la prueba de
# identidad. Token inexistente → 401 INVALID_TOKEN.

POST {{baseUrl}}/auth/revert-email-change
Content-Type: application/json
{
  "token": "hurl-token-inexistente"
}
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-SEC-001"
