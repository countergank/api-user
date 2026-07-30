# Parameter Service — Static Holder Specification

## Purpose

Define the modifications to `ParameterService` and `ParameterModule` needed to support the `@Parameter()` decorator's static service holder pattern.

## Requirements

### Requirement: ParameterService exposes static accessor

`ParameterService` SHALL expose a static `instance: ParameterService | null` field and a static `ensureInitialized(): ParameterService` accessor. The static `instance` SHALL be set by the service instance itself during `onApplicationBootstrap`.

#### Scenario: Static instance is set on application bootstrap

- GIVEN the application starts and modules are initialized
- WHEN `onApplicationBootstrap` lifecycle hook fires
- THEN `ParameterService.instance` SHALL reference the singleton service instance

#### Scenario: Static accessor returns the service instance

- GIVEN `onApplicationBootstrap` has completed
- WHEN code calls `ParameterService.ensureInitialized()`
- THEN it SHALL return the non-null service instance

#### Scenario: Static accessor throws if called before bootstrap

- GIVEN `onApplicationBootstrap` has NOT yet run
- WHEN code calls `ParameterService.ensureInitialized()`
- THEN it SHALL throw an error with message indicating the service is not yet initialized

### Requirement: ParameterModule ensures initialization

`ParameterModule` SHALL call `onApplicationBootstrap` as part of its lifecycle so the static holder is set before any HTTP request is processed.

#### Scenario: Decorator can call ensureInitialized during request

- GIVEN the application has fully bootstrapped
- AND a controller method decorated with `@Parameter('EMAIL_HOST')` is invoked
- WHEN `createParamDecorator` factory calls `ParameterService.ensureInitialized().get('EMAIL_HOST')`
- THEN it SHALL return the correct value without errors
