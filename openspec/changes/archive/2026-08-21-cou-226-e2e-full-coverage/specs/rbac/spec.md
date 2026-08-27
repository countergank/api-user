# Delta for rbac

## ADDED Requirements

### Requirement: Update role permissions

The system MUST support updating a role's permissions via PUT /roles/:id/permissions.

#### Scenario: Update role permissions successfully

- GIVEN a role exists with ID "roleId123" and current permissions ["read"]
- WHEN authenticated admin sends PUT /roles/roleId123/permissions with { permissions: ["read", "write"] }
- THEN returns HTTP 200 with updated role object
- AND the role's permissions are updated in the database
- AND the RBAC cache is invalidated

#### Scenario: Update role permissions — role not found

- GIVEN no role exists with ID "nonexistent"
- WHEN authenticated admin sends PUT /roles/nonexistent/permissions with valid body
- THEN returns HTTP 404 Not Found

#### Scenario: Update role permissions — invalid permission

- GIVEN valid permissions list includes ["read", "write", "delete"]
- WHEN authenticated admin sends PUT /roles/:id/permissions with { permissions: ["read", "nonexistent_perm"] }
- THEN returns HTTP 400 with invalid-permission error

#### Scenario: Update role requires admin role

- GIVEN authenticated user with non-admin role
- WHEN PUT /roles/:id/permissions is called
- THEN returns HTTP 403 Forbidden

#### Scenario: Update role requires authentication

- WHEN PUT /roles/:id/permissions is called without Authorization header
- THEN returns HTTP 401 Unauthorized
