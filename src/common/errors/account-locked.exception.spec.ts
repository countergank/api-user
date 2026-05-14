import { HttpException } from '@nestjs/common';
import { AccountLockedException } from './account-locked.exception';

describe(AccountLockedException.name, () => {
  it('should be an instance of HttpException', () => {
    const exception = new AccountLockedException();
    expect(exception).toBeInstanceOf(HttpException);
  });

  it('should return HTTP status 423 (Locked)', () => {
    const exception = new AccountLockedException();
    expect(exception.getStatus()).toBe(423);
  });

  it('should use ACCOUNT_LOCKED as response message for i18n translation', () => {
    const exception = new AccountLockedException();
    const response = exception.getResponse();
    expect(response).toBe('ACCOUNT_LOCKED');
  });
});
