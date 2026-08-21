# email Specification

## Purpose

Email sending endpoints for admin-triggered email operations. When EMAIL_ENABLED=false, the system MUST stub/disable sending (no SMTP side effects) and return appropriate responses indicating queued or disabled state.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| EM-01 | Send email via template | POST /email/send triggers email using a template |
| EM-02 | Send direct email | POST /email/send-direct sends email without template |
| EM-03 | Email disabled stub | When EMAIL_ENABLED=false, endpoints return stubbed response |
| EM-04 | Admin auth required | All endpoints require JwtAuthGuard + ADMIN role |

### Requirement: EM-01 — Send email via template

The system MUST accept POST /email/send with recipient, template slug, and optional variables.

#### Scenario: Send email successfully (enabled)

- GIVEN EMAIL_ENABLED=true and template "welcome" exists
- WHEN authenticated admin sends POST /email/send with { to: "user@test.com", template: "welcome" }
- THEN returns HTTP 200 or 201 with send confirmation

#### Scenario: Send email disabled (stubbed)

- GIVEN EMAIL_ENABLED=false
- WHEN authenticated admin sends POST /email/send with valid body
- THEN returns HTTP 200 with stubbed/queued response
- AND no actual SMTP connection is made
- AND the response indicates email was queued or disabled

#### Scenario: Template not found

- GIVEN EMAIL_ENABLED=true and template "missing" does not exist
- WHEN authenticated admin sends POST /email/send with { template: "missing" }
- THEN returns HTTP 404 Not Found

### Requirement: EM-02 — Send direct email

The system MUST accept POST /email/send-direct with recipient, subject, and body (no template).

#### Scenario: Send direct email successfully (enabled)

- GIVEN EMAIL_ENABLED=true
- WHEN authenticated admin sends POST /email/send-direct with { to, subject, body }
- THEN returns HTTP 200 or 201 with send confirmation

#### Scenario: Send direct email disabled (stubbed)

- GIVEN EMAIL_ENABLED=false
- WHEN authenticated admin sends POST /email/send-direct with valid body
- THEN returns HTTP 200 with stubbed/queued response
- AND no SMTP side effects occur

### Requirement: EM-03 — Email disabled stub behavior

When EMAIL_ENABLED=false, email endpoints MUST NOT attempt SMTP connections and MUST return a response indicating the email was queued or disabled.

#### Scenario: Disabled mode returns non-error response

- GIVEN EMAIL_ENABLED=false
- WHEN any /email/send* endpoint is called by admin
- THEN returns HTTP 2xx (not 5xx or error)
- AND response body indicates queued/disabled status

### Requirement: EM-04 — Admin auth required

All email endpoints MUST require valid JWT and ADMIN role.

#### Scenario: 401 without token

- WHEN any /email/send* request is made without Authorization
- THEN returns HTTP 401 Unauthorized

#### Scenario: 403 with non-admin role

- GIVEN authenticated user with USER role
- WHEN any /email/send* request is made
- THEN returns HTTP 403 Forbidden
