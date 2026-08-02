import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { DomainError } from '../../common/errors/domain.error';

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
      throw DomainError.fromKind('FORBIDDEN');
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
      throw DomainError.fromKind('FORBIDDEN');
    }

    return true;
  }
}
