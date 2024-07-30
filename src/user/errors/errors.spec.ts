import { UserEmailAlreadyExistsError } from './user-email-already-exists.error';
import { UserNameAlreadyExistsError } from './user-name-already-exists.error';
import { UserNotFoundError } from './user-not-found.error';
import { UserErrorAlias, UserErrorMessage } from './user.dictionary';

describe(UserEmailAlreadyExistsError.name, () => {
  it(`should create an instance of ${UserEmailAlreadyExistsError.name}`, () => {
    const error = new UserEmailAlreadyExistsError();

    expect(error).toBeInstanceOf(UserEmailAlreadyExistsError);
    expect(error.message).toBe(UserErrorMessage[UserErrorAlias.UserEmailAlreadyExists]);
    expect(error.code.includes(UserErrorAlias.UserEmailAlreadyExists)).toBeTruthy();
  });
});

describe(UserNameAlreadyExistsError.name, () => {
  it(`should create an instance of ${UserNameAlreadyExistsError.name}`, () => {
    const error = new UserNameAlreadyExistsError();

    expect(error).toBeInstanceOf(UserNameAlreadyExistsError);
    expect(error.message).toBe(UserErrorMessage[UserErrorAlias.UserNameAlreadyExists]);
    expect(error.code.includes(UserErrorAlias.UserNameAlreadyExists)).toBeTruthy();
  });
});

describe(UserNotFoundError.name, () => {
  it(`should create an instance of ${UserNotFoundError.name}`, () => {
    const error = new UserNotFoundError();

    expect(error).toBeInstanceOf(UserNotFoundError);
    expect(error.message).toBe(UserErrorMessage[UserErrorAlias.UserNotFound]);
    expect(error.code.includes(UserErrorAlias.UserNotFound)).toBeTruthy();
  });
});
