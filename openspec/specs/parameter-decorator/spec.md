# Parameter Decorator Specification

## Purpose

Define the `@Parameter()` custom decorator that injects `ParameterService` values into NestJS controller method parameters with type inference, following the existing `@CurrentUser` and `@RequestLang` pattern.

## Requirements

### Requirement: Decorator resolves ParameterService at request time

The `@Parameter(key)` decorator SHALL use `createParamDecorator` from `@nestjs/common` and SHALL resolve the service via a static service holder initialized during `onApplicationBootstrap`.

The decorator SHALL call `service.get(key)` on every request (no per-request caching).

#### Scenario: Decorator returns value for known key

- GIVEN a controller method with `@Parameter('THROTTLE_LIMIT') limit: number`
- AND the ParameterService has value `10` for key `THROTTLE_LIMIT`
- WHEN the controller method is invoked
- THEN the `limit` parameter SHALL be `10`

#### Scenario: Decorator returns undefined for unknown key (default)

- GIVEN a controller method with `@Parameter('UNKNOWN_KEY') val: string | undefined`
- WHEN the controller method is invoked
- THEN the `val` parameter SHALL be `undefined`

### Requirement: Decorator supports strict mode

The decorator SHALL accept a `ParameterDecoratorOptions` with optional `strict?: boolean` property. When `strict: true`, an unknown key SHALL throw an error instead of returning `undefined`.

#### Scenario: Strict mode throws on unknown key

- GIVEN a controller method with `@Parameter('UNKNOWN_KEY', { strict: true }) val: string`
- WHEN the controller method is invoked
- THEN the invocation SHALL throw an error

### Requirement: Decorator infers TypeScript types from ParameterType

The decorator SHALL map `ParameterType` values (`'string'`, `'number'`, `'boolean'`) to their corresponding TypeScript types via a conditional type helper.

#### Scenario: Number-typed parameter returns number

- GIVEN `THROTTLE_LIMIT` is defined with `type: 'number'`
- AND a controller method with `@Parameter('THROTTLE_LIMIT') limit`
- WHEN invoked
- THEN `limit` SHALL be typed as `number` in TypeScript

#### Scenario: Boolean-typed parameter returns boolean

- GIVEN `EMAIL_SECURE` is defined with `type: 'boolean'`
- AND a controller method with `@Parameter('EMAIL_SECURE') secure`
- WHEN invoked
- THEN `secure` SHALL be typed as `boolean` in TypeScript

### Requirement: Decorator is exported from the config module

The decorator SHALL be exported from `src/config/parameters/decorators/index.ts` and re-exported from `src/config/parameters/index.ts` so consuming modules can import it from `@app/config/parameters`.

#### Scenario: Decorator import works in any controller

- GIVEN a controller importing `Parameter` from `src/config/parameters`
- WHEN the decorator is used in the controller
- THEN it SHALL compile and work at runtime
