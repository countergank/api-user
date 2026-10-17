import { User, UserRole } from '../../user/entities/user.entity';
import { MeResponseDTO } from './me-response.dto';

describe(MeResponseDTO.name, () => {
  const input = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Juan',
    lastName: 'Pérez',
    email: 'juan@example.com',
    role: UserRole.ADMIN,
    permissions: ['*'],
    // Internal / sensitive fields that MUST NOT leak through the DTO whitelist.
    password: 'hashed-secret',
    resetPasswordToken: 'reset-token',
    emailVerificationToken: 'verify-token',
    pendingEmailToken: 'pending-token',
    failedLoginAttempts: 3,
    lockedUntil: new Date('2030-01-01T00:00:00.000Z'),
    deletedAt: new Date('2030-01-01T00:00:00.000Z'),
    isActive: true,
    userName: 'juanperez',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    _id: 'mongo-object-id',
    __v: 0,
  } as unknown as User;

  it('maps the six whitelisted fields from the user', () => {
    const result = MeResponseDTO.of(input);

    expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.name).toBe('Juan');
    expect(result.lastName).toBe('Pérez');
    expect(result.email).toBe('juan@example.com');
    expect(result.role).toBe(UserRole.ADMIN);
    expect(result.permissions).toEqual(['*']);
  });

  it('exposes exactly the six expected keys (no internal field leaks)', () => {
    const result = MeResponseDTO.of(input);

    expect(Object.keys(result)).toEqual(['id', 'name', 'lastName', 'email', 'role', 'permissions']);
  });

  it('never copies sensitive or internal fields present on the input', () => {
    const result = MeResponseDTO.of(input);

    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('resetPasswordToken');
    expect(result).not.toHaveProperty('emailVerificationToken');
    expect(result).not.toHaveProperty('pendingEmailToken');
    expect(result).not.toHaveProperty('failedLoginAttempts');
    expect(result).not.toHaveProperty('lockedUntil');
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('isActive');
    expect(result).not.toHaveProperty('userName');
    expect(result).not.toHaveProperty('createdAt');
    expect(result).not.toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('_id');
    expect(result).not.toHaveProperty('__v');
  });
});
