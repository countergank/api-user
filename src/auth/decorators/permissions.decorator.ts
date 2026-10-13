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
 * Footgun: calling this decorator with no arguments — `@RequirePermissions()` —
 * stores an empty permission list. The guard treats absent **or** empty metadata
 * as "no permission required" and lets the request through, so the endpoint
 * stays reachable by any authenticated user. Always pass at least one
 * permission; when an endpoint is intentionally unrestricted, omit the
 * decorator entirely instead.
 */
export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    ApiForbiddenResponse({
      description: `Requires permissions: ${permissions.join(', ')}`,
    }),
  );
