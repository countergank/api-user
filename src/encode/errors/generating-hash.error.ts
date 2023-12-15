import { BaseError } from '../../common/virtual-objects/base.error';
import { GENERATING_HASH_ERROR } from './encode.dictionary';

export class GeneratingHashError extends BaseError {
  constructor(err: any = {}) {
    super(err);
    this.code = GENERATING_HASH_ERROR.code;
    this.message = GENERATING_HASH_ERROR.msg;
    Object.setPrototypeOf(this, GeneratingHashError.prototype);
  }
}
