import { VERSION_NOT_FOUND_ERROR } from './root.dictionary';
import { VersionNotFoundError } from './version-not-found.error';

describe(VersionNotFoundError.name, () => {
  it(`should create an instance of ${VersionNotFoundError.name}`, () => {
    const error = new VersionNotFoundError('Custom error message');

    expect(error).toBeInstanceOf(VersionNotFoundError);
    expect(error.message).toBe(VERSION_NOT_FOUND_ERROR.msg);
    expect(error.code).toBe(VERSION_NOT_FOUND_ERROR.code);
  });
});
