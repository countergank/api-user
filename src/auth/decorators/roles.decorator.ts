import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../user/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator para requerir roles específicos en un endpoint.
 * @example
 * @Roles(UserRole.ADMIN)
 * @Post()
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);