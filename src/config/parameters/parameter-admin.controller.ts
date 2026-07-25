import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { AuditAction } from '../../common/audit/audit.decorator';
import { ParameterService } from './parameter.service';
import { ParameterRegistry } from './parameter-registry';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { ParameterEntry } from './parameter.types';

@Controller('admin/parameters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ParameterAdminController {
  constructor(
    private readonly parameterService: ParameterService,
    private readonly registry: ParameterRegistry,
  ) {}

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
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateParameterDto,
  ): Promise<ParameterEntry> {
    // 1. Validate key exists
    if (!this.parameterService.has(key)) {
      throw new NotFoundException(`Parameter "${key}" not found`);
    }

    // 2. Check env override — get current entries to check isOverridden
    const allEntries = await this.parameterService.getAll();
    const currentEntry = allEntries.find((e) => e.key === key);
    if (currentEntry?.isOverridden) {
      throw new ConflictException(
        `Parameter "${key}" is overridden by environment variable and cannot be updated via API`,
      );
    }

    // 3. Coerce value to correct type based on registry definition
    const coercedValue = this.coerceValue(key, dto.value);

    // 4. Set value (ParameterService.set calls registry.validate internally)
    await this.parameterService.set(key, coercedValue);

    // 5. Return updated entry (we know the key exists at this point)
    const updatedEntries = await this.parameterService.getAll();
    const entry = updatedEntries.find((e) => e.key === key);
    if (!entry) {
      throw new NotFoundException(`Parameter "${key}" not found after update`);
    }
    return entry;
  }

  private coerceValue(key: string, raw: string): string | number | boolean {
    const def = this.registry.findByKey(key);
    if (!def) {
      throw new NotFoundException(`Parameter "${key}" not found`);
    }

    switch (def.type) {
      case 'number': {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          throw new UnprocessableEntityException(
            `Value must be a valid number for parameter "${key}"`,
          );
        }
        if (n <= 0 && key === 'THROTTLE_LIMIT') {
          throw new UnprocessableEntityException(
            'Throttle limit must be greater than 0',
          );
        }
        return n;
      }
      case 'boolean': {
        const lower = raw.toLowerCase();
        if (!['true', 'false', '1', '0'].includes(lower)) {
          throw new UnprocessableEntityException(
            `Value must be a boolean (true/false) for parameter "${key}"`,
          );
        }
        return ['true', '1'].includes(lower);
      }
      default:
        return raw;
    }
  }
}
