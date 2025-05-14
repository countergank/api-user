import { UserEmailAlreadyExistsError, UserError, UserNameAlreadyExistsError, UserNotFoundError, UserPopulateError } from './error-instances.error';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

describe(UserError.name, () => {
  it(`should create en instance of ${UserError.name}`, () => {
    const error = new UserError();

    expect(error).toBeInstanceOf(UserError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.Base]);
    expect(error.code.includes(ErrorCodes.Base)).toBeTruthy();
  });
});

describe(UserEmailAlreadyExistsError.name, () => {
  it(`should create en instance of ${UserEmailAlreadyExistsError.name}`, () => {
    const error = new UserEmailAlreadyExistsError();

    expect(error).toBeInstanceOf(UserEmailAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.UserEmailAlreadyExists]);
    expect(error.code.includes(ErrorCodes.UserEmailAlreadyExists)).toBeTruthy();
  });
});

describe(UserNameAlreadyExistsError.name, () => {
  it(`should create en instance of ${UserNameAlreadyExistsError.name}`, () => {
    const error = new UserNameAlreadyExistsError();

    expect(error).toBeInstanceOf(UserNameAlreadyExistsError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.UserNameAlreadyExists]);
    expect(error.code.includes(ErrorCodes.UserNameAlreadyExists)).toBeTruthy();
  });
});

describe(UserNotFoundError.name, () => {
  it(`should create en instance of ${UserNotFoundError.name}`, () => {
    const error = new UserNotFoundError();

    expect(error).toBeInstanceOf(UserNotFoundError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.UserNotFound]);
    expect(error.code.includes(ErrorCodes.UserNotFound)).toBeTruthy();
  });
});

describe(UserPopulateError.name, () => {
  it(`should create en instance of ${UserPopulateError.name}`, () => {
    const error = new UserPopulateError();

    expect(error).toBeInstanceOf(UserPopulateError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.UserPopulate]);
    expect(error.code.includes(ErrorCodes.UserPopulate)).toBeTruthy();
  });
});