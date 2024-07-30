import { defaultError } from '../../common/errors/base-error.dto';
import { BaseError } from '../../common/errors/base.error';
import { ErrorAcronymIdentifier } from '../../common/errors/error-acronym-identifier.enum';
import { UserErrorAlias, UserErrorMessage } from './user.dictionary';

export class UserPopulateError extends BaseError {
  constructor(error = defaultError) {
    super(ErrorAcronymIdentifier.User, error);
    this.setNumeration(UserErrorAlias.UserPopulate);
    this.setMessage(UserErrorMessage[UserErrorAlias.UserPopulate]);
    Object.setPrototypeOf(this, UserPopulateError.prototype);
  }
}
