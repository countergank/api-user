import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { EmailEvents } from '../email/constants/email.events';
import { User, UserRole } from '../user/entities/user.entity';
import { UserService } from '../user/service/user.service';
import { DomainError } from '../common/errors/domain.error';
import { AuditAction } from '../common/audit/audit.decorator';
import { runInTransaction } from '../common/utils/transaction';
import { CacheService } from '../config/cache';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    userName: string;
    name: string;
    lastName: string;
  };
  accessToken: string;
  refreshToken: string;
  verificationToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
    private readonly cacheService: CacheService,
  ) {}

  @AuditAction({
    action: 'auth.register',
    resource: 'auth',
    getResourceId: (result) => (result as AuthResponse).user.id,
    getAfter: (result) => ({ userId: (result as AuthResponse).user.id, email: (result as AuthResponse).user.email }),
  })
  async register(
    email: string,
    userName: string,
    password: string,
    name: string,
    lastName: string,
    lang?: string,
  ): Promise<AuthResponse> {
    const existing = await this.userService.existsByEmailOrUsername(email, userName);
    if (existing) {
      throw DomainError.fromKind('EMAIL_OR_USERNAME_EXISTS');
    }

    const verificationToken = randomUUID();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await runInTransaction(this.connection, async () => {
      const created = await this.userService.createWithRole({
        email,
        userName,
        password,
        name,
        lastName,
        role: UserRole.USER,
        permissions: [],
        isActive: false,
      });

      await this.userService.update(created.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      } as any);

      return created;
    });

    this.eventEmitter.emit(EmailEvents.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      name: user.name,
      verificationToken,
      lang: lang,
    });

    return this.generateAuthResponse(user, verificationToken);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.userService.findByEmail(email, { includePassword: true });
    if (!user) {
      throw DomainError.fromKind('INVALID_CREDENTIALS');
    }

    // Check lockout BEFORE password validation (security: skip bcrypt if locked)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw DomainError.fromKind('ACCOUNT_LOCKED');
    }

    const isValid = await this.userService.validatePassword(password, user.password);
    if (!isValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = this.configService.get<number>('MAX_LOGIN_ATTEMPTS', 5);
      const lockoutDuration = this.configService.get<number>('LOCKOUT_DURATION_MINUTES', 15);

      const updateData: { failedLoginAttempts: number; lockedUntil?: Date } = {
        failedLoginAttempts: failedAttempts,
      };

      if (failedAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000);
      }

      await this.userService.update(user.id, updateData);
      throw DomainError.fromKind('INVALID_CREDENTIALS');
    }

    // Successful login: reset lockout state if it existed
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.userService.update(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null as any,
      });
    }

    if (!user.isActive) {
      throw DomainError.fromKind('ACCOUNT_INACTIVE');
    }

    return this.generateAuthResponse(user);
  }

  async validateUser(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;

    const cached = await this.cacheService.get<User>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userService.findById(userId);
    await this.cacheService.set(cacheKey, user);
    return user;
  }

  @AuditAction({
    action: 'auth.forgot-password',
    resource: 'auth',
    getBefore: (...args) => ({ email: args[0] }),
  })
  async forgotPassword(email: string, lang?: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return;
    }

    const resetToken = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userService.update(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: expires,
    });

    this.eventEmitter.emit(EmailEvents.FORGOT_PASSWORD, {
      userId: user.id,
      email: user.email,
      name: user.name,
      resetToken,
      lang,
    });
  }

  @AuditAction({
    action: 'auth.reset-password',
    resource: 'auth',
    getBefore: () => ({ passwordChanged: true }),
  })
  async resetPassword(token: string, newPassword: string, lang?: string): Promise<void> {
    const user = await this.userService.findByResetToken(token);
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw DomainError.fromKind('EXPIRED_RESET_TOKEN');
    }

    // Hash the new password before updating
    const hashedPassword = await this.userService.hashPassword(newPassword);

    await runInTransaction(this.connection, async () => {
      await this.userService.update(user.id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpires: undefined,
      } as any);
    });

    this.eventEmitter.emit(EmailEvents.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      name: user.name,
      lang: lang,
    } as any);
  }

  @AuditAction({
    action: 'auth.verify-email',
    resource: 'auth',
    getAfter: () => ({ emailVerified: true }),
  })
  async verifyEmail(token: string): Promise<void> {
    const user = await this.userService.findByEmailVerificationToken(token);
    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw DomainError.fromKind('EXPIRED_VERIFICATION_TOKEN');
    }

    await runInTransaction(this.connection, async () => {
      await this.userService.update(user.id, {
        isActive: true,
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
      } as any);
    });
  }

  @AuditAction({
    action: 'auth.confirm-email-change',
    resource: 'auth',
    getBefore: () => ({ emailChangeConfirmed: true }),
  })
  async confirmEmailChange(token: string, lang?: string): Promise<void> {
    const user = await this.userService.findByPendingEmailToken(token);
    if (!user || !user.pendingEmailExpires || user.pendingEmailExpires < new Date()) {
      throw DomainError.fromKind('EXPIRED_CONFIRMATION_TOKEN');
    }

    const newEmail = user.pendingEmail;
    if (!newEmail) {
      throw DomainError.fromKind('NO_PENDING_EMAIL_CHANGE');
    }

    await runInTransaction(this.connection, async () => {
      await this.userService.update(user.id, {
        email: newEmail,
        pendingEmail: undefined,
        pendingEmailToken: undefined,
        pendingEmailExpires: undefined,
      } as any);
    });

    this.eventEmitter.emit(EmailEvents.EMAIL_CHANGE_CONFIRMED, {
      userId: user.id,
      email: newEmail,
      name: user.name,
      lang: lang,
    });
  }

  @AuditAction({
    action: 'auth.resend-verification',
    resource: 'auth',
    getBefore: (...args) => ({ userId: args[0], email: args[1] }),
  })
  async resendVerification(userId: string, email: string, name: string, lang?: string): Promise<void> {
    const verificationToken = randomUUID();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userService.update(userId, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    } as any);

    this.eventEmitter.emit(EmailEvents.RESEND_VERIFICATION, {
      userId,
      email,
      name,
      verificationToken,
      lang: lang,
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userService.findByEmail(email);
  }

  @AuditAction({
    action: 'auth.refresh-token',
    resource: 'auth',
    getResourceId: (result) => (result as AuthResponse).user.id,
  })
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken) as JwtPayload;
    } catch {
      throw DomainError.fromKind('INVALID_REFRESH_TOKEN');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user) {
      throw DomainError.fromKind('INVALID_TOKEN');
    }
    return this.generateAuthResponse(user);
  }

  private generateAuthResponse(user: User, verificationToken?: string): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      user: {
        id: user.id,
        email: user.email,
        userName: user.userName,
        name: user.name,
        lastName: user.lastName,
      },
      accessToken,
      refreshToken,
      ...(verificationToken && { verificationToken }),
    };
  }
}
