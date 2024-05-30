import { AppVersionNotFoundError } from './app-version-not-found.error';
import { AppErrorAlias, AppErrorMessage } from './app.dictionary';

describe(AppVersionNotFoundError.name, () => {
  it(`should create en instance of ${AppVersionNotFoundError.name}`, () => {
    const error = new AppVersionNotFoundError('Custom error message');

    expect(error).toBeInstanceOf(AppVersionNotFoundError);
    expect(error.message).toBe(AppErrorMessage[AppErrorAlias.AppVersionNotFound]);
    expect(error.code.includes(AppErrorAlias.AppVersionNotFound)).toBeTruthy();
  });
});
