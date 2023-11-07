import { BaseError } from '../base.error';
import { USER_ALREADY_EXISTS_ERROR } from '../user.dictionary';

export class UserAlreadyExistsError extends BaseError {
  constructor(err: any = {}) {
    super(err);
    this.code = USER_ALREADY_EXISTS_ERROR.code;
    this.message = USER_ALREADY_EXISTS_ERROR.msg;
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype);
  }
}
