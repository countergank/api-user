# Audit Logs API Documentation

## Overview

The audit logging system captures and stores audit trails for all significant actions in the system. It provides:

- **HTTP-level auditing**: Automatic capture of request metadata (IP, user-agent, method, status, duration)
- **Business-level auditing**: Explicit `@AuditAction()` decorators on service methods for domain-specific context
- **Sensitive data redaction**: Automatic redaction of passwords, tokens, and authorization headers
- **Configurable audit levels**: `minimal`, `standard`, or `verbose` modes
- **TTL-based retention**: Automatic cleanup of old audit logs

## Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AUDIT_ENABLED` | boolean | `true` | Enable/disable all audit logging |
| `AUDIT_RETENTION_DAYS` | number | `30` | Days to retain audit logs before automatic deletion |
| `AUDIT_LEVEL` | enum | `standard` | `minimal` (auth only), `standard` (mutations), `verbose` (all requests) |

## Audit Levels

### minimal
Only captures authentication-related endpoints:
- `/auth/login`, `/auth/register`, `/auth/forgot-password`
- `/auth/reset-password`, `/auth/verify-email`
- `/auth/confirm-email-change`, `/auth/refresh-token`

### standard (default)
Captures all mutation requests (POST, PUT, PATCH, DELETE) plus auth endpoints.

### verbose
Captures ALL requests including GET operations.

## Admin Query Endpoint

### GET `/admin/audit-logs`

Retrieve paginated audit logs with filtering options. Requires ADMIN role.

**Authentication**: Bearer token required
**Authorization**: `ADMIN` role required

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | No | Filter by user ID |
| `action` | string | No | Filter by action name (e.g., `user.create`, `auth.login`) |
| `resource` | string | No | Filter by resource type (`user`, `auth`, `role`, `permission`) |
| `from` | ISO 8601 | No | Filter from date |
| `to` | ISO 8601 | No | Filter to date |
| `ipAddress` | string | No | Filter by IP address |
| `page` | number | No | Page number (1-indexed, default: 1) |
| `limit` | number | No | Items per page (1-100, default: 20) |

#### Response

```json
{
  "data": [
    {
      "id": "507f191e810c19729de860ea",
      "correlationId": "abc-123-def",
      "userId": "507f1f1e810c19729de860eb",
      "action": "user.create",
      "resource": "user",
      "resourceId": "507f1f1e810c19729de860ec",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "httpMethod": "POST",
      "endpoint": "/admin/users",
      "statusCode": 201,
      "duration": 45,
      "businessContext": {
        "before": { "userId": "...", "fields": ["email", "name"] },
        "after": { "userId": "...", "email": "user@example.com" }
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

#### Error Responses

| Status | Description |
|--------|-------------|
| 401 | Unauthorized - Valid JWT required |
| 403 | Forbidden - Admin role required |
| 400 | Bad Request - Invalid filter parameters |

## Audited Actions

### Auth Actions
| Action | Resource | Description |
|--------|----------|-------------|
| `auth.register` | auth | User registration |
| `auth.forgot-password` | auth | Password reset request |
| `auth.reset-password` | auth | Password reset completion |
| `auth.verify-email` | auth | Email verification |
| `auth.confirm-email-change` | auth | Email change confirmation |
| `auth.resend-verification` | auth | Resend verification email |
| `auth.refresh-token` | auth | Token refresh |

### User Actions
| Action | Resource | Description |
|--------|----------|-------------|
| `user.create` | user | Create new user |
| `user.update` | user | Update user details |
| `user.delete` | user | Soft delete user |
| `user.toggle-active` | user | Activate/deactivate user |
| `user.unlock` | user | Unlock locked account |
| `user.request-email-change` | user | Request email change |

### RBAC Actions
| Action | Resource | Description |
|--------|----------|-------------|
| `role.create` | role | Create new role |
| `role.update-permissions` | role | Update role permissions |
| `permission.create` | permission | Create new permission |

## Sensitive Data Redaction

The following fields are automatically redacted with `[REDACTED]`:
- `password`
- `token` (and any field containing "token")
- `authorization`
- `refreshToken`
- `resetPasswordToken`
- `emailVerificationToken`
- `pendingEmailToken`

Redaction is recursive and case-insensitive.

## Event Types

| Event | Description |
|-------|-------------|
| `audit.http.request` | HTTP request captured by interceptor |
| `audit.business.action` | Business action captured by `@AuditAction()` decorator |
