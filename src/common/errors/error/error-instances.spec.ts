import { GenericError } from './error-instances.error';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

describe(GenericError.name, () => {
  it(`should create en instance of ${GenericError.name}`, () => {
    const error = new GenericError();

    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.Base]);
    expect(error.code.includes(ErrorCodes.Base)).toBeTruthy();
  });
});
