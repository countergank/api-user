import { UserEmailAlreadyExistsError } from './user-email-already-exists.error';
import { UserNameAlreadyExistsError } from './user-name-already-exists.error';
import { UserNotFoundError } from './user-not-found.error';
import {
  USER_EMAIL_ALREADY_EXISTS_ERROR,
  USER_NAME_ALREADY_EXISTS_ERROR,
  USER_NOT_FOUND_ERROR,
} from './user.dictionary';

describe(UserEmailAlreadyExistsError.name, () => {
  it(`should create an instance of ${UserEmailAlreadyExistsError.name}`, () => {
    const error = new UserEmailAlreadyExistsError('Custom error message');

    expect(error).toBeInstanceOf(UserEmailAlreadyExistsError);
    expect(error.message).toBe(USER_EMAIL_ALREADY_EXISTS_ERROR.msg);
    expect(error.code).toBe(USER_EMAIL_ALREADY_EXISTS_ERROR.code);
  });
});

describe(UserNameAlreadyExistsError.name, () => {
  it(`should create an instance of ${UserNameAlreadyExistsError.name}`, () => {
    const error = new UserNameAlreadyExistsError('Custom error message');

    expect(error).toBeInstanceOf(UserNameAlreadyExistsError);
    expect(error.message).toBe(USER_NAME_ALREADY_EXISTS_ERROR.msg);
    expect(error.code).toBe(USER_NAME_ALREADY_EXISTS_ERROR.code);
  });
});

describe(UserNotFoundError.name, () => {
  it(`should create an instance of ${UserNotFoundError.name}`, () => {
    const error = new UserNotFoundError('Custom error message');

    expect(error).toBeInstanceOf(UserNotFoundError);
    expect(error.message).toBe(USER_NOT_FOUND_ERROR.msg);
    expect(error.code).toBe(USER_NOT_FOUND_ERROR.code);
  });
});
