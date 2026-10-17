import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { EmailTemplateService } from '../service/email-template.service';
import {
  ApplyCreateTemplateDoc,
  ApplyFindAllTemplatesDoc,
  ApplyFindTemplateBySlugDoc,
  ApplyUpdateTemplateDoc,
  ApplyDeleteTemplateDoc,
} from '../api-docs';

@ApiTags('email-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('email/templates')
export class EmailTemplateController {
  constructor(private readonly templateService: EmailTemplateService) {}

  @Post()
  @RequirePermissions('email:create')
  @ApplyCreateTemplateDoc()
  create(@Body() dto: CreateTemplateDto) {
    return this.templateService.create(dto);
  }

  @Get()
  @RequirePermissions('email:read')
  @ApplyFindAllTemplatesDoc()
  findAll(@Query('active') active?: string) {
    if (active === 'true') {
      return this.templateService.findActive();
    }
    return this.templateService.findAll();
  }

  @Get(':slug')
  @RequirePermissions('email:read')
  @ApplyFindTemplateBySlugDoc()
  findBySlug(@Param('slug') slug: string) {
    return this.templateService.findBySlug(slug);
  }

  @Patch(':slug')
  @RequirePermissions('email:update')
  @ApplyUpdateTemplateDoc()
  update(@Param('slug') slug: string, @Body() dto: UpdateTemplateDto) {
    return this.templateService.update(slug, dto);
  }

  @Delete(':slug')
  @HttpCode(204)
  @RequirePermissions('email:delete')
  @ApplyDeleteTemplateDoc()
  delete(@Param('slug') slug: string) {
    return this.templateService.delete(slug);
  }
}
