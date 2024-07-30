import { BaseErrorDTO } from './base-error.dto';
import { ErrorAcronymIdentifier } from './error-acronym-identifier.enum';

export class BaseError extends Error {
  private appAcronymIdentifier = ErrorAcronymIdentifier.Error + ErrorAcronymIdentifier.Application;
  name: string;
  message: string;
  cause: any;
  protected identifier: string;

  constructor(acronym: ErrorAcronymIdentifier, body: BaseErrorDTO) {
    super();
    this.name = body?.name;
    this.message = this.extractMessage(body);
    this.cause = body?.cause;
    this.identifier = `${this.appAcronymIdentifier}${acronym}`;
  }

  private isNumeric(string) {
    return Number.isFinite(+string);
  }

  private extractMessage(body: BaseErrorDTO) {
    if (body?.response?.data?.message) return body?.response?.data?.message;
    if (body?.data?.message) return body?.response?.data?.message;
    if (body?.message) return body?.response?.data?.message;
    return '';
  }

  setNumeration(code: string) {
    if (!this.isNumeric(code)) {
      throw Error('Numero de error incorrecto');
    }
    this.identifier += String(code);
  }

  setMessage(message: string) {
    if (!this.message) {
      this.message = message;
    }
  }

  get fullMessage(): string {
    return this.identifier ? `${this.identifier}: ${this.message}` : this.message;
  }

  get code(): string {
    return this.identifier;
  }
}
