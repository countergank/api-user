import { defaultError } from '../../common/errors/base-error.dto';
import { BaseError } from '../../common/errors/base.error';
import { ErrorAcronymIdentifier } from '../../common/errors/error-acronym-identifier.enum';
import { UserErrorAlias, UserErrorMessage } from './user.dictionary';

export class UserNameAlreadyExistsError extends BaseError {
  constructor(error = defaultError) {
    super(ErrorAcronymIdentifier.User, error);
    this.setNumeration(UserErrorAlias.UserNameAlreadyExists);
    this.setMessage(UserErrorMessage[UserErrorAlias.UserNameAlreadyExists]);
    Object.setPrototypeOf(this, UserNameAlreadyExistsError.prototype);
  }
}
