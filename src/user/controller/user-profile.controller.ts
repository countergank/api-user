import { Controller, Get, Patch, Post, Body, UseGuards, Request, HttpCode, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserService } from '../service/user.service';
import { EncodeService } from '../../encode/encode.service';

/**
 * Controller para gestión del perfil del usuario autenticado.
 * @public
 */
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
  @ApiOperation({ 
    summary: 'Obtener perfil del usuario actual', 
    description: 'Retorna los datos públicos del usuario actualmente autenticado.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Perfil del usuario',
    schema: {
      example: {
        name: "Juan",
        lastName: "Pérez",
        email: "user@example.com"
      }
    }
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getProfile(@Request() req) {
    const user = req.user;
    return {
      name: user.name,
      lastName: user.lastName,
      email: user.email,
    };
  }

  @Patch('profile')
  @ApiOperation({ 
    summary: 'Actualizar perfil del usuario', 
    description: 'Actualiza el nombre y/o apellido del usuario actual.' 
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Juan', description: 'Nombre del usuario' },
        lastName: { type: 'string', example: 'Pérez', description: 'Apellido del usuario' },
      },
    },
  })
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
  @ApiOperation({ 
    summary: 'Cambiar contraseña', 
    description: 'Cambia la contraseña del usuario actual. Requiere la contraseña actual.' 
  })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada exitosamente' })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string', example: 'OldPass123!', description: 'Contraseña actual' },
        newPassword: { type: 'string', example: 'NewPass123!', description: 'Nueva contraseña' },
      },
    },
  })
  async changePassword(@Request() req, @Body() body: { currentPassword: string; newPassword: string }) {
    const user = req.user;
    const isValid = await this.encodeService.compare(body.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userService.update(user.id, {
      password: body.newPassword,
    });

    return { message: 'Password changed successfully' };
  }
}
