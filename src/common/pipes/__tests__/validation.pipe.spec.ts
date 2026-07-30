import { HttpStatus } from '@nestjs/common';
import { ValidationPipe } from '../validation.pipe';

describe(ValidationPipe.name, () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should extend NestJS ValidationPipe', () => {
    expect(pipe).toBeInstanceOf(require('@nestjs/common').ValidationPipe);
  });

  describe('exceptionFactory', () => {
    it('should create HttpException with 400 status for validation errors', () => {
      const errors = [
        {
          property: 'email',
          constraints: { isEmail: 'email must be a valid email' },
          children: [] as any[],
        },
      ];

      const exception = (pipe as any).exceptionFactory(errors);

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      const response = exception.getResponse();
      expect(response).toHaveProperty('statusCode', HttpStatus.BAD_REQUEST);
      expect(response).toHaveProperty('code', 'UA-COM-005');
      expect(response).toHaveProperty('message', 'Validation failed');
    });

    it('should include details with property and constraints keys', () => {
      const errors = [
        {
          property: 'email',
          constraints: { isEmail: 'email must be valid', isNotEmpty: 'email is required' },
          children: [] as any[],
        },
      ];

      const exception = (pipe as any).exceptionFactory(errors);
      const response = exception.getResponse() as any;

      expect(response.details).toBeDefined();
      expect(response.details).toHaveLength(1);
      expect(response.details[0].property).toBe('email');
      expect(response.details[0].constraints).toEqual(['isEmail', 'isNotEmpty']);
    });

    it('should handle multiple validation errors', () => {
      const errors = [
        {
          property: 'email',
          constraints: { isEmail: 'email must be valid' },
          children: [] as any[],
        },
        {
          property: 'password',
          constraints: { minLength: 'password is too short' },
          children: [] as any[],
        },
      ];

      const exception = (pipe as any).exceptionFactory(errors);
      const response = exception.getResponse() as any;

      expect(response.details).toHaveLength(2);
      expect(response.details[0].property).toBe('email');
      expect(response.details[1].property).toBe('password');
    });

    it('should pass through validation to the parent pipe', () => {
      // Validate that the pipe can actually be used — it should be a real ValidationPipe
      expect(typeof (pipe as any).transform).toBe('function');
    });
  });
});
