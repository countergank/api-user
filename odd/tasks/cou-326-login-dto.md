# COU-326 — Validar el body de inicio de sesión con un DTO

- **Feature**: `cou-326-login-dto`
- **Issue**: https://linear.app/countergank/issue/COU-326/validar-el-body-de-inicio-de-sesion-con-un-dto
- **Base**: `origin/develop` @ `09c25f2` — **Rama**: `feature/cou-326-validar-el-body-de-inicio-de-sesion-con-un-dto`
- **Estado**: EN IMPLEMENTACIÓN

## Specs

Criterios de aceptación del ticket, citados verbatim.

- **S1** — “`POST /auth/login` con una propiedad desconocida responde `400` con `code: UA-COM-005`.”
- **S2** — “`POST /auth/login` con email mal formado o campo faltante responde `400 UA-COM-005`.”
- **S3** — “Un login válido sigue respondiendo `200` con `accessToken` y `refreshToken`.”
- **S4** — “Hay un test que falla si el handler vuelve a aceptar propiedades desconocidas.”
- **S5** — “La suite Hurl de COU-325 puede afirmar el contrato sobre `/auth/login`.”

## Contexto

`src/auth/auth.controller.ts` recibe el body como **tipo inline**:

```ts
async login(@Body() body: { email: string; password: string }) {
```

Sin metatype de clase, el `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`) no tiene contra
qué validar y acepta cualquier propiedad con `200`. Lo encontró la suite Hurl de COU-325: el mismo body
que `/auth/register` rechaza, `/auth/login` lo acepta. Consecuencia real: hoy el endpoint no valida
formato de email ni campos faltantes, y no hay ningún contrato de error que el cliente pueda asumir.

## Diseño

- **`src/auth/dto/login.dto.ts`** (nuevo): clase con `@IsEmail()` en `email` y `@IsString()` + `@IsNotEmpty()`
  en `password`. Mismo estilo que `RegisterUserDTO`. Sin reglas de fortaleza: la contraseña se valida
  contra el hash, no contra la política (eso queda fuera de alcance).
- **`auth.controller.ts`**: el handler pasa a `@Body() dto: LoginDTO`. El comportamiento con un body
  válido no cambia: delega en `authService.login(dto.email, dto.password)`.
- **`test/e2e/auth/auth.e2e-spec.ts`**: casos de S1–S4, que necesitan el `ValidationPipe` real (un test de
  controller no lo ejercita).
- **`test/hurl/auth.hurl`**: el bloque de contrato hoy usa `/auth/register` porque login no tenía DTO;
  pasa a afirmar `UA-COM-005` también sobre `/auth/login` y se actualiza el comentario que explica el
  hallazgo (S5).

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: casos e2e de login con propiedad desconocida, email inválido y campo faltante | S1, S2, S4 | inline (worker) | — |
| T2 | GREEN: `LoginDTO` + wiring en el controller | S1–S3 | inline (worker) | — |
| T3 | Actualizar `auth.hurl` para afirmar el contrato sobre login | S5 | inline (worker) | — |
| T4 | Verificación: e2e de auth, tsc, biome, suite completa | todas | inline (parent) | — |

## Log

- **L1** (usuario, verbatim): “Buenas chat, te parece que encaremos alguno de los ticket propuestos con
  kickoff?”.
- **L2** (decisión, parent): se toma COU-326 y no COU-321 porque es el más barato (est. 1) y cierra un
  hueco de validación que afecta a un endpoint de autenticación.
- **Clasificación**: Task Size = **small** — una clase nueva, un cambio de firma y tests; el bug está
  reproducido y el criterio es verificable por e2e.
