import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { SendEmailDto } from '../dto/send-email.dto';
import { SendDirectEmailDto } from '../dto/send-direct-email.dto';
import { EmailService } from '../service/email.service';
import { ApplySendEmailDoc, ApplySendDirectEmailDoc } from '../api-docs';

@ApiTags('email')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApplySendEmailDoc()
  async sendBySlug(@Body() dto: SendEmailDto): Promise<{ status: string }> {
    return this.emailService.sendBySlug(dto.useCase, dto.to, dto.variables);
  }

  @Post('send-direct')
  @ApplySendDirectEmailDoc()
  async sendDirect(@Body() dto: SendDirectEmailDto): Promise<{ status: string }> {
    return this.emailService.sendDirect(
      dto.to,
      dto.subject,
      dto.html,
      dto.metadata,
      dto.from,
      dto.replyTo,
    );
  }
}
