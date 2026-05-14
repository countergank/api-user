import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDTO } from './update-user.dto';
import { UserRole } from '../entities/user.entity';

describe(UpdateUserDTO.name, () => {
  it('should pass validation with valid partial payload', async () => {
    const dto = plainToInstance(UpdateUserDTO, { name: 'Juan' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with all fields', async () => {
    const dto = plainToInstance(UpdateUserDTO, {
      name: 'Juan',
      lastName: 'Pérez',
      email: 'juan@example.com',
      userName: 'juanperez',
      role: UserRole.ADMIN,
      permissions: ['users:read'],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid email format', async () => {
    const dto = plainToInstance(UpdateUserDTO, { email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation with non-string name', async () => {
    const dto = plainToInstance(UpdateUserDTO, { name: 123 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation with invalid role enum', async () => {
    const dto = plainToInstance(UpdateUserDTO, { role: 'invalid-role' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('role');
  });

  it('should pass validation with empty object (all optional)', async () => {
    const dto = plainToInstance(UpdateUserDTO, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
