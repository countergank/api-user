# parameter-admin.controller.ts (base /admin/parameters) — 3 endpoints.
# El PUT se ejerce con el MISMO valor que ya tiene el parámetro: prueba el endpoint sin
# cambiar la configuración en runtime (el valor actual se lee antes, no se asume).

POST {{baseUrl}}/auth/login
Content-Type: application/json
{
  "email": "{{adminEmail}}",
  "password": "{{adminPassword}}"
}
HTTP 200
[Captures]
token: jsonpath "$.accessToken"

# --- GET /admin/parameters ------------------------------------------------
GET {{baseUrl}}/admin/parameters
Authorization: Bearer {{token}}
HTTP 200
[Captures]
currentEmailFrom: jsonpath "$[?(@.key=='EMAIL_FROM')].value"
[Asserts]
jsonpath "$" isList
jsonpath "$[?(@.key=='EMAIL_FROM')].key" exists

# --- GET /admin/parameters/:group ----------------------------------------
GET {{baseUrl}}/admin/parameters/email
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$" isList
jsonpath "$[0].group" == "email"

# --- PUT /admin/parameters/:key (parámetro NO overrideado, mismo valor) ------
# Se lee el valor actual y se reescribe igual: ejercita el endpoint sin cambiar nada.
GET {{baseUrl}}/admin/parameters/throttle
Authorization: Bearer {{token}}
HTTP 200
[Captures]
currentThrottleTtl: jsonpath "$[?(@.key=='THROTTLE_TTL')].value"

PUT {{baseUrl}}/admin/parameters/THROTTLE_TTL
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "value": "{{currentThrottleTtl}}"
}
HTTP 200
[Asserts]
jsonpath "$.key" == "THROTTLE_TTL"

GET {{baseUrl}}/admin/parameters
Authorization: Bearer {{token}}
HTTP 200
[Asserts]
jsonpath "$[?(@.key=='THROTTLE_TTL')].value" == "{{currentThrottleTtl}}"

# Un parámetro sobrescrito por el entorno no se puede cambiar en runtime (409).
PUT {{baseUrl}}/admin/parameters/EMAIL_FROM
Authorization: Bearer {{token}}
Content-Type: application/json
{
  "value": "{{currentEmailFrom}}"
}
HTTP 409
[Asserts]
jsonpath "$.code" == "UA-PAR-002"

# --- negativos ------------------------------------------------------------
GET {{baseUrl}}/admin/parameters
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

GET {{baseUrl}}/admin/parameters
Authorization: Bearer {{viewerToken}}
HTTP 403
