import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { DomainError } from '../../common/errors/domain.error';

/**
 * Guard que evalúa si el usuario tiene el rol requerido.
 * Se usa junto con el decorator @Roles().
 * @example
 * @Roles(UserRole.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw DomainError.fromKind('FORBIDDEN');
    }

    const userRole = user.role;

    if (!userRole) {
      throw DomainError.fromKind('FORBIDDEN');
    }

    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw DomainError.fromKind('FORBIDDEN');
    }

    return true;
  }
}
