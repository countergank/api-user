# config-validation Specification

> Migrated from `openspec/SPEC.md` (deleted 2026-07-06).

## Overview

Configuration validation at startup.

## Requirements

### Requirement: Exported Validation Types

`env.validation.ts` MUST export its validated types so the parameter registry can consume them as the default source of environment-derived values.

#### Scenario: Registry imports env types

- GIVEN `env.validation.ts` exports an `EnvVariables` type
- WHEN the parameter registry initializes
- THEN it imports `EnvVariables` and uses it to override registry defaults with env values

#### Scenario: Type mismatch between registry and env

- GIVEN registry defines `MAX_LOGIN_ATTEMPTS` as `type: "number"`
- AND env var `MAX_LOGIN_ATTEMPTS=not-a-number`
- WHEN env validation runs at startup
- THEN validation MUST fail before the registry initializes
- AND the application MUST NOT start with an invalid value
