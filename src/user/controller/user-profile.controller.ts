import { Controller, Get, Patch, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserService } from '../service/user.service';
import { EncodeService } from '../../encode/encode.service';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(
    private userService: UserService,
    private encodeService: EncodeService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getProfile(@Request() req) {
    const user = req.user;
    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
    };
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async updateProfile(@Request() req, @Body() body: { name?: string; lastName?: string }) {
    const user = await this.userService.update(req.user.id, {
      name: body.name,
      lastName: body.lastName,
    });
    return {
      id: user.id,
      email: user.email,
      userName: user.userName,
      name: user.name,
      lastName: user.lastName,
    };
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  async changePassword(@Request() req, @Body() body: { currentPassword: string; newPassword: string }) {
    const user = req.user;
    const isValid = await this.encodeService.compare(body.currentPassword, user.password);
    if (!isValid) {
      return { message: 'Current password is incorrect' };
    }

    await this.userService.update(user.id, {
      password: body.newPassword,
    });

    return { message: 'Password changed successfully' };
  }
}
