# email-template.controller.ts (base /email/templates) — 5 endpoints.
# Crea una plantilla temporal, la lee, la modifica y la borra: nunca toca las reales.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# --- GET /email/templates -------------------------------------------------
GET {{baseUrl}}/email/templates
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.data" isList
jsonpath "$.total" isInteger
jsonpath "$.page" == 1

# --- POST /email/templates ------------------------------------------------
POST {{baseUrl}}/email/templates
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "name": "Plantilla temporal Hurl",
  "slug": "hurl-template-temp",
  "subject": "Asunto temporal de la suite Hurl",
  "content": "<p>Hola, plantilla de prueba de la suite Hurl.</p>",
  "variables": ["userName"]
}
HTTP 201
[Captures]
tempSlug: jsonpath "$.slug"
[Asserts]
jsonpath "$.name" == "Plantilla temporal Hurl"

# --- GET /email/templates/:slug -------------------------------------------
GET {{baseUrl}}/email/templates/{{tempSlug}}
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$.slug" == "hurl-template-temp"

# --- PATCH /email/templates/:slug -----------------------------------------
PATCH {{baseUrl}}/email/templates/{{tempSlug}}
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "subject": "Asunto actualizado por la suite Hurl"
}
HTTP 200

# --- DELETE /email/templates/:slug ----------------------------------------
DELETE {{baseUrl}}/email/templates/{{tempSlug}}
Authorization: Bearer {{token}}
HTTP 204

# --- negativos ------------------------------------------------------------
GET {{baseUrl}}/email/templates
HTTP 401

GET {{baseUrl}}/email/templates/hurl-template-temp
Authorization: Bearer {{token}}
HTTP 404
