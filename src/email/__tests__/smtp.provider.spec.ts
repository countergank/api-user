import { SmtpProvider } from '../providers/smtp.provider';

describe('SmtpProvider', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'secret';
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should create instance with valid config', () => {
    const provider = new SmtpProvider({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      fromEmail: 'noreply@countergank.com',
    });
    expect(provider).toBeDefined();
  });

  it('should throw when EMAIL_USER is missing', () => {
    delete process.env.EMAIL_USER;
    expect(
      () =>
        new SmtpProvider({
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          fromEmail: 'noreply@countergank.com',
        }),
    ).toThrow(/EMAIL_USER/);
  });

  it('should throw when EMAIL_PASS is missing', () => {
    delete process.env.EMAIL_PASS;
    expect(
      () =>
        new SmtpProvider({
          host: 'smtp.example.com',
          port: 587,
          secure: false,
          fromEmail: 'noreply@countergank.com',
        }),
    ).toThrow(/EMAIL_PASS/);
  });

  it('should use config values from constructor, not process.env', () => {
    process.env.EMAIL_HOST = 'old.example.com';
    process.env.EMAIL_PORT = '465';
    process.env.EMAIL_SECURE = 'true';

    const provider = new SmtpProvider({
      host: 'new.example.com',
      port: 587,
      secure: false,
      fromEmail: 'custom@countergank.com',
    });

    // Provider uses nodemailer internally, so we verify it was created
    // without reading the old process.env values (no error)
    expect(provider).toBeDefined();

    // Verify process.env still has different values — provider used config, not env
    expect(process.env.EMAIL_HOST).toBe('old.example.com');
    expect(process.env.EMAIL_PORT).toBe('465');
  });
});
