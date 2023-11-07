import { BaseError } from '../base.error';
import { USER_NOT_FOUND_ERROR } from '../user.dictionary';

export class UserNotFoundError extends BaseError {
  constructor(err: any = {}) {
    super(err);
    this.code = USER_NOT_FOUND_ERROR.code;
    this.message = USER_NOT_FOUND_ERROR.msg;
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}
