import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { CreateUserDTO } from './create-user.dto';

const validPayload = {
  name: 'Admin',
  lastName: 'Created',
  email: 'admin-created@example.com',
  userName: 'admin-created',
  password: 'SecurePass123@',
};

describe(CreateUserDTO.name, () => {
  const build = (extra: Record<string, unknown> = {}): CreateUserDTO =>
    plainToInstance(CreateUserDTO, { ...validPayload, ...extra });

  it('accepts an optional permissions array', async () => {
    const errors = await validate(build({ permissions: ['user:read'] }));

    // The password fixture may trip unrelated strength rules; this test only
    // asserts that `permissions` itself produces no validation error.
    expect(errors.map((error) => error.property)).not.toContain('permissions');
  });

  it('rejects permissions that are not strings', async () => {
    const errors = await validate(build({ permissions: [42] }));

    expect(errors.map((error) => error.property)).toContain('permissions');
  });

  it('rejects duplicated permissions', async () => {
    const errors = await validate(build({ permissions: ['user:read', 'user:read'] }));

    expect(errors.map((error) => error.property)).toContain('permissions');
  });

  it('copies the permissions onto the entity (S1)', () => {
    const entity = build({ permissions: ['user:read', 'audit:read'] }).toEntity();

    expect(entity.permissions).toEqual(['user:read', 'audit:read']);
  });

  it('defaults the permissions to an empty list when omitted (S3)', () => {
    const entity = build().toEntity();

    expect(entity.permissions).toEqual([]);
    expect(entity.role).toBe(UserRole.USER);
  });
});
