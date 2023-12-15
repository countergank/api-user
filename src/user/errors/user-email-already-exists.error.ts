import { BaseError } from '../../common/virtual-objects/base.error';
import { USER_EMAIL_ALREADY_EXISTS_ERROR } from './user.dictionary';

export class UserEmailAlreadyExistsError extends BaseError {
  constructor(err: any = {}) {
    super(err);
    this.code = USER_EMAIL_ALREADY_EXISTS_ERROR.code;
    this.message = USER_EMAIL_ALREADY_EXISTS_ERROR.msg;
    Object.setPrototypeOf(this, UserEmailAlreadyExistsError.prototype);
  }
}
