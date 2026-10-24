# i18n-admin.controller.ts (base /admin/i18n) — 1 endpoint: POST /admin/i18n/reload.
# Recarga las traducciones desde Mongo; es idempotente pero tarda unos segundos.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# --- POST /admin/i18n/reload ---------------------------------------------
POST {{baseUrl}}/admin/i18n/reload
Authorization: Bearer {{token}}
HTTP 201
[Asserts]
jsonpath "$.message" isString

# --- negativos ------------------------------------------------------------
POST {{baseUrl}}/admin/i18n/reload
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

POST {{baseUrl}}/admin/i18n/reload
Authorization: Bearer {{viewerToken}}
HTTP 403
