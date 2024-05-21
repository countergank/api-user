import { ConsoleLogger } from '@nestjs/common';

export class CustomLogger extends ConsoleLogger {
  private debugMode: boolean;

  constructor(context: string) {
    super(context);
    this.debugMode = process.env.DEBUG ? JSON.parse(process.env.DEBUG) : false;
  }

  log(message: any) {
    if (process.env.NODE_ENV === 'test' && !this.debugMode) return;
    super.log(message, this.context);
  }

  debug(message: any) {
    if (process.env.NODE_ENV === 'test' && !this.debugMode) return;
    super.debug(message, this.context);
  }

  verbose(message: any) {
    if (process.env.NODE_ENV === 'test' && !this.debugMode) return;
    super.verbose(message, this.context);
  }

  warn(message: any) {
    if (process.env.NODE_ENV === 'test' && !this.debugMode) return;
    super.warn(message, this.context);
  }

  error(message: any, stack?: string) {
    if (process.env.NODE_ENV === 'test' && !this.debugMode) return;
    super.error(message, stack, this.context);
  }
}
