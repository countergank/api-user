import { ExampleInstanceError } from './app-version-not-found.error';
import { AppErrorAlias, AppErrorMessage } from './app.dictionary';

describe(ExampleInstanceError.name, () => {
  it(`should create en instance of ${ExampleInstanceError.name}`, () => {
    const error = new ExampleInstanceError('Custom error message');

    expect(error).toBeInstanceOf(ExampleInstanceError);
    expect(error.message).toBe(AppErrorMessage[AppErrorAlias.ExampleAlias]);
    expect(error.code.includes(AppErrorAlias.ExampleAlias)).toBeTruthy();
  });
});
