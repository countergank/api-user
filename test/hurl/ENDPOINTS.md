# Endpoints cubiertos por la suite Hurl

Un archivo por controller. Cada archivo es autocontenido (hace su propio login) y re-ejecutable:
lo que crea lo borra, y lo que muta lo restaura. Total: **45 endpoints en 11 archivos**.

| Archivo | Método | Ruta | Esperado | Acceso | DTO |
|---|---|---|---|---|---|
| `app.hurl` | GET | `/` | 200 | público | — |
| `audit.hurl` | GET | `/admin/audit-logs` | 200 | admin + audit:read | — |
| `i18n-admin.hurl` | POST | `/admin/i18n/reload` | 201* | jwt + i18n:reload | — |
| `parameter-admin.hurl` | GET | `/admin/parameters` | 200 | admin + parameter:read | — |
| `parameter-admin.hurl` | GET | `/admin/parameters/:group` | 200 | admin + parameter:read | — |
| `parameter-admin.hurl` | PUT | `/admin/parameters/:key` | 200 | admin + parameter:read | `UpdateParameterDto` |
| `user.hurl` | GET | `/admin/users` | 200 | admin + user:read | — |
| `user.hurl` | GET | `/admin/users/metrics` | 200 | admin + user:read | — |
| `user.hurl` | POST | `/admin/users` | 201* | admin + user:create | `CreateUserDTO` |
| `user.hurl` | DELETE | `/admin/users/:id` | 200 | admin + user:delete | — |
| `user.hurl` | GET | `/admin/users/:id` | 200 | admin + user:read | — |
| `user.hurl` | PATCH | `/admin/users/:id` | 200 | admin + user:unlock | `UpdateUserDTO` |
| `user.hurl` | PATCH | `/admin/users/:id/active` | 200 | admin + user:update | — |
| `user.hurl` | PATCH | `/admin/users/:id/unlock` | 200 | admin + user:read | — |
| `auth.hurl` | POST | `/auth/confirm-email-change` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/forgot-password` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/login` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/logout` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/logout-all` | 200 | jwt | — |
| `auth.hurl` | GET | `/auth/me` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/refresh` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/register` | 201* | jwt | `RegisterUserDTO` |
| `auth.hurl` | POST | `/auth/resend-verification` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/reset-password` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/revert-email-change` | 200 | jwt | — |
| `auth.hurl` | POST | `/auth/verify-email` | 200 | jwt | — |
| `email.hurl` | POST | `/email/send` | 201* | admin + email:send | `SendEmailDto` |
| `email.hurl` | POST | `/email/send-direct` | 201* | admin + email:send | `SendDirectEmailDto` |
| `email-template.hurl` | GET | `/email/templates` | 200 | admin + email:create | — |
| `email-template.hurl` | POST | `/email/templates` | 201* | admin + email:create | `CreateTemplateDto` |
| `email-template.hurl` | DELETE | `/email/templates/:slug` | 204 | admin + email:read | — |
| `email-template.hurl` | GET | `/email/templates/:slug` | 200 | admin + email:read | — |
| `email-template.hurl` | PATCH | `/email/templates/:slug` | 200 | admin + email:read | `UpdateTemplateDto` |
| `app.hurl` | GET | `/health` | 200 | público | — |
| `app.hurl` | POST | `/message-microservice/:message-pattern` | 201* | público | — |
| `permission.hurl` | GET | `/permissions` | 200 | jwt + permission:read | — |
| `role.hurl` | GET | `/roles` | 200 | admin + role:read | — |
| `role.hurl` | POST | `/roles` | 201* | admin + role:read | — |
| `role.hurl` | DELETE | `/roles/:id` | 200 | admin + role:delete | — |
| `role.hurl` | PATCH | `/roles/:id` | 200 | admin + role:update | — |
| `role.hurl` | PUT | `/roles/:id/permissions` | 200 | admin + role:delete | `UpdateRolePermissionsDTO` |
| `user-profile.hurl` | POST | `/users/change-email` | 200 | jwt | — |
| `user-profile.hurl` | POST | `/users/change-email/code` | 200 | jwt | — |
| `user-profile.hurl` | POST | `/users/change-password` | 200 | jwt | `ChangePasswordDTO` |
| `user-profile.hurl` | GET | `/users/profile` | 200 | jwt | — |
| `user-profile.hurl` | PATCH | `/users/profile` | 200 | jwt | — |

## Notas de comportamiento verificadas

- Toda colección devuelve el envelope `{ data, total, page, limit, totalPages }` (COU-260): `/admin/users`,
  `/roles`, `/permissions`, `/admin/parameters`, `/admin/parameters/:group` y `/email/templates`. Todas
  aceptan `page` (1-indexed, default 1) y `limit` (1-100, default 20). **No** existe una rama de array
  plano: el `ValidationPipe` instancia el DTO de paginación y aplica `page=1`.
- `/roles` y `/permissions` envolvían la lista en una clave con el nombre del recurso (`roles`,
  `permissions`); ahora usan `data` como el resto de las colecciones (COU-260).
- `GET /admin/users?search=` matchea nombre, apellido, email y userName, case-insensitive y con
  paginado; un término con prefijo `@` **además** se busca como userName sin el `@` (`@juan` → `juan`),
  sin dejar de matchear los otros campos (`@example.com` sigue encontrando emails). Los caracteres de
  regex se tratan literales (COU-347).
- `DELETE /admin/users/:id` es **borrado lógico**: después del 200, `GET` sigue devolviendo 200 con `isActive: false`.
- `PUT /roles/:id/permissions` recibe **nombres** de permiso (`user:read`), no `_id`.
- `PUT /admin/parameters/:key` sobre un parámetro con `isOverridden: true` responde **409 `UA-PAR-002`**: el entorno manda.
- `users/change-password` con la contraseña actual incorrecta responde **400 `UA-USR-003`**, no 401.
- `POST /message-microservice/:pattern` responde **404** con el microservicio apagado (la ruta no se registra).
- `DELETE /email/templates/:slug` responde **204**; un slug inexistente, 404.
- La política de contraseñas rechaza **dobles letras** (`Toggle` → `gg`) y secuencias comunes (`1234`, `password`).

## Si una corrida falla a mitad

Los archivos que crean recursos los borran al final; si el archivo falla antes, quedan residuos. No
hace falta limpiarlos a mano: `fixtures/seed-hurl.ts` purga todo lo que empiece con `hurl-` (usuarios,
roles y plantillas) antes de sembrar, así que volver a correrlo deja la base en estado conocido.

Única excepción: si `POST /roles` da 409 con el nombre libre en la base, es una caché de RBAC del
proceso; reiniciando la API se resuelve.
