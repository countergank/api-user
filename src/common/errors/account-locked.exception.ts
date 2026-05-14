import { HttpException } from '@nestjs/common';

export class AccountLockedException extends HttpException {
  constructor() {
    super('ACCOUNT_LOCKED', 423);
  }
}
