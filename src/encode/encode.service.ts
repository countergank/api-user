import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { CustomLogger } from '../common/logger';

@Injectable()
export class EncodeService {
  private readonly logger = new CustomLogger(EncodeService.name);
  private SALT_ROUNDS = 10;

  hash(value: string): string {
    const salt = bcrypt.genSaltSync(this.SALT_ROUNDS);
    const hashedValue = bcrypt.hashSync(value, salt);
    return hashedValue;
  }

  compare(value: string, hash: string): boolean {
    return bcrypt.compareSync(value, hash);
  }
}
