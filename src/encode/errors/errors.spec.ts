import { GENERATING_HASH_ERROR } from './encode.dictionary';
import { GeneratingHashError } from './generating-hash.error';

describe(GeneratingHashError.name, () => {
  it(`should create an instance of ${GeneratingHashError.name}`, () => {
    const error = new GeneratingHashError('Custom error message');

    expect(error).toBeInstanceOf(GeneratingHashError);
    expect(error.message).toBe(GENERATING_HASH_ERROR.msg);
    expect(error.code).toBe(GENERATING_HASH_ERROR.code);
  });
});
