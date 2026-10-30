# role.controller.ts (base /roles) — 5 endpoints.
# Crea un rol temporal, lo modifica, le asigna permisos y lo borra: re-ejecutable.
#
# Si el POST devuelve 409 "El nombre ya existe" con el rol ausente en la base, es una caché de
# RBAC del proceso: reiniciá la API y volvé a correr (visto el 2026-10-23).

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# --- GET /roles -----------------------------------------------------------
GET {{baseUrl}}/roles
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.data" isList
jsonpath "$.total" isInteger

# --- GET /permissions (insumo para asignar un permiso real) ---------------
GET {{baseUrl}}/permissions
Authorization: Bearer {{token}}
HTTP 200
[Captures]
firstPermissionName: jsonpath "$.data[0].name"
[Asserts]
jsonpath "$.data" isList

# --- POST /roles ----------------------------------------------------------
POST {{baseUrl}}/roles
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "name": "hurl-role-temp",
  "description": "rol temporal de la suite Hurl",
  "permissionIds": []
}
HTTP 201
[Captures]
roleId: jsonpath "$.role._id"
[Asserts]
jsonpath "$.role.name" == "hurl-role-temp"

# --- PATCH /roles/:id -----------------------------------------------------
PATCH {{baseUrl}}/roles/{{roleId}}
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "description": "descripcion actualizada por la suite Hurl"
}
HTTP 200

# --- PUT /roles/:id/permissions -------------------------------------------
PUT {{baseUrl}}/roles/{{roleId}}/permissions
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "permissionIds": ["{{firstPermissionName}}"]
}
HTTP 200

# --- GET /roles (el rol temporal aparece) ---------------------------------
# limit=100: el rol recién creado puede quedar fuera de la página por defecto (20).
GET {{baseUrl}}/roles?limit=100
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.data[?(@.name=='hurl-role-temp')]" exists

# --- DELETE /roles/:id ----------------------------------------------------
DELETE {{baseUrl}}/roles/{{roleId}}
Authorization: Bearer {{token}}
HTTP 200

# --- negativos ------------------------------------------------------------
GET {{baseUrl}}/roles
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

GET {{baseUrl}}/roles
Authorization: Bearer {{viewerToken}}
HTTP 403
