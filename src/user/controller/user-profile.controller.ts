import { Controller, Get, Patch, Post, Body, UseGuards, Request, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserService } from '../service/user.service';
import { EncodeService } from '../../encode/encode.service';
import { ChangePasswordDTO } from '../dto/change-password.dto';
import { ApplyGetProfileDoc, ApplyUpdateProfileDoc, ApplyChangePasswordDoc } from '../api-docs';

/**
 * Controller para gestión del perfil del usuario autenticado.
 * @public
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(
    private userService: UserService,
    private encodeService: EncodeService,
  ) {}

  @Get('profile')
  @ApplyGetProfileDoc()
  async getProfile(@Request() req) {
    const user = req.user;
    return {
      name: user.name,
      lastName: user.lastName,
      email: user.email,
    };
  }

  @Patch('profile')
  @ApplyUpdateProfileDoc()
  async updateProfile(@Request() req, @Body() body: { name?: string; lastName?: string }) {
    const user = await this.userService.update(req.user.id, {
      name: body.name,
      lastName: body.lastName,
    });
    return {
      name: user.name,
      lastName: user.lastName,
      email: user.email,
    };
  }

  @Post('change-password')
  @HttpCode(200)
  @ApplyChangePasswordDoc()
  async changePassword(@Request() req, @Body() dto: ChangePasswordDTO) {
    const user = req.user;
    const isValid = await this.encodeService.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userService.update(user.id, {
      password: dto.newPassword,
    });

    return { message: 'Password changed successfully' };
  }
}