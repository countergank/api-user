import { BaseError } from '../../common/errors/base.error';
import { ErrorAcronymIdentifier } from '../../common/errors/error-acronym-identifier.enum';
import { UserErrorAlias, UserErrorMessage } from './user.dictionary';

export class UserEmailAlreadyExistsError extends BaseError {
  constructor(error: any = {}) {
    super(ErrorAcronymIdentifier.User, error);
    this.setNumeration(UserErrorAlias.UserEmailAlreadyExists);
    this.setMessage(UserErrorMessage[UserErrorAlias.UserEmailAlreadyExists]);
    Object.setPrototypeOf(this, UserEmailAlreadyExistsError.prototype);
  }
}
