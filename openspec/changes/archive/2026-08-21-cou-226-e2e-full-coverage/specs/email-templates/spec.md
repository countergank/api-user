# email-templates Specification

## Purpose

Admin-managed email template CRUD for the email templating system. Templates are identified by unique slugs and support multi-language content. All operations require ADMIN role.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| ET-01 | Create email template | POST /email/templates creates a new template with unique slug |
| ET-02 | List email templates | GET /email/templates returns all templates |
| ET-03 | Get template by slug | GET /email/templates/:slug returns a single template |
| ET-04 | Update email template | PATCH /email/templates/:slug updates template fields |
| ET-05 | Delete email template | DELETE /email/templates/:slug removes a template |
| ET-06 | Admin auth required | All endpoints require JwtAuthGuard + ADMIN role |

### Requirement: ET-01 — Create email template

The system MUST accept POST /email/templates with a DTO containing slug, subject, body, and optional language fields. The slug MUST be unique.

#### Scenario: Create template successfully

- GIVEN an authenticated admin user
- WHEN POST /email/templates with { slug: "welcome", subject: "Welcome!", body: "<p>Hello</p>" }
- THEN returns HTTP 201 with the created template
- AND the template is persisted in the database

#### Scenario: Duplicate slug rejected

- GIVEN a template with slug "welcome" already exists
- WHEN POST /email/templates with { slug: "welcome", ... }
- THEN returns HTTP 409 with duplicate-slug error

#### Scenario: Non-admin cannot create

- GIVEN an authenticated non-admin user
- WHEN POST /email/templates with valid body
- THEN returns HTTP 403 Forbidden

#### Scenario: Unauthenticated request rejected

- GIVEN no authentication header
- WHEN POST /email/templates
- THEN returns HTTP 401 Unauthorized

### Requirement: ET-02 — List email templates

The system MUST return all email templates via GET /email/templates.

#### Scenario: List all templates

- GIVEN 3 templates exist in the database
- WHEN authenticated admin sends GET /email/templates
- THEN returns HTTP 200 with array of 3 templates

#### Scenario: Empty list

- GIVEN no templates exist
- WHEN authenticated admin sends GET /email/templates
- THEN returns HTTP 200 with empty array []

### Requirement: ET-03 — Get template by slug

The system MUST return a single template by its slug.

#### Scenario: Get existing template

- GIVEN a template with slug "welcome" exists
- WHEN authenticated admin sends GET /email/templates/welcome
- THEN returns HTTP 200 with the template object

#### Scenario: Template not found

- GIVEN no template with slug "missing" exists
- WHEN authenticated admin sends GET /email/templates/missing
- THEN returns HTTP 404 Not Found

### Requirement: ET-04 — Update email template

The system MUST accept PATCH /email/templates/:slug to update template fields.

#### Scenario: Update template successfully

- GIVEN a template with slug "welcome" exists
- WHEN authenticated admin sends PATCH /email/templates/welcome with { subject: "Welcome Back!" }
- THEN returns HTTP 200 with updated template
- AND subject is changed to "Welcome Back!"

#### Scenario: Update non-existent template

- GIVEN no template with slug "ghost" exists
- WHEN authenticated admin sends PATCH /email/templates/ghost with valid body
- THEN returns HTTP 404 Not Found

### Requirement: ET-05 — Delete email template

The system MUST accept DELETE /email/templates/:slug to remove a template.

#### Scenario: Delete template successfully

- GIVEN a template with slug "old-template" exists
- WHEN authenticated admin sends DELETE /email/templates/old-template
- THEN returns HTTP 200 or 204
- AND the template is no longer retrievable via GET

#### Scenario: Delete non-existent template

- WHEN authenticated admin sends DELETE /email/templates/nonexistent
- THEN returns HTTP 404 Not Found

### Requirement: ET-06 — Admin auth required

All email template endpoints MUST require valid JWT and ADMIN role.

#### Scenario: 401 without token

- WHEN any /email/templates request is made without Authorization header
- THEN returns HTTP 401 Unauthorized

#### Scenario: 403 with non-admin role

- GIVEN authenticated user with USER role
- WHEN any /email/templates request is made
- THEN returns HTTP 403 Forbidden
