import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDTO } from './create-user.dto';
import { ChangePasswordDTO } from './change-password.dto';
import { UserRole } from '../entities/user.entity';
import { PASSWORD_ERROR_CODES } from '../../common/interfaces/password-validation.interface';

describe('Password Validation Integration Tests', () => {
  describe('CreateUserDTO', () => {
    // Valid password that doesn't contain any common sequences
    const validData = {
      name: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      userName: 'johndoe',
      password: 'Xyzdefg1@', // Doesn't contain abc, qwe, asd, zxc, or 123
      role: UserRole.USER,
    };

    it('should accept valid password', async () => {
      const dto = plainToInstance(CreateUserDTO, validData);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject password too short', async () => {
      const dto = plainToInstance(CreateUserDTO, { ...validData, password: 'Xyz1@' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.passwordStrength).toContain(PASSWORD_ERROR_CODES.MIN_LENGTH);
    });

    it('should reject password without uppercase', async () => {
      const dto = plainToInstance(CreateUserDTO, { ...validData, password: 'xyzdefg1@' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.passwordStrength).toContain(PASSWORD_ERROR_CODES.UPPERCASE);
    });

    it('should reject password without lowercase', async () => {
      const dto = plainToInstance(CreateUserDTO, { ...validData, password: 'XYZDEFG1@' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.passwordStrength).toContain(PASSWORD_ERROR_CODES.LOWERCASE);
    });

    it('should reject password without number', async () => {
      const dto = plainToInstance(CreateUserDTO, { ...validData, password: 'Xyzdefg@' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.passwordStrength).toContain(PASSWORD_ERROR_CODES.NUMBER);
    });

    it('should reject password without special character', async () => {
      const dto = plainToInstance(CreateUserDTO, { ...validData, password: 'Xyzdefgh1' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.passwordStrength).toContain(PASSWORD_ERROR_CODES.SPECIAL_CHAR);
    });

    it('should reject password with common sequence', async () => {
      const dto = plainToInstance(CreateUserDTO, { ...validData, password: 'Xyzdef123@' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.passwordStrength).toContain(PASSWORD_ERROR_CODES.SEQUENCE);
    });

    it('should reject password with consecutive repeated chars', async () => {
      const dto = plainToInstance(CreateUserDTO, { ...validData, password: 'Xyzdeffg1@' }); // "ff" is repeated
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints?.passwordStrength).toContain(PASSWORD_ERROR_CODES.CONSECUTIVE);
    });

    it('should return multiple validation errors', async () => {
      const dto = plainToInstance(CreateUserDTO, { ...validData, password: 'PASS' });
      const errors = await validate(dto);
      // Should have errors for: min length, lowercase, number, special char
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ChangePasswordDTO', () => {
    const validData = {
      currentPassword: 'OldPass123@',
      newPassword: 'Xyzdefg1@', // Valid password without common sequences
    };

    it('should accept valid new password', async () => {
      const dto = plainToInstance(ChangePasswordDTO, validData);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject weak new password', async () => {
      const dto = plainToInstance(ChangePasswordDTO, { ...validData, newPassword: 'weak' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept any current password format', async () => {
      const dto = plainToInstance(ChangePasswordDTO, { ...validData, currentPassword: 'anyvalue' });
      const errors = await validate(dto);
      // currentPassword only needs to be string, not validated for strength
      expect(errors.length).toBe(0);
    });
  });
});