import { BaseError } from '../../common/errors/base.error';
import { ErrorAcronymIdentifier } from '../../common/errors/error-acronym-identifier.enum';
import { UserErrorAlias, UserErrorMessage } from './user.dictionary';

export class UserNotFoundError extends BaseError {
  constructor(error: any = {}) {
    super(ErrorAcronymIdentifier.User, error);
    this.setNumeration(UserErrorAlias.UserNotFound);
    this.setMessage(UserErrorMessage[UserErrorAlias.UserNotFound]);
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}
