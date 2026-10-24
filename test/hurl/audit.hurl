# audit.controller.ts (base /admin/audit-logs) — 1 endpoint.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# --- GET /admin/audit-logs ------------------------------------------------
GET {{baseUrl}}/admin/audit-logs
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.data" isList
jsonpath "$.total" isInteger
jsonpath "$.page" isInteger
jsonpath "$.limit" isInteger

# --- con paginación explícita --------------------------------------------
GET {{baseUrl}}/admin/audit-logs?page=1&limit=5
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.limit" == 5

# --- negativos ------------------------------------------------------------
GET {{baseUrl}}/admin/audit-logs
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

GET {{baseUrl}}/admin/audit-logs
Authorization: Bearer {{viewerToken}}
HTTP 403
