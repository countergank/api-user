# user-profile.controller.ts — todos sus endpoints.
# Sin capturas cruzadas entre archivos: cada bloque resuelve su propio estado.


# ======================================================================
# 16 — GET /users/profile (JWT): perfil del usuario autenticado.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{flowEmail}}",
  "password": "{{flowPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

GET {{baseUrl}}/users/profile
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.email" == "{{flowEmail}}"
jsonpath "$.name" isString
jsonpath "$.lastName" isString

# Negativo: sin token → 401 INVALID_TOKEN.
GET {{baseUrl}}/users/profile
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-SEC-001"


# ======================================================================
# 17 — PATCH /users/profile (JWT): actualiza y restaura name/lastName.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{flowEmail}}",
  "password": "{{flowPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# Cambio temporal del nombre.
PATCH {{baseUrl}}/users/profile
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "name": "Hurl Endpoint",
  "lastName": "Temporal"
}
HTTP 200
[Asserts]
jsonpath "$.name" == "Hurl Endpoint"
jsonpath "$.email" == "{{flowEmail}}"

# Restauración de los valores sembrados por el fixture.
PATCH {{baseUrl}}/users/profile
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Fixture"
}
HTTP 200
[Asserts]
jsonpath "$.name" == "Hurl"
jsonpath "$.lastName" == "Fixture"

# Negativo: sin token → 401 INVALID_TOKEN.
PATCH {{baseUrl}}/users/profile
Content-Type: application/json
{
  "name": "Nadie"
}
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-SEC-001"


# ======================================================================
# 18 — POST /users/change-password (JWT): cambia y restaura la contraseña.
#
# No se toca la contraseña de los usuarios fixture: el admin crea un usuario
# temporal, se le cambia la contraseña, se verifica el login nuevo y se borra.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

# Usuario temporal para la prueba.
POST {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Password",
  "email": "hurl-ep-password@test.com",
  "userName": "hurl-ep-password",
  "password": "Xk7#mQ2w!"
}
HTTP 201
[Asserts]
jsonpath "$.email" == "hurl-ep-password@test.com"
jsonpath "$.role" == "user"

# Login inicial del usuario temporal.
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "hurl-ep-password@test.com",
  "password": "Xk7#mQ2w!"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# El propio usuario temporal conoce su id por /auth/me.
GET {{baseUrl}}/auth/me
Authorization: Bearer {{token}}
HTTP 200
[Captures]
tempUserId: jsonpath "$.id"

# Cambio de contraseña.
POST {{baseUrl}}/users/change-password
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "currentPassword": "Xk7#mQ2w!",
  "newPassword": "Zq4$nR8t!"
}
HTTP 200
[Asserts]
jsonpath "$.message" isString

# El login con la contraseña nueva funciona.
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "hurl-ep-password@test.com",
  "password": "Zq4$nR8t!"
}
HTTP 200

# Negativo: contraseña actual incorrecta → 400 UA-USR-003.
POST {{baseUrl}}/users/change-password
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "currentPassword": "WrongPass1@",
  "newPassword": "Xk7#mQ2w!"
}
HTTP 400
[Asserts]
jsonpath "$.code" == "UA-USR-003"

# Limpieza: borrado del usuario temporal.
DELETE {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{tempUserId}}"


# ======================================================================
# 19 — POST /users/change-email/code (JWT): envía el código al email actual.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{flowEmail}}",
  "password": "{{flowPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

POST {{baseUrl}}/users/change-email/code
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.message" isString

# Negativo: sin token → 401 INVALID_TOKEN.
POST {{baseUrl}}/users/change-email/code
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-SEC-001"


# ======================================================================
# 20 — POST /users/change-email (JWT): inicia el cambio de email.
#
# El endpoint exige el código de 6 dígitos enviado al email actual (S10). Con
# un código erróneo el servicio falla como 401 INVALID_EMAIL_CHANGE_CODE, a
# propósito igual que un código expirado o gastado (no filtra información).

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{flowEmail}}",
  "password": "{{flowPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

POST {{baseUrl}}/users/change-email
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "email": "{{newEmail}}",
  "code": "000000"
}
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-AUTH-010"

# Negativo: sin token → 401 INVALID_TOKEN.
POST {{baseUrl}}/users/change-email
Content-Type: application/json
{
  "email": "{{newEmail}}",
  "code": "000000"
}
HTTP 401
[Asserts]
jsonpath "$.code" == "UA-SEC-001"
