import { AppError } from './error-instances.error';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

describe(AppError.name, () => {
  it(`should create en instance of ${AppError.name}`, () => {
    const error = new AppError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.Base]);
    expect(error.code.includes(ErrorCodes.Base)).toBeTruthy();
  });
});
