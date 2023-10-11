export class BaseError extends Error {
  name: string;
  cause: any;
  message: string;
  code: string;

  constructor({ name, message, cause }: { name: string; message: string; cause?: any }) {
    super();
    this.name = name;
    this.message = message;
    this.cause = cause;
  }

  get fullMessage(): string {
    return this.code ? `${this.code}: ${this.message}` : this.message;
  }
}
