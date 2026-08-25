# Spec: dtos - parameter-response

## Purpose

Define ParameterResponseDto structure for admin parameter endpoints, including all fields, validation rules, and response shape contracts.

## Requirements

### R1 — DTO Structure

The system MUST provide `ParameterResponseDto` with the following structure:

```typescript
{
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  group: string;
  ttl: number;
  default: string | number | boolean;
  isOverridden: boolean;
}
```

### R2 — Field Validation Rules

#### R2.1 Required Fields
All fields MUST be present in the response:
- `key`: Non-empty string parameter identifier
- `value`: Current runtime value from Redis/L1/env (cannot be null/undefined)
- `type`: Must match registry parameter type ('string' | 'number' | 'boolean')
- `group`: Non-empty string group name
- `ttl`: Positive integer number of seconds
- `default`: Default value matching `type` from registry
- `isOverridden`: Boolean indicating environment variable override

#### R2.2 Field Constraints

##### R2.2.1 Key Constraints
- Cannot be empty string
- Must match registry key exactly (case-sensitive)

##### R2.2.2 Value Constraints
- Value must match registry `type` exactly
- Cannot be null or undefined
- For string types: must be valid UTF-8 string
- For number types: must be valid JavaScript number
- For boolean types: must be true or false

##### R2.2.3 Type Constraints
- Must be one of: 'string', 'number', 'boolean'
- Must match registry parameter type for the same key

##### R2.2.4 Group Constraints
- Cannot be empty string
- Must match registry group exactly (case-sensitive)

##### R2.2.5 TTL Constraints
- Must be positive integer (> 0)
- Cannot be zero or negative

##### R2.2.6 Default Constraints
- Must match registry `type` exactly
- Cannot be null or undefined

##### R2.2.7 isOverridden Constraints
- Must be boolean (true or false)
- True when environment variable exists for this parameter
- False when value comes from Redis or registry default

### R3 — Response Shape Contracts

#### R3.1 Admin Endpoint GET Responses

All admin endpoint responses MUST follow these contracts:

**R3.1.1 GET /admin/parameters**
- Response: `ParameterResponseDto[]`
- Must include all registered parameters
- `isOverridden: true` for params with env overrides
- 200 OK on success
- No audit log entry

**R3.1.2 GET /admin/parameters/:group**
- Response: `ParameterResponseDto[]`
- Must include only parameters from specified group
- Empty array `[]` when group has no parameters
- 200 OK on success
- No audit log entry

**R3.1.3 PUT /admin/parameters/:key**
- Response: `ParameterResponseDto`
- Must include updated parameter with new runtime value
- `isOverridden: false` after successful update
- 200 OK on successful update
- Audit log entry created with action 'PARAMETER_UPDATE'

### R4 — Validation Flow

The system MUST validate ParameterResponseDto fields in this order:

1. **Structure Validation**: All fields must be present and non-null
2. **Type Validation**: field types must match TypeScript interface
3. **Content Validation**: values must meet business rules
4. **Registry Validation**: key must match registered parameter

## Scenarios

### Scenario 1: Complete parameter response
**Given** admin requests `GET /admin/parameters`
**And** parameter `EMAIL_PROVIDER` exists:
- key: 'EMAIL_PROVIDER'
- type: 'string' 
- group: 'email'
- ttl: 300
- default: 'smtp'
- Runtime value: 'sendgrid' (from Redis)
- isOverridden: false (no env override)
**When** ParameterResponseDto is created
**Then** dto contains all required fields
**And** value matches type (string)
**And** isOverridden: false
**And** all fields have valid values

### Scenario 2: Parameter with environment override
**Given** admin requests `GET /admin/parameters`
**And** parameter `EMAIL_PROVIDER` exists:
- Registry default: 'smtp'
- Redis value: 'sendgrid'
- Environment variable: EMAIL_PROVIDER='resend'
**When** ParameterResponseDto is created
**Then** value: 'resend' (from env)
**And** isOverridden: true
**And** other fields (key, type, group, ttl, default) preserved

### Scenario 3: Empty response (no parameters)
**Given** admin requests `GET /admin/parameters`
**And** no parameters registered in registry
**When** ParameterResponseDto array is created
**Then** system returns empty array `[]`
**And** response status is 200 OK
**And** no error thrown

### Scenario 4: Single parameter response with all fields
**Given** admin requests `GET /admin/parameters`
**And** parameter `MAX_LOGIN_ATTEMPTS` exists:
- key: 'MAX_LOGIN_ATTEMPTS'
- type: 'number'
- group: 'auth'
- ttl: 3600
- default: 10
- Runtime value: 50 (from Redis)
- isOverridden: false
**When** ParameterResponseDto is created
**Then** all 7 fields are present
**And** value type matches type (number)
**And** default type matches type (number)
**And** ttl is positive integer
**And** isOverridden is boolean

### Scenario 5: Boolean parameter response
**Given** admin requests `GET /admin/parameters`
**And** parameter `FEATURE_FLAG` exists:
- type: 'boolean'
- default: false
- Runtime value: true
- isOverridden: false
**When** ParameterResponseDto is created
**Then** value is boolean true
**And** type is 'boolean'
**And** default is boolean false
**And** validation passes

### Scenario 6: Parameter with expired Redis
**Given** parameter `EMAIL_PROVIDER` exists:
- Registry default: 'smtp'
- Redis TTL: 300s (expired 1 hour ago)
- No environment variable
**When** admin requests `GET /admin/parameters`
**Then** runtime value: 'smtp' (from registry default)
**And** isOverridden: false
**And** Redis is re-seeded with default and new TTL
**And** response includes correct value

### Scenario 7: Invalid parameter response (missing field)
**Given** system creates ParameterResponseDto incorrectly
**And** key field is missing
**When** validation is performed
**Then** validation fails
**And** system returns appropriate error
**And** no response is sent to client

### Scenario 8: Parameter response type mismatch
**Given** registry has parameter 'MAX_LOGIN_ATTEMPTS' with type 'number'
**And** system creates dto with type 'string'
**When** validation is performed
**Then** validation fails
**And** system returns error
**And** dto is not used

### Scenario 9: Empty group response
**Given** admin requests `GET /admin/parameters/empty-group`
**And** no parameters have group 'empty-group'
**When** ParameterResponseDto array is created
**Then** system returns empty array `[]`
**And** response status is 200 OK
**And** no error is thrown

### Scenario 10: isOverridden flag consistency
**Given** parameter with env override
**And** env var changes value
**When** admin requests `GET /admin/parameters`
**Then** isOverridden: true reflects current env state
**And** value reflects current env value
**And** dto is consistent