import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { PERMISSIONS_KEY, RequirePermissions } from './permissions.decorator';

describe('RequirePermissions decorator', () => {
  it('should throw when called with no permission names', () => {
    expect(() => RequirePermissions()).toThrow(
      '@RequirePermissions requires at least one permission name; omit the decorator for endpoints that must stay unrestricted',
    );
  });

  it('should store the permission names under PERMISSIONS_KEY', () => {
    const decorator = RequirePermissions('role:read', 'role:update');
    const target = {};

    decorator(target, 'testMethod', undefined);

    expect(Reflect.getMetadata(PERMISSIONS_KEY, target)).toEqual(['role:read', 'role:update']);
  });

  it('should attach the Swagger 403 ApiForbiddenResponse carrying the permission names', () => {
    const decorator = RequirePermissions('role:read', 'role:update');
    const target = {};

    decorator(target, 'testMethod', undefined);

    const responses = Reflect.getMetadata(DECORATORS.API_RESPONSE, target) as Record<string, { description: string }>;

    expect(responses['403']).toBeDefined();
    expect(responses['403'].description).toContain('role:read');
    expect(responses['403'].description).toContain('role:update');
  });
});
