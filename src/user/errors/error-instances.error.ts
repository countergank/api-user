import { ErrorBase } from "src/common/errors/error-base/error-base";
import { ErrorCodes, ErrorMessages } from "./error.dictionary";
import { ErrorBaseEnum } from "src/common/errors/error-base/error-base.enums";


export class UserError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.User;
    const code = ErrorCodes.Base;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error);
    Object.setPrototypeOf(this, UserError.prototype);
  }
}

export class UserEmailAlreadyExistsError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.User;
    const code = ErrorCodes.UserEmailAlreadyExists;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error);
    Object.setPrototypeOf(this, UserEmailAlreadyExistsError.prototype);
  }
}

export class UserNameAlreadyExistsError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.User;
    const code = ErrorCodes.UserNameAlreadyExists;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error);
    Object.setPrototypeOf(this, UserNameAlreadyExistsError.prototype);
  }
}

export class UserNotFoundError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.User;
    const code = ErrorCodes.UserNotFound;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error);
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

export class UserPopulateError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.User;
    const code = ErrorCodes.UserPopulate;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error);
    Object.setPrototypeOf(this, UserPopulateError.prototype);
  }
}

export const UserErrors = [
  new UserError().getErrorPublic(),
  new UserEmailAlreadyExistsError().getErrorPublic(),
  new UserNameAlreadyExistsError().getErrorPublic(),
  new UserNotFoundError().getErrorPublic(),
  new UserPopulateError().getErrorPublic(),
];
