# Data Integrity Specification

## Purpose

Prevent NoSQL injection via regex escaping and enforce password field exclusion on queries that do not require it. Auth flows that need the password (login, validation) MUST explicitly opt in.

## Requirements

| ID | Requirement | Keywords |
|----|-------------|----------|
| DI-01 | RegExp search input escaping | MUST |
| DI-02 | findAll/findPaginated exclude password | MUST |
| DI-03 | Token-lookup queries exclude password | MUST |
| DI-04 | findById/findByEmail optional includePassword | SHOULD |

### Requirement: DI-01 — RegExp Search Input Escaping

All user-supplied search strings passed to `new RegExp()` in `user.repository.ts` MUST be escaped to prevent NoSQL injection. Regex special characters (`.*+?^${}()|[]\\`) MUST be treated as literal characters. An empty search string MUST NOT produce a RegExp that matches all documents.

#### Scenario: Search with regex special characters
- **GIVEN** a user searches for `admin.*$^`
- **WHEN** `findPaginated()` builds the search regex
- **THEN** the special characters are escaped
- **AND** the query matches only documents containing the literal string `admin.*$^`
- **AND** regex operators are NOT interpreted

#### Scenario: Search with empty string
- **GIVEN** `filters.search` is an empty string `""`
- **WHEN** `findPaginated()` processes the filter
- **THEN** the search condition is skipped (no RegExp added)
- **AND** all documents matching other filters are returned

#### Scenario: Search with normal string
- **GIVEN** a user searches for `john`
- **WHEN** `findPaginated()` builds the search regex
- **THEN** the query matches documents containing `john` (case-insensitive)
- **AND** no injection is possible

#### Scenario: Search with bracket and pipe characters
- **GIVEN** a user searches for `test[1]|test(2)`
- **WHEN** the regex is constructed
- **THEN** `[`, `]`, `|`, `(`, `)` are all escaped
- **AND** the query treats them as literal characters

### Requirement: DI-02 — findAll and findPaginated Exclude Password

`findAll()` and `findPaginated()` in `user.repository.ts` MUST exclude the `password` field via `.select('-password')`. The returned user documents MUST NOT contain the password hash.

#### Scenario: findAll excludes password
- **GIVEN** users exist in the database
- **WHEN** `findAll()` is called
- **THEN** returned user documents do NOT contain the `password` field
- **AND** all other fields are present

#### Scenario: findPaginated excludes password
- **GIVEN** users exist in the database
- **WHEN** `findPaginated()` is called with valid filters
- **THEN** returned user documents do NOT contain the `password` field
- **AND** pagination metadata (`total`, `page`, `limit`) is correct

### Requirement: DI-03 — Token Lookup Queries Exclude Password

`findByEmailVerificationToken()`, `findByPendingEmailToken()`, and `findByResetToken()` MUST exclude the `password` field via `.select('-password')`. These queries are used for token validation flows that do not need the password hash.

#### Scenario: findByEmailVerificationToken excludes password
- **GIVEN** a user with a valid email verification token
- **WHEN** `findByEmailVerificationToken(token)` is called
- **THEN** the returned user does NOT contain the `password` field
- **AND** the token and expiry fields are present

#### Scenario: findByPendingEmailToken excludes password
- **GIVEN** a user with a valid pending email token
- **WHEN** `findByPendingEmailToken(token)` is called
- **THEN** the returned user does NOT contain the `password` field

#### Scenario: findByResetToken excludes password
- **GIVEN** a user with a valid reset password token
- **WHEN** `findByResetToken(token)` is called
- **THEN** the returned user does NOT contain the `password` field

### Requirement: DI-04 — findById and findByEmail Optional includePassword

`findById()` and `findByEmail()` SHOULD accept an optional `includePassword` parameter (default: `false`). When `includePassword` is `true`, the query MUST include the password field. When `false` or omitted, the query MUST exclude it via `.select('-password')`.

#### Scenario: findById without includePassword (default)
- **GIVEN** a user exists in the database
- **WHEN** `findById(id)` is called without `includePassword`
- **THEN** the returned user does NOT contain the `password` field

#### Scenario: findById with includePassword=true
- **GIVEN** a user exists in the database
- **WHEN** `findById(id, { includePassword: true })` is called
- **THEN** the returned user DOES contain the `password` field
- **AND** this is used by auth flows that need to compare passwords

#### Scenario: findByEmail without includePassword (default)
- **GIVEN** a user exists with email `test@example.com`
- **WHEN** `findByEmail('test@example.com')` is called
- **THEN** the returned user does NOT contain the `password` field

#### Scenario: findByEmail with includePassword=true for login
- **GIVEN** a user exists with email `test@example.com`
- **WHEN** `findByEmail('test@example.com', { includePassword: true })` is called
- **THEN** the returned user DOES contain the `password` field
- **AND** the auth service can validate the password hash
