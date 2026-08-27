import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { AuditAction } from '../../common/audit/audit.decorator';
import { ParameterService } from './parameter.service';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { ParameterEntry } from './parameter.types';

@Controller('admin/parameters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ParameterAdminController {
  constructor(private readonly parameterService: ParameterService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async findAll(): Promise<ParameterEntry[]> {
    return this.parameterService.getAll();
  }

  @Get(':group')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async findByGroup(@Param('group') group: string): Promise<ParameterEntry[]> {
    return this.parameterService.getByGroup(group);
  }

  @Put(':key')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @AuditAction({ action: 'PARAMETER_UPDATE', resource: 'parameter' })
  async update(@Param('key') key: string, @Body() dto: UpdateParameterDto): Promise<ParameterEntry> {
    return this.parameterService.update(key, dto.value);
  }
}
