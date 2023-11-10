import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { GeneratingHashError } from '../common/errors/encode/generating-hash.error';
import { CustomLogger } from '../common/logger';

@Injectable()
export class EncodeService {
  private readonly logger = new CustomLogger(EncodeService.name);
  private SALT_ROUNDS = 10;

  hash(value: string): string {
    const salt = bcrypt.genSaltSync(this.SALT_ROUNDS);
    const hashedValue = bcrypt.hashSync(value, salt);
    if (!hashedValue) {
      throw new GeneratingHashError();
    }
    return hashedValue;
  }

  compare(value: string, hash: string): boolean {
    return bcrypt.compareSync(value, hash);
  }
}
