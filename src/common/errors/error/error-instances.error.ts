import { ErrorBase } from '../error-base/error-base';
import { ErrorBaseEnum } from '../error-base/error-base.enums';
import { ErrorCodes, ErrorMessages } from './error.dictionary';

export class GenericError extends ErrorBase {
  constructor(e?: unknown) {
    const errorGroup = ErrorBaseEnum.Common;
    const code = ErrorCodes.Base;
    const message = ErrorMessages[code];
    const error = e ?? message;
    super(errorGroup, code, error);
    Object.setPrototypeOf(this, GenericError.prototype);
  }
}

export const CommonErrors = [new GenericError().getErrorPublic()];
