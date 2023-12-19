import { ConsoleLogger } from '@nestjs/common';

export class CustomLogger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string) {
    if (process.env.NODE_ENV === 'test') return;
    super.error(message, stack ?? '', context ?? '');
  }
  log(message: any, stack?: string, context?: string) {
    if (process.env.NODE_ENV === 'test') return;
    super.log(message, stack ?? '', context ?? '');
  }
  debug(message: any, stack?: string, context?: string) {
    if (process.env.NODE_ENV === 'test') return;
    super.debug(message, stack ?? '', context ?? '');
  }
  verbose(message: any, stack?: string, context?: string) {
    if (process.env.NODE_ENV === 'test') return;
    super.verbose(message, stack ?? '', context ?? '');
  }
  warn(message: any, stack?: string, context?: string) {
    if (process.env.NODE_ENV === 'test') return;
    super.warn(message, stack ?? '', context ?? '');
  }
}
