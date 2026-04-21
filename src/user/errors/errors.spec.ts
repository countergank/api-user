import { UserEmailAlreadyExistsError, UserNameAlreadyExistsError, UserNotFoundError } from './error-instances.error';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

describe(UserEmailAlreadyExistsError.name, () => {
  it(`should create an instance of ${UserEmailAlreadyExistsError.name}`, () => {
    const error = new UserEmailAlreadyExistsError();

    expect(error).toBeInstanceOf(UserEmailAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.UserEmailAlreadyExists]);
    expect(error.code.includes(ErrorCodes.UserEmailAlreadyExists)).toBeTruthy();
  });
});

describe(UserNameAlreadyExistsError.name, () => {
  it(`should create an instance of ${UserNameAlreadyExistsError.name}`, () => {
    const error = new UserNameAlreadyExistsError();

    expect(error).toBeInstanceOf(UserNameAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.UserNameAlreadyExists]);
    expect(error.code.includes(ErrorCodes.UserNameAlreadyExists)).toBeTruthy();
  });
});

describe(UserNotFoundError.name, () => {
  it(`should create an instance of ${UserNotFoundError.name}`, () => {
    const error = new UserNotFoundError();

    expect(error).toBeInstanceOf(UserNotFoundError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.UserNotFound]);
    expect(error.code.includes(ErrorCodes.UserNotFound)).toBeTruthy();
  });
});
