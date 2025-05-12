import { AppError, AppVersionNotFoundError } from "./error-instances.error";
import { ErrorCodes, ErrorMessages } from "./error.dictionary";


describe(AppError.name, () => {
  it(`should create en instance of ${AppError.name}`, () => {
    const error = new AppError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.Base]);
    expect(error.code.includes(ErrorCodes.Base)).toBeTruthy();
  });
});


describe(AppVersionNotFoundError.name, () => {
  it(`should create en instance of ${AppVersionNotFoundError.name}`, () => {
    const error = new AppVersionNotFoundError();

    expect(error).toBeInstanceOf(AppVersionNotFoundError);
    expect(error.message).toBe(ErrorMessages[ErrorCodes.AppVersionNotFound]);
    expect(error.code.includes(ErrorCodes.AppVersionNotFound)).toBeTruthy();
  });
});
