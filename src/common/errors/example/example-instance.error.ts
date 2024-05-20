import { BaseError } from '../base.error';
import { ErrorAcronymIdentifier } from '../error-acronym-identifier.enum';
import { ExampleErrorAlias, ExampleErrorMessage } from './example.dictionary';

export class ExampleInstanceError extends BaseError {
  constructor(error: any = {}) {
    super(ErrorAcronymIdentifier.Example, error);
    this.setNumeration(ExampleErrorAlias.ExampleAlias);
    this.setMessage(ExampleErrorMessage[ExampleErrorAlias.ExampleAlias]);
    Object.setPrototypeOf(this, ExampleInstanceError.prototype);
  }
}
