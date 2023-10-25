import { BaseError } from '../base.error';
import { VERSION_NOT_FOUND_ERROR } from '../root.dictionary';

export class VersionNotFoundError extends BaseError {
  constructor(err: any = {}) {
    super(err);
    this.code = VERSION_NOT_FOUND_ERROR.code;
    this.message = VERSION_NOT_FOUND_ERROR.msg;
    Object.setPrototypeOf(this, VersionNotFoundError.prototype);
  }
}
