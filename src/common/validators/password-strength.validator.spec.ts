import { PasswordStrengthValidator } from './password-strength.validator';
import { PASSWORD_ERROR_CODES, PASSWORD_RULES } from '../interfaces/password-validation.interface';

describe(PasswordStrengthValidator.name, () => {
  let validator: PasswordStrengthValidator;

  beforeEach(() => {
    validator = new PasswordStrengthValidator();
  });

  describe('validate()', () => {
    it('should be defined', () => {
      expect(validator).toBeDefined();
    });

    describe('Rule 1: Minimum 8 characters', () => {
      it('should accept passwords with 8 characters', () => {
        expect(validator.validate('Xyzdefg1@')).toBe(true);
      });

      it('should accept passwords with more than 8 characters', () => {
        expect(validator.validate('Xyzdefghi1@')).toBe(true);
      });

      it('should reject passwords with 7 characters', () => {
        expect(validator.validate('Xyzefg1')).toBe(false); // Only 7 chars
      });
    });

    describe('Rule 2: At least 1 lowercase letter', () => {
      it('should accept passwords with lowercase letter', () => {
        expect(validator.validate('Xyzdefg1@')).toBe(true);
      });

      it('should reject passwords without lowercase letter', () => {
        expect(validator.validate('XYZDEFG1@')).toBe(false);
      });
    });

    describe('Rule 3: At least 1 uppercase letter', () => {
      it('should accept passwords with uppercase letter', () => {
        expect(validator.validate('Xyzdefg1@')).toBe(true);
      });

      it('should reject passwords without uppercase letter', () => {
        expect(validator.validate('xyzdefgh1@')).toBe(false);
      });
    });

    describe('Rule 4: At least 1 number', () => {
      it('should accept passwords with number', () => {
        expect(validator.validate('Xyzdefg1@')).toBe(true);
      });

      it('should reject passwords without number', () => {
        expect(validator.validate('Xyzdefgh@')).toBe(false);
      });
    });

    describe('Rule 5: At least 1 special character', () => {
      const specialChars = PASSWORD_RULES.SPECIAL_CHARS.split('');

      it('should accept passwords with @', () => {
        expect(validator.validate('Xyzdefg1@')).toBe(true);
      });

      it('should accept passwords with $', () => {
        expect(validator.validate('Xyzdefg1$')).toBe(true);
      });

      it('should accept passwords with !', () => {
        expect(validator.validate('Xyzdefg1!')).toBe(true);
      });

      it('should accept passwords with %', () => {
        expect(validator.validate('Xyzdefg1%')).toBe(true);
      });

      it('should accept passwords with *', () => {
        expect(validator.validate('Xyzdefg1*')).toBe(true);
      });

      it('should accept passwords with ?', () => {
        expect(validator.validate('Xyzdefg1?')).toBe(true);
      });

      it('should accept passwords with &', () => {
        expect(validator.validate('Xyzdefg1&')).toBe(true);
      });

      it('should reject passwords without special character', () => {
        expect(validator.validate('Xyzdefgh1')).toBe(false);
      });

      it('should reject passwords with non-allowed special characters', () => {
        expect(validator.validate('Xyzdefgh1#')).toBe(false);
      });
    });

    describe('Rule 6: Maximum 64 characters', () => {
      it('should accept passwords with 64 characters', () => {
        // Create 64-char password without repeated chars
        const password = 'A1@' + 'b2$' + 'C3%' + 'd4&' + 'E5!' + 'f6?' + 'G7@' + 'h8$' + 'I9%' + 'j0&' + 'K1!' + 'l2?';
        expect(validator.validate(password)).toBe(true);
      });

      it('should accept passwords with less than 64 characters', () => {
        expect(validator.validate('Xyzdefghi1@')).toBe(true);
      });

      it('should reject passwords with more than 64 characters', () => {
        const password = 'A'.repeat(65);
        expect(validator.validate(password)).toBe(false);
      });
    });

    describe('Rule 7: No consecutive repeated characters', () => {
      it('should accept passwords without repeated characters', () => {
        expect(validator.validate('Xyzdefg1@')).toBe(true);
      });

      it('should reject passwords with "aa"', () => {
        expect(validator.validate('Xyzdefgaa1@')).toBe(false);
      });

      it('should reject passwords with "11"', () => {
        expect(validator.validate('Xyzdefg11@')).toBe(false);
      });

      it('should reject passwords with "@@"', () => {
        expect(validator.validate('Xyzdefg1@@')).toBe(false);
      });
    });

    describe('Rule 8: No common sequences', () => {
      const commonSequences = PASSWORD_RULES.COMMON_SEQUENCES;

      it('should accept passwords without common sequences', () => {
        expect(validator.validate('Xyzdefg1@')).toBe(true);
      });

      it('should reject passwords containing "123"', () => {
        expect(validator.validate('Xyzdef123@')).toBe(false);
      });

      it('should reject passwords containing "abc" (lowercase)', () => {
        expect(validator.validate('ABCabc123@')).toBe(false);
      });

      it('should reject passwords containing "abc" (case-insensitive)', () => {
        expect(validator.validate('ABCabc123@')).toBe(false);
      });

      it('should reject passwords containing "qwe"', () => {
        expect(validator.validate('qweTest1@')).toBe(false);
      });

      it('should reject passwords containing "asd"', () => {
        expect(validator.validate('asdTest1@')).toBe(false);
      });

      it('should reject passwords containing "zxc"', () => {
        expect(validator.validate('zxcTest1@')).toBe(false);
      });
    });

    describe('Valid passwords', () => {
      it('should accept "Xyzdefg1@"', () => {
        expect(validator.validate('Xyzdefg1@')).toBe(true);
      });

      it('should accept "MyP@sw0rd!"', () => {
        expect(validator.validate('MyP@sw0rd!')).toBe(true);
      });

      it('should accept "Us3r#Ps2024$"', () => {
        expect(validator.validate('Us3r#Ps2024$')).toBe(true);
      });
    });

    describe('Multiple validation failures', () => {
      it('should return all applicable errors', () => {
        const errors = validator.validatePassword('PASS');
        expect(errors).toContain(PASSWORD_ERROR_CODES.MIN_LENGTH);
        expect(errors).toContain(PASSWORD_ERROR_CODES.LOWERCASE);
        expect(errors).toContain(PASSWORD_ERROR_CODES.NUMBER);
        expect(errors).toContain(PASSWORD_ERROR_CODES.SPECIAL_CHAR);
        expect(errors.length).toBeGreaterThanOrEqual(4);
      });

      it('should reject weak password with multiple errors', () => {
        expect(validator.validate('password')).toBe(false);
        const errors = validator.validatePassword('password');
        expect(errors).toContain(PASSWORD_ERROR_CODES.UPPERCASE);
        expect(errors).toContain(PASSWORD_ERROR_CODES.NUMBER);
        expect(errors).toContain(PASSWORD_ERROR_CODES.SPECIAL_CHAR);
      });
    });
  });

  describe('validatePassword()', () => {
    it('should return empty array for valid password', () => {
      expect(validator.validatePassword('Xyzdefg1@')).toEqual([]);
    });

    it('should return error codes for invalid password', () => {
      const errors = validator.validatePassword('short');
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return specific error codes', () => {
      const errors = validator.validatePassword('XYZ');
      expect(errors).toContain(PASSWORD_ERROR_CODES.MIN_LENGTH);
      expect(errors).toContain(PASSWORD_ERROR_CODES.LOWERCASE);
      expect(errors).toContain(PASSWORD_ERROR_CODES.NUMBER);
      expect(errors).toContain(PASSWORD_ERROR_CODES.SPECIAL_CHAR);
    });
  });

  describe('buildErrors()', () => {
    it('should return ValidationError array', () => {
      const errors = validator.buildErrors('short');
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should include property name', () => {
      const errors = validator.buildErrors('short');
      expect(errors[0].property).toBe('password');
    });
  });

  describe('defaultMessage()', () => {
    it('should return code:message format', () => {
      const message = validator.defaultMessage({ property: 'password' } as any);
      expect(message).toContain(':');
      expect(message).toContain('PASSWORD_');
    });
  });
});