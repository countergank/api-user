# Controller Decorators Specification

## Purpose

Custom param decorators for typed access to the authenticated user (`@CurrentUser()`) and request language (`@RequestLang()`), replacing the `@Req() req: any` anti-pattern. Also covers route ordering correctness and defense-in-depth password exclusion.

## Requirements

### Requirement: CTR-01 — @CurrentUser() Param Decorator

The system MUST provide a `@CurrentUser()` param decorator that extracts the authenticated user from `request.user` and injects it into the handler parameter.

The decorator MUST return the full `User` entity attached by the JWT/Passport strategy.

#### Scenario: Authenticated request injects user entity

- GIVEN a request protected by `JwtAuthGuard`
- WHEN a handler parameter is decorated with `@CurrentUser()`
- THEN the parameter receives the `User` entity from `request.user`

#### Scenario: Unauthenticated request (no guard)

- GIVEN a handler parameter decorated with `@CurrentUser()`
- WHEN the request has NOT passed through `JwtAuthGuard`
- THEN the parameter receives `undefined`

---

### Requirement: CTR-02 — @RequestLang() Param Decorator

The system MUST provide a `@RequestLang()` param decorator that extracts the request language by delegating to the existing `getRequestLang()` helper.

The decorator MUST return a `string | undefined` — the 2-char language code (`es`, `en`, `pt`) or `undefined` if the header is absent or unsupported.

#### Scenario: Valid Accept-Language header

- GIVEN a request with `Accept-Language: es-ES,es;q=0.9`
- WHEN a handler parameter is decorated with `@RequestLang()`
- THEN the parameter receives `"es"`

#### Scenario: No Accept-Language header

- GIVEN a request without an `Accept-Language` header
- WHEN a handler parameter is decorated with `@RequestLang()`
- THEN the parameter receives `undefined`

#### Scenario: Unsupported language code

- GIVEN a request with `Accept-Language: fr-FR,fr;q=0.9`
- WHEN a handler parameter is decorated with `@RequestLang()`
- THEN the parameter receives `undefined`

---

### Requirement: CTR-03 — Replace @Req() for User Access

All controller handlers that access `req.user` MUST use `@CurrentUser()` instead of `@Req() req` / `@Request() req`.

After migration, zero handlers MUST access `request.user` via the raw request object.

#### Scenario: user-profile.controller.ts migration

- GIVEN `user-profile.controller.ts` has 4 handlers using `req.user`
- WHEN the migration is complete
- THEN all 4 handlers use `@CurrentUser() user: User` and zero use `@Req()` for user access

---

### Requirement: CTR-04 — Replace @Req() for Language Access

All controller handlers that call `getRequestLang(req)` MUST use `@RequestLang()` instead of `@Req() req: any`.

After migration, zero handlers MUST receive `@Req()` solely for language extraction.

#### Scenario: auth.controller.ts migration

- GIVEN `auth.controller.ts` has 6 handlers using `@Req() req: any` for `getRequestLang(req)`
- WHEN the migration is complete
- THEN all 6 handlers use `@RequestLang() lang: string | undefined` and zero use `@Req()` for language access

#### Scenario: Private translate helper migration

- GIVEN `user.controller.ts` has a private `t(key, req)` method that calls `getRequestLang(req)`
- WHEN the migration is complete
- THEN the `t()` method accepts a `lang` parameter instead of `req`, and callers pass `@RequestLang()` value

---

### Requirement: CTR-05 — Static Routes Before Parameterized Routes

In `user.controller.ts`, the `@Get()` (list all) route MUST be declared before `@Get(':id')` (find by ID).

Static routes MUST always precede parameterized routes to prevent `:id` from capturing static segments.

#### Scenario: GET /admin/users returns user list

- GIVEN `user.controller.ts` with both `@Get()` and `@Get(':id')`
- WHEN a client sends `GET /admin/users`
- THEN the `findAll` handler is invoked (not `findById` with `id="users"`)

#### Scenario: GET /admin/users/:id returns single user

- GIVEN the same controller
- WHEN a client sends `GET /admin/users/507f1f77bcf86cd799439011`
- THEN the `findById` handler is invoked with the correct ID

---

### Requirement: CTR-06 — Password Field Exclusion

The `password` field on `User` entity MUST be decorated with `@Exclude()` from `class-transformer` for defense-in-depth serialization protection.

This is a secondary safeguard — `UserDTO.of()` manual mapping already excludes password. `@Exclude()` ensures that any code path using `class-transformer` serialization also omits the password.

#### Scenario: User entity serialized via class-transformer

- GIVEN a `User` instance with `password` set
- WHEN the instance is passed through `classToPlain()` or `ClassSerializerInterceptor`
- THEN the output MUST NOT contain the `password` field

#### Scenario: UserDTO.of() still works independently

- GIVEN `UserDTO.of()` manual mapping
- WHEN called with a `User` entity
- THEN the returned DTO does not contain `password` (existing behavior preserved)
