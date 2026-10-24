# email.controller.ts (base /email) — 2 endpoints.
# Los correos van a Mailpit (EMAIL_HOST=127.0.0.1): no salen a internet.

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# --- POST /email/send (por plantilla/slug) --------------------------------
POST {{baseUrl}}/email/send
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "useCase": "welcome",
  "to": "{{flowEmail}}",
  "variables": { "userName": "Hurl" }
}
HTTP 201

# --- POST /email/send-direct (HTML directo) -------------------------------
POST {{baseUrl}}/email/send-direct
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "to": "{{flowEmail}}",
  "subject": "Correo directo de la suite Hurl",
  "html": "<p>Enviado por hurl desde email.hurl</p>"
}
HTTP 201

# --- negativos ------------------------------------------------------------
POST {{baseUrl}}/email/send
Content-Type: application/json
{
  "useCase": "welcome",
  "to": "{{flowEmail}}"
}
HTTP 401
