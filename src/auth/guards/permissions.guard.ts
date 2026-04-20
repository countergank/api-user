import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userPermissions = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every((perm) => {
      // Wildcard permission
      if (userPermissions.includes('*')) {
        return true;
      }
      // Check exact permission or resource wildcard (e.g., 'timer:*')
      return (
        userPermissions.includes(perm) ||
        userPermissions.some((_p) => {
          const [resource] = perm.split(':');
          return userPermissions.includes(`${resource}:*`);
        })
      );
    });

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
