# COU-322 — Decisión: separar `UserDTO` de administración

- **Feature**: `cou-322-userdto-admin-boundary`
- **Issue**: https://linear.app/countergank/issue/COU-322/definir-si-userdto-se-separa-en-un-dto-de-administracion
- **Base**: `origin/develop` @ `61120d8` — **Rama**: `feature/cou-322-definir-si-userdto-se-separa-en-un-dto-de-administracion`
- **Estado**: DECISIÓN ENTREGADA — implementación pendiente de un ticket propio

## Specs

Criterios de aceptación y alcance del ticket, citados verbatim.

- **S1** — “Queda escrito qué opción se elige y por qué, con el costo de migración de cada una.”
- **S2** — “La decisión cubre cómo se detectaría una violación futura (test, tipo o revisión).”
- **S3** (scope incluido) — “enmarcar el entregable de la decisión — si conviene un DTO separado de administración, un tipo marcador o una regla de lint/revisión, con el costo de cada opción.”
- **S4** (scope fuera) — “implementar el cambio. Este ticket entrega la decisión y el plan, no el refactor.”

## Decisión

**Se elige la opción (a): `UserDTO` deja de exponer `lockedUntil` y `failedLoginAttempts`, y un
`AdminUserDTO extends UserDTO` los agrega.** El límite pasa a estar impuesto por el compilador: un
handler que no sea de administración no puede devolver esos campos porque su tipo no los tiene.

Las dos alternativas se descartan por razones concretas, no por gusto:

- **Tipo marcado** (`AdminOnly<T>`): el repo **no tiene ningún precedente** de tipos marcados ni
  branding (cero `unique symbol`/branded en `src/`), y la garantía es más débil: `UserDTO.of` seguiría
  siendo invocable y el marcador sólo marcaría a los *consumidores* del campo, no a la respuesta HTTP.
  Mismo costo que (a) con menos fuerza.
- **Regla de lint o revisión**: el linter es **Biome 1.8**, sin reglas custom, y no hay ESLint en el
  repo. En la práctica queda en convención escrita — exactamente lo que hoy existe y lo que COU-261 ya
  tuvo que blindar con e2e. No elimina el riesgo, lo documenta.

## Qué sostiene la decisión (evidencia)

**Hoy el límite es estructural sólo por convención.** `UserDTO` es seguro porque el único controller
que lo construye es el de administración: `src/user/controller/user.controller.ts:44-48` declara
`@Controller('admin/users')` con `@Roles(UserRole.ADMIN)`, y los cuatro handlers que devuelven
`UserDTO` están todos ahí — `findAll` (`:81-91`), `findById` (`:94-98`), `update` (`:150`) y
`toggleActive` (`:157`), más el mapeo de `findPaginated` en `src/user/service/user.service.ts:487-498`.
Nada impide que un endpoint nuevo devuelva `UserDTO` y filtre el estado de bloqueo.

**Las superficies no-admin no usan `UserDTO`**, lo que hace barata la migración:

| Superficie | Qué devuelve | Evidencia |
|---|---|---|
| `GET /auth/me` | `MeResponseDTO` (whitelist de 6 campos) | `src/auth/dto/me-response.dto.ts:17-67` |
| register / login / refresh | objeto inline de 5 campos en `AuthResponse` | `src/auth/auth.service.ts:508-533` |
| `/users/profile` | sin los campos de bloqueo | cubierto por e2e (ver abajo) |

**Lectores de los dos campos fuera del DTO**, o sea lo que una migración tendría que mover: la
entidad (`src/user/entities/user.entity.ts:117,120`), la lógica de lockout
(`src/auth/auth.service.ts:127-153`), el reset del admin al crear
(`src/user/service/user.service.ts:389-390`). **Ningún mapper ni serializador más.**

## Costo de migración de la opción elegida

~10 archivos, ~120 líneas, casi todo retipeo mecánico:

| Archivo | Qué cambia |
|---|---|
| `src/user/dto/admin-user.dto.ts` (nuevo) | `AdminUserDTO extends UserDTO` con los dos `@ApiProperty` y su mapeo |
| `src/user/dto/user.dto.ts` | se le quitan los dos campos y su serialización |
| `src/user/controller/user.controller.ts:81,85,97,150,157` | los handlers de admin pasan a `AdminUserDTO` |
| `src/user/service/user.service.ts:487,498` | `findPaginated` mapea a `AdminUserDTO` |
| `src/user/api-docs/examples/user.examples.ts` | **`UserResponse` debe derivar de `AdminUserDTO`**, no de `UserDTO`, o el Swagger del admin pierde justo los dos campos (ver dependencia con COU-319) |
| `src/user/dto/user.dto.spec.ts` | los 3 casos de lock state se mudan al spec del DTO nuevo |
| `src/user/dto/paginated-user-response.dto.spec.ts`, `src/user/controller/user.controller.spec.ts`, `src/user/mocks/paginated-user-response.mock.ts` | retipear los genéricos y fixtures |
| `test/e2e/user/swagger-user-response.e2e-spec.ts` | el schema esperado pasa a `AdminUserDTO`. **Sólo existe cuando COU-319 (#448) esté mergeado** |

**Dependencia con COU-319 (#448), explícita**: ese ticket propone dejar `UserResponse extends UserDTO`
como única fuente de la metadata de Swagger del admin, y **al escribir esta decisión todavía está en
review, sin mergear**. Si la implementación de acá arranca después de que #448 entre, tiene que
reapuntar ese `UserResponse` a `AdminUserDTO`; si arranca antes, el archivo
`src/user/api-docs/examples/user.examples.ts` todavía declara sus propios campos y el retargeting se
hace igual, en el mismo cambio. En los dos casos el olvido tiene el mismo efecto: el Swagger del admin
deja de documentar los dos campos de bloqueo.

## Cómo se detecta una violación futura (S2)

1. **Compilador (primario)**: un handler no-admin que intente devolver `lockedUntil` o
   `failedLoginAttempts` no compila, porque su tipo de retorno es `UserDTO` y esos campos ya no existen
   ahí. Es la diferencia con la convención actual, que sólo se detecta en revisión.
2. **e2e existente como red de regresión** (`test/e2e/user/admin-user-lock-state.e2e-spec.ts`):
   `GET /admin/users/:id` expone ambos campos (`:121`); el caso nulo (`:173-174`); `PATCH` rechaza
   `lockedUntil` en el body (`:179-194`); `GET /users/profile` **no** los incluye (`:199-206`);
   `POST /auth/register` **no** los incluye (`:209-215`). Más `test/e2e/auth/auth-me.e2e-spec.ts:126-127`
   para `/me`.
3. **Schema de Swagger**: el spec de COU-319 (`test/e2e/user/swagger-user-response.e2e-spec.ts`,
   disponible en cuanto #448 se mergee) reapuntado a `AdminUserDTO`, sigue afirmando la lista de
   propiedades documentadas. Si la implementación de acá va antes que #448, ese spec todavía no existe
   y el caso equivalente se escribe junto con la migración.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | Mapa de superficies y costos por opción | S1, S3 | inline (explorer) | — |
| T2 | Decisión escrita con evidencia y plan de detección | S1, S2 | este documento | — |

La implementación (S4, fuera de alcance) queda para un ticket propio que tome la tabla de costo de
arriba como plan.

## Log

- **L1** (usuario, verbatim): “sigamos” … y ante las opciones: “a) AdminUserDTO: separar y que lo imponga el compilador”.
- **L2** (readiness COU-322): proyecto `api-user`, estimate `1`, asignado `Leandro Javier Cepeda`,
  `branchName` = `feature/cou-322-definir-si-userdto-se-separa-en-un-dto-de-administracion`.
  Movido a `In Progress`; rama creada con `--no-track` desde `origin/develop`.
- **L3** (decisión, parent): se delega el mapa a un explorer read-only y la decisión final la toma el
  usuario. El entregable es el documento, no el refactor (S4).
- **L4** (evidencia que decidió): la construcción de `UserDTO` está contenida en el controller de admin
  y las superficies no-admin usan otros DTO; no hay precedente de tipos marcados en el repo y Biome no
  admite reglas custom. Eso deja a la opción (a) como la única con garantía estructural y costo
  acotado.
