# admin-permission.controller.ts (base /admin/permissions) — 2 endpoints: POST y PATCH.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# --- POST /admin/permissions ----------------------------------------------
# El nombre fijo `hurl-perm-temp` lo purga el seed de fixtures antes de cada
# corrida; sin DELETE por API, la re-ejecutabilidad vive en esa purga.
POST {{baseUrl}}/admin/permissions
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "name": "hurl-perm-temp",
  "description": "Permiso temporal de la suite hurl",
  "category": "user"
}
HTTP 201
[Captures]
permissionId: jsonpath "$.permission._id"
[Asserts]
jsonpath "$.permission.name" == "hurl-perm-temp"
jsonpath "$.permission.category" == "user"
jsonpath "$.permission.isActive" == true

# --- POST duplicado: mismo name responde 409 ------------------------------
POST {{baseUrl}}/admin/permissions
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "name": "hurl-perm-temp",
  "category": "user"
}
HTTP 409

# --- PATCH /admin/permissions/:id -----------------------------------------
PATCH {{baseUrl}}/admin/permissions/{{permissionId}}
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "description": "Descripción rotada",
  "category": "system",
  "isActive": false
}
HTTP 200
[Asserts]
jsonpath "$.permission.description" == "Descripción rotada"
jsonpath "$.permission.category" == "system"
jsonpath "$.permission.isActive" == false

# --- PATCH inexistente: 404 -----------------------------------------------
PATCH {{baseUrl}}/admin/permissions/000000000000000000000001
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "isActive": false
}
HTTP 404

# --- negativos ------------------------------------------------------------
POST {{baseUrl}}/admin/permissions
Content-Type: application/json
{
  "name": "hurl-perm-anon",
  "category": "user"
}
HTTP 401

PATCH {{baseUrl}}/admin/permissions/000000000000000000000001
HTTP 401

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{viewerEmail}}",
  "password": "{{flowPassword}}"
}
HTTP 200
[Captures]
viewerToken: jsonpath "$.accessToken"

POST {{baseUrl}}/admin/permissions
Authorization: Bearer {{viewerToken}}
Content-Type: application/json
{
  "name": "hurl-perm-viewer",
  "category": "user"
}
HTTP 403
