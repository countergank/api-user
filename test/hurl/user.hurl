# user.controller.ts (admin/users) — todos sus endpoints.
# Sin capturas cruzadas entre archivos: cada bloque resuelve su propio estado.


# ======================================================================
# 21 — GET /admin/users (admin, user:read): lista y envelope paginado.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

# Sin `page` la respuesta YA es el envelope: el ValidationPipe instancia el DTO de paginación
# y aplica su default `page=1`, así que la rama "array plano" es inalcanzable por HTTP (COU-260).
GET {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.data" isList
jsonpath "$.data[0].email" isString

# Con `page` la respuesta es el envelope paginado.
GET {{baseUrl}}/admin/users?page=1&limit=2
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.data" isList
jsonpath "$.page" == 1
jsonpath "$.limit" == 2
jsonpath "$.total" isInteger

# Negativo: usuario sin rol admin → 403 FORBIDDEN.
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{viewerEmail}}",
  "password": "{{flowPassword}}"
}
HTTP 200
[Captures]
viewerToken: jsonpath "$.accessToken"

GET {{baseUrl}}/admin/users
Authorization: Bearer {{viewerToken}}
HTTP 403
[Asserts]
jsonpath "$.code" == "UA-SEC-002"


# ======================================================================
# 22 — POST /admin/users (admin, user:create): crea un usuario temporal y lo borra.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

POST {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Endpoint",
  "email": "hurl-ep-create@test.com",
  "userName": "hurl-ep-create",
  "password": "HurlCreate1@"
}
HTTP 201
[Asserts]
jsonpath "$.email" == "hurl-ep-create@test.com"
jsonpath "$.role" == "user"
jsonpath "$.isActive" == true

# Negativo: email duplicado → 409.
POST {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Duplicado",
  "email": "hurl-ep-create@test.com",
  "userName": "hurl-ep-create-dup",
  "password": "HurlCreate1@"
}
HTTP 409

# Negativo: usuario sin rol admin → 403 FORBIDDEN.
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{viewerEmail}}",
  "password": "{{flowPassword}}"
}
HTTP 200
[Captures]
viewerToken: jsonpath "$.accessToken"

POST {{baseUrl}}/admin/users
Authorization: Bearer {{viewerToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Viewer",
  "email": "hurl-ep-viewer-create@test.com",
  "userName": "hurl-ep-viewer-create",
  "password": "HurlCreate1@"
}
HTTP 403
[Asserts]
jsonpath "$.code" == "UA-SEC-002"

# Limpieza: el usuario temporal se busca por login propio y se borra.
POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "hurl-ep-create@test.com",
  "password": "HurlCreate1@"
}
HTTP 200
[Captures]
tempToken: jsonpath "$.accessToken"

GET {{baseUrl}}/auth/me
Authorization: Bearer {{tempToken}}
HTTP 200
[Captures]
tempUserId: jsonpath "$.id"

DELETE {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{tempUserId}}"


# ======================================================================
# 23 — GET /admin/users/:id (admin, user:read): detalle de un usuario.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

# Usuario temporal como sujeto de la lectura.
POST {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "ById",
  "email": "hurl-ep-byid@test.com",
  "userName": "hurl-ep-byid",
  "password": "HurlById1@"
}
HTTP 201

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "hurl-ep-byid@test.com",
  "password": "HurlById1@"
}
HTTP 200
[Captures]
tempToken: jsonpath "$.accessToken"

GET {{baseUrl}}/auth/me
Authorization: Bearer {{tempToken}}
HTTP 200
[Captures]
tempUserId: jsonpath "$.id"

GET {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{tempUserId}}"
jsonpath "$.email" == "hurl-ep-byid@test.com"
jsonpath "$.failedLoginAttempts" isInteger

# Negativo: id inexistente → 404.
GET {{baseUrl}}/admin/users/000000000000000000000000
Authorization: Bearer {{adminToken}}
HTTP 404

# Negativo: usuario sin rol admin → 403 FORBIDDEN.
GET {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{tempToken}}
HTTP 403
[Asserts]
jsonpath "$.code" == "UA-SEC-002"

# Limpieza.
DELETE {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{tempUserId}}"


# ======================================================================
# 24 — PATCH /admin/users/:id (admin, user:update): actualiza un usuario temporal.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

POST {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Update",
  "email": "hurl-ep-update@test.com",
  "userName": "hurl-ep-update",
  "password": "HurlUpdate1@"
}
HTTP 201

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "hurl-ep-update@test.com",
  "password": "HurlUpdate1@"
}
HTTP 200
[Captures]
tempToken: jsonpath "$.accessToken"

GET {{baseUrl}}/auth/me
Authorization: Bearer {{tempToken}}
HTTP 200
[Captures]
tempUserId: jsonpath "$.id"

PATCH {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl Actualizado"
}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{tempUserId}}"
jsonpath "$.name" == "Hurl Actualizado"

# Negativo: rol inexistente en el catálogo → 400.
PATCH {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "role": "superadmin"
}
HTTP 400

# Negativo: usuario sin rol admin → 403 FORBIDDEN.
PATCH {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{tempToken}}
Content-Type: application/json
{
  "name": "Autoedicion"
}
HTTP 403
[Asserts]
jsonpath "$.code" == "UA-SEC-002"

# Limpieza.
DELETE {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{tempUserId}}"


# ======================================================================
# 25 — PATCH /admin/users/:id/active (admin, user:update): toggle de isActive.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

POST {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Toggle",
  "email": "hurl-ep-toggle@test.com",
  "userName": "hurl-ep-toggle",
  "password": "Xk7#mQ2w!"
}
HTTP 201

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "hurl-ep-toggle@test.com",
  "password": "Xk7#mQ2w!"
}
HTTP 200
[Captures]
tempToken: jsonpath "$.accessToken"

GET {{baseUrl}}/auth/me
Authorization: Bearer {{tempToken}}
HTTP 200
[Captures]
tempUserId: jsonpath "$.id"

# El usuario se crea activo: el primer toggle lo desactiva.
PATCH {{baseUrl}}/admin/users/{{tempUserId}}/active
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.id" == "{{tempUserId}}"
jsonpath "$.isActive" == false

# El segundo lo reactiva (y la limpieza puede borrarlo igual).
PATCH {{baseUrl}}/admin/users/{{tempUserId}}/active
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.isActive" == true

# Negativo: usuario sin rol admin → 403 FORBIDDEN.
PATCH {{baseUrl}}/admin/users/{{tempUserId}}/active
Authorization: Bearer {{tempToken}}
HTTP 403
[Asserts]
jsonpath "$.code" == "UA-SEC-002"

# Limpieza.
DELETE {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{tempUserId}}"


# ======================================================================
# 26 — PATCH /admin/users/:id/unlock (admin, user:unlock): desbloquea la cuenta.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

POST {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Unlock",
  "email": "hurl-ep-unlock@test.com",
  "userName": "hurl-ep-unlock",
  "password": "HurlUnlock1@"
}
HTTP 201

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "hurl-ep-unlock@test.com",
  "password": "HurlUnlock1@"
}
HTTP 200
[Captures]
tempToken: jsonpath "$.accessToken"

GET {{baseUrl}}/auth/me
Authorization: Bearer {{tempToken}}
HTTP 200
[Captures]
tempUserId: jsonpath "$.id"

# Unlock sobre una cuenta no bloqueada: la operación es idempotente y responde 200.
PATCH {{baseUrl}}/admin/users/{{tempUserId}}/unlock
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{tempUserId}}"
jsonpath "$.message" isString

# Negativo: usuario sin rol admin → 403 FORBIDDEN.
PATCH {{baseUrl}}/admin/users/{{tempUserId}}/unlock
Authorization: Bearer {{tempToken}}
HTTP 403
[Asserts]
jsonpath "$.code" == "UA-SEC-002"

# Limpieza.
DELETE {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{tempUserId}}"


# ======================================================================
# 27 — DELETE /admin/users/:id (admin, user:delete): borra un usuario temporal.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
adminToken: jsonpath "$.accessToken"

POST {{baseUrl}}/admin/users
Authorization: Bearer {{adminToken}}
Content-Type: application/json
{
  "name": "Hurl",
  "lastName": "Delete",
  "email": "hurl-ep-delete@test.com",
  "userName": "hurl-ep-delete",
  "password": "HurlDelete1@"
}
HTTP 201

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "hurl-ep-delete@test.com",
  "password": "HurlDelete1@"
}
HTTP 200
[Captures]
tempToken: jsonpath "$.accessToken"

GET {{baseUrl}}/auth/me
Authorization: Bearer {{tempToken}}
HTTP 200
[Captures]
tempUserId: jsonpath "$.id"

# Negativo: usuario sin rol admin → 403 FORBIDDEN.
DELETE {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{tempToken}}
HTTP 403
[Asserts]
jsonpath "$.code" == "UA-SEC-002"

DELETE {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.userId" == "{{tempUserId}}"
jsonpath "$.message" isString

# El borrado es lógico: el documento sigue existiendo, inactivo (no hay 404).
GET {{baseUrl}}/admin/users/{{tempUserId}}
Authorization: Bearer {{adminToken}}
HTTP 200
[Asserts]
jsonpath "$.isActive" == false
