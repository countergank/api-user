import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { DomainError } from '../../common/errors/domain.error';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/service/user.service';
import { decryptTotpSecret, encryptTotpSecret } from './totp-cipher';

/**
 * Failed activations allowed against a pending secret before it is purged and
 * the user has to re-enroll (#566, S3). Same budget as the email-change code
 * family, which faces the same retyping friction.
 */
export const TWO_FACTOR_MAX_ATTEMPTS = 5;

/** Symmetric TOTP time tolerance in time steps (one step of 30 s each side). */
const TOTP_WINDOW_STEPS = 1;

export interface TwoFactorEnrollment {
  secret: string;
  otpauthUrl: string;
}

@Injectable()
export class TwoFactorService {
  /** Cloned with a ±1 step window so clock drift between phone and server
   * does not reject a valid code; the global preset stays untouched. */
  private readonly totp = authenticator.clone({ window: TOTP_WINDOW_STEPS });

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates a new pending secret and returns it exactly once, together with
   * the `otpauth://` URL for the QR code. Re-enrolling replaces any previous
   * secret and leaves two-factor disabled until the new secret is activated.
   */
  async enroll(userId: string, email: string): Promise<TwoFactorEnrollment> {
    await this.userService.findById(userId);

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      email,
      this.configService.get<string>('TOTP_ISSUER', 'api-user'),
      secret,
    );
    const encrypted = encryptTotpSecret(secret, this.encryptionPassword);

    await this.userService.update(userId, {
      twoFactorSecret: encrypted,
      twoFactorEnabled: false,
      twoFactorAttempts: 0,
    } as Partial<User>);

    return { secret, otpauthUrl };
  }

  /**
   * Confirms the pending secret with a code from the authenticator app. A wrong
   * code burns one attempt; exhausting the budget purges the secret so the
   * enrollment dies instead of being brute-forced.
   */
  async activate(userId: string, code: string): Promise<void> {
    const user = await this.userService.findById(userId, { includeTwoFactorSecret: true });

    if (!user.twoFactorSecret || (user.twoFactorAttempts ?? 0) >= TWO_FACTOR_MAX_ATTEMPTS) {
      throw DomainError.fromKind('TWO_FACTOR_NOT_ENROLLED');
    }

    let secret: string;
    try {
      secret = decryptTotpSecret(user.twoFactorSecret, this.encryptionPassword);
    } catch {
      // An undecryptable ciphertext (e.g. after an ENCRYPTION_PASSWORD
      // rotation) is not a usable enrollment.
      throw DomainError.fromKind('TWO_FACTOR_NOT_ENROLLED');
    }
    if (this.totp.verify({ token: code, secret })) {
      await this.userService.update(userId, {
        twoFactorEnabled: true,
        twoFactorAttempts: 0,
      } as Partial<User>);
      return;
    }

    const attempts = (user.twoFactorAttempts ?? 0) + 1;
    if (attempts >= TWO_FACTOR_MAX_ATTEMPTS) {
      // A residual race stays benign: two concurrent final attempts can both
      // purge, and the second purge is a no-op on an already-purged document.
      await this.userService.purgeTwoFactorEnrollment(userId);
      throw DomainError.fromKind('INVALID_TWO_FACTOR_CODE');
    }

    await this.userService.incrementTwoFactorAttempts(userId);
    throw DomainError.fromKind('INVALID_TWO_FACTOR_CODE');
  }

  private get encryptionPassword(): string {
    return this.configService.getOrThrow<string>('ENCRYPTION_PASSWORD');
  }
}
