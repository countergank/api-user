# Spec: dtos - update-parameter

## Purpose

Define UpdateParameterDto validation rules for parameter updates via PUT /admin/parameters/:key endpoint.

## Requirements

### R1 — DTO Structure

The system MUST provide `UpdateParameterDto` with the following structure:

```typescript
{
  key: string;           // MUST exist in registry
  value: string | number | boolean;  // MUST match registry type
}
```

### R2 — Key Validation Rules

#### R2.1 Key Existence
The system SHALL validate that the `key` field exists in the ParameterRegistry:
- If key does not exist, return HTTP 404 with error "Parameter \"{key}\" not found in registry"
- This validation MUST occur before value validation

#### R2.2 Key Type Validation
The system SHALL validate that the parameter's key corresponds to a defined registry entry:
- Each key in registry has a defined `type` field
- DTO validation MUST ensure key references valid parameter type

### R3 — Value Validation Rules

#### R3.1 Value Type Matching
The system SHALL validate that the `value` type matches the registry's type for the specified key:
- If registry defines `type: 'string'` and DTO contains `value: 123`, validation fails
- If registry defines `type: 'number'` and DTO contains `value: "123"`, validation fails
- If registry defines `type: 'boolean'` and DTO contains `value: true`, validation passes

#### R3.2 Custom Validation
The system SHALL run additional validation if the registry defines a `validate` function:
- For key `MAX_LOGIN_ATTEMPTS`, registry may have `validate: (v) => v > 0 && v <= 100`
- DTO validation MUST invoke registry.validate(key, value)
- If validation fails, return HTTP 422 with error "Parameter validation failed"

### R4 — DTO Validation Flow

The system SHALL follow this validation order:
1. **DTO Structure Validation**: Class-validator validates required fields and types
2. **Registry Existence Check**: Verify key exists in registry
3. **Type Matching**: Verify value type matches registry type
4. **Custom Validation**: Run registry-specific validation functions

## Scenarios

### Scenario 1: Valid update request
**Given** parameter `EMAIL_PROVIDER` exists in registry with type 'string'
**And** admin sends DTO: `{ "key": "EMAIL_PROVIDER", "value": "sendgrid" }`
**When** DTO validation is performed
**Then** validation passes
**And** registry validates key existence and type match
**And** custom validation passes (if any)
**And** system proceeds to update operation

### Scenario 2: Invalid key (not in registry)
**Given** admin sends DTO: `{ "key": "UNKNOWN_PARAM", "value": "test" }`
**When** DTO validation is performed
**Then** step 1 (structure) passes
**And** step 2 (registry check) fails
**And** system returns HTTP 404 with error "Parameter \"UNKNOWN_PARAM\" not found in registry"
**And** no further validation occurs
**And** no audit log is created

### Scenario 3: Type mismatch validation
**Given** parameter `EMAIL_PROVIDER` exists in registry with type 'string'
**And** admin sends DTO: `{ "key": "EMAIL_PROVIDER", "value": 123 }`
**When** DTO validation is performed
**Then** step 1 passes
**And** step 2 passes (key exists)
**And** step 3 fails (number ≠ string)
**And** system returns HTTP 422 with error "Value type mismatch"
**And** no audit log is created

### Scenario 4: Custom validation failure
**Given** parameter `MAX_LOGIN_ATTEMPTS` exists in registry with type 'number'
**And** registry has validation: `validate: (v) => v > 0 && v <= 100`
**And** admin sends DTO: `{ "key": "MAX_LOGIN_ATTEMPTS", "value": -5 }`
**When** DTO validation is performed
**Then** step 1 passes
**And** step 2 passes (key exists)
**And** step 3 passes (number matches type)
**And** step 4 fails (custom validation)
**And** system returns HTTP 422 with error "Parameter validation failed: must be between 0 and 100"
**And** no audit log is created

### Scenario 5: DTO structure validation failure
**Given** admin sends invalid DTO: `{ "key": "EMAIL_PROVIDER" }`
**When** DTO validation is performed
**Then** step 1 fails (missing required field 'value')
**And** system returns HTTP 422 with validation error details
**And** no registry validation occurs
**And** no audit log is created

### Scenario 6: DTO type mismatch
**Given** admin sends DTO with invalid types: `{ "key": 123, "value": "test" }`
**When** DTO validation is performed
**Then** step 1 fails (key must be string, value must be specific type)
**And** system returns HTTP 422 with field-level validation errors
**And** no registry validation occurs
**And** no audit log is created

### Scenario 7: Null/undefined value handling
**Given** admin sends DTO with null value: `{ "key": "EMAIL_PROVIDER", "value": null }`
**When** DTO validation is performed
**Then** step 1 fails (null not allowed)
**And** system returns HTTP 422 with validation error for value field
**And** no registry validation occurs
**And** no audit log is created

### Scenario 8: Edge case - special characters in value
**Given** parameter `APP_NAME` exists in registry with type 'string'
**And** no custom validation
**And** admin sends DTO: `{ "key": "APP_NAME", "value": "Test@#$Value!" }`
**When** DTO validation is performed
**Then** step 1 passes (string type matches)
**And** step 2 passes (key exists)
**And** step 3 passes (string type matches)
**And** step 4 passes (no custom validation)
**And** system proceeds to update operation