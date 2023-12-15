import {
  USER_EMAIL_ALREADY_EXISTS_ERROR,
  USER_NAME_ALREADY_EXISTS_ERROR,
  USER_NOT_FOUND_ERROR,
} from './user.dictionary';

describe('Dictionary codes', () => {
  it('should match all errors codes', () => {
    expect(USER_NOT_FOUND_ERROR.code).toBe('EUSR01');
    expect(USER_NAME_ALREADY_EXISTS_ERROR.code).toBe('EUSR02');
    expect(USER_EMAIL_ALREADY_EXISTS_ERROR.code).toBe('EUSR03');
  });
});
