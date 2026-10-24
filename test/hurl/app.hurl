# app.controller.ts — todos sus endpoints.
# Sin capturas cruzadas entre archivos: cada bloque resuelve su propio estado.


# ======================================================================
# 01 — GET /health (público): health check de database y redis.

GET {{baseUrl}}/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
jsonpath "$.details.database.status" == "up"
jsonpath "$.details.redis.status" == "up"


# ======================================================================
# 02 — GET / (público): versión de la API.

GET {{baseUrl}}/
HTTP 200
[Asserts]
jsonpath "$.version" isString
jsonpath "$.version" contains "api-user"


# ======================================================================
# 03 — POST /message-microservice/:message-pattern (público).
#
# Con EXAMPLE_MICROSERVICE_ENABLED=false la ruta no se registra: el contrato observable
# es 404 HTTP_404 (verificado). Si algún día se habilita, este caso cambia a 201 y lo va a marcar.

POST {{baseUrl}}/message-microservice/user-created
Content-Type: application/json
{
  "data": { "userId": "hurl-probe" }
}
HTTP 404
[Asserts]
jsonpath "$.code" == "HTTP_404"
