import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Requires the authenticated user to hold every listed permission.
 *
 * Persists the permission metadata read by `PermissionGuard` and documents the
 * resulting 403 response in Swagger.
 */
export const RequirePermissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    ApiForbiddenResponse({
      description: `Requires permissions: ${permissions.join(', ')}`,
    }),
  );
