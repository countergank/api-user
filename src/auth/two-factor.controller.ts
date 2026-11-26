import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditAction } from '../common/audit/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { ApplyActivateTwoFactorDoc, ApplyEnrollTwoFactorDoc } from './api-docs';
import { ActivateTwoFactorDTO } from './dto/activate-two-factor.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TwoFactorService } from './two-factor/two-factor.service';

/**
 * Second-factor (TOTP) enrollment endpoints (#566). The login challenge that
 * consumes the enabled factor belongs to #567 and is deliberately absent.
 */
@ApiTags('auth')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('enroll')
  @ApplyEnrollTwoFactorDoc()
  @AuditAction({
    action: 'auth.2fa.enroll',
    resource: 'auth',
    getResourceId: (_result, args) => (args[0] as User)?.id,
    // The secret is the credential being enrolled: it must never reach the
    // audit trail, so only the enrollment event is recorded.
    getBefore: () => ({ twoFactorEnrollmentStarted: true }),
  })
  async enroll(@CurrentUser() user: User) {
    return this.twoFactorService.enroll(user.id, user.email);
  }

  @Post('activate')
  @HttpCode(200)
  @ApplyActivateTwoFactorDoc()
  @AuditAction({
    action: 'auth.2fa.activate',
    resource: 'auth',
    getResourceId: (_result, args) => (args[0] as User)?.id,
    getBefore: () => ({ twoFactorActivationAttempt: true }),
  })
  async activate(@CurrentUser() user: User, @Body() dto: ActivateTwoFactorDTO) {
    await this.twoFactorService.activate(user.id, dto.code);
    return { twoFactorEnabled: true };
  }
}
