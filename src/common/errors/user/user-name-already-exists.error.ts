import { BaseError } from '../base.error';
import { USER_NAME_ALREADY_EXISTS_ERROR } from './user.dictionary';

export class UserNameAlreadyExistsError extends BaseError {
  constructor(err: any = {}) {
    super(err);
    this.code = USER_NAME_ALREADY_EXISTS_ERROR.code;
    this.message = USER_NAME_ALREADY_EXISTS_ERROR.msg;
    Object.setPrototypeOf(this, UserNameAlreadyExistsError.prototype);
  }
}