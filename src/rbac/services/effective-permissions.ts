/**
 * Pure effective-permissions resolution (issues #489 and #536).
 *
 * Lives in its own module, separate from `RoleService`, so services that
 * resolve permissions (`AuthService`, `UserService`) never import the
 * service file that depends on them — `role.service.ts` imports
 * `UserService`, and a direct import back would create a circular file
 * dependency that Nest cannot resolve at DI time.
 *
 * The role's permissions are the base (a user with no explicit permissions
 * inherits them); the user's own permissions are additive grants. The result
 * is deduplicated while preserving order — role permissions first, then any
 * additional explicit grants. A wildcard (`*`) is passed through unchanged.
 */
export function mergeEffectivePermissions(rolePermissions: string[], userPermissions: string[]): string[] {
  return [...new Set([...rolePermissions, ...userPermissions])];
}
