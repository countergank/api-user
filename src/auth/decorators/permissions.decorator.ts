import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares the permissions a handler or controller requires.
 *
 * The `PermissionGuard` enforces that the authenticated user holds every listed
 * permission and rejects otherwise with 403 `UA-SEC-002`. The required
 * permissions are also surfaced in Swagger as a 403 response.
 *
 * @param permissions One or more permission names (for example `role:read`).
 *
 * @remarks
 * This decorator rejects an empty permission list at decoration time by throwing
 * an error. A call such as `@RequirePermissions()` would otherwise store empty
 * metadata that the guard reads as "no permission required". An endpoint that
 * must stay unrestricted has to omit the decorator entirely instead.
 */
export const RequirePermissions = (...permissions: string[]) => {
  if (permissions.length === 0) {
    throw new Error(
      '@RequirePermissions requires at least one permission name; omit the decorator for endpoints that must stay unrestricted',
    );
  }

  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    ApiForbiddenResponse({
      description: `Requires permissions: ${permissions.join(', ')}`,
    }),
  );
};
