# Parameter Registry Specification

## Purpose

Typed parameter definitions with defaults, validation, groups, and metadata. Single source of truth for all runtime-configurable parameters.

## Requirements

### Requirement: Parameter Definition

The registry SHALL define each parameter with `key`, `type`, `default`, `group`, `ttl`, and optional `validate` rule.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| key | string | yes | Unique identifier (e.g. `EMAIL_PROVIDER`) |
| type | string | yes | One of: `string`, `number`, `boolean` |
| default | typed | yes | Fallback value matching `type` |
| group | string | yes | Logical grouping (e.g. `email`, `auth`, `rate-limit`) |
| ttl | number | yes | Cache TTL in seconds (default: 300) |
| validate | function | no | Custom validation function |

#### Scenario: Register typed parameter with defaults

- GIVEN a parameter definition `{ key: "EMAIL_PROVIDER", type: "string", default: "smtp", group: "email", ttl: 300 }`
- WHEN the registry is initialized
- THEN the parameter is registered and retrievable by key
- AND its default value is `"smtp"`

#### Scenario: Reject duplicate parameter key

- GIVEN a parameter `EMAIL_PROVIDER` is already registered
- WHEN a second definition with the same key is added
- THEN the registry MUST throw an error at startup

#### Scenario: Reject invalid type

- GIVEN a parameter definition with `type: "json"` (unsupported)
- WHEN the registry validates the definition
- THEN it MUST throw a descriptive error naming the invalid type

### Requirement: Parameter Groups

Parameters MUST be organized into logical groups. The registry SHALL expose a method to list all parameters in a given group.

#### Scenario: List parameters by group

- GIVEN parameters registered under group `"email"`
- WHEN `findByGroup("email")` is called
- THEN all parameters with `group: "email"` are returned
- AND parameters from other groups are excluded

#### Scenario: List all groups

- GIVEN parameters registered under groups `"email"`, `"auth"`, `"rate-limit"`
- WHEN `listGroups()` is called
- THEN all three group names are returned

### Requirement: Validation Rules

The registry SHALL enforce parameter values against their `validate` function when one is provided.

#### Scenario: Validate value against custom rule

- GIVEN parameter `MAX_LOGIN_ATTEMPTS` with `validate: (v) => v > 0 && v <= 100`
- WHEN `validate("MAX_LOGIN_ATTEMPTS", 5)` is called
- THEN validation passes (no error)

#### Scenario: Reject invalid value

- GIVEN parameter `MAX_LOGIN_ATTEMPTS` with `validate: (v) => v > 0 && v <= 100`
- WHEN `validate("MAX_LOGIN_ATTEMPTS", -1)` is called
- THEN validation fails with descriptive error

#### Scenario: Skip validation when no rule defined

- GIVEN parameter `APP_NAME` with no `validate` function
- WHEN `validate("APP_NAME", "any-value")` is called
- THEN validation passes (no error)

### Requirement: Registry as Default Source

The registry definitions SHALL be the canonical source of defaults. Environment variables from `env.validation.ts` MUST be consumed as override values at startup, not as the definition source.

#### Scenario: Environment variable overrides registry default

- GIVEN registry defines `EMAIL_PROVIDER` with default `"smtp"`
- AND env var `EMAIL_PROVIDER=sendgrid` is set
- WHEN the registry initializes
- THEN `EMAIL_PROVIDER` resolves to `"sendgrid"`

#### Scenario: Missing env var uses registry default

- GIVEN registry defines `EMAIL_PROVIDER` with default `"smtp"`
- AND env var `EMAIL_PROVIDER` is not set
- WHEN the registry initializes
- THEN `EMAIL_PROVIDER` resolves to `"smtp"`
