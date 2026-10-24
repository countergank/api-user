# permission.controller.ts (base /permissions) — 1 endpoint: GET /permissions.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# --- GET /permissions -----------------------------------------------------
GET {{baseUrl}}/permissions
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.permissions" isList
jsonpath "$.permissions[0].name" isString
jsonpath "$.permissions[0].category" isString

# --- negativos ------------------------------------------------------------
GET {{baseUrl}}/permissions
HTTP 401

GET {{baseUrl}}/permissions
Authorization: Bearer token-invalido
HTTP 401
