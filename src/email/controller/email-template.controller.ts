import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { UserRole } from '../../user/entities/user.entity';
import {
  ApplyCreateTemplateDoc,
  ApplyDeleteTemplateDoc,
  ApplyFindAllTemplatesDoc,
  ApplyFindTemplateBySlugDoc,
  ApplyUpdateTemplateDoc,
} from '../api-docs';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { ListTemplatesQueryDTO } from '../dto/list-templates-query.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { EmailTemplate } from '../entities/email-template.entity';
import { EmailTemplateService } from '../service/email-template.service';

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
  findAll(@Query() query: ListTemplatesQueryDTO): Promise<PaginatedResponseDTO<EmailTemplate>> {
    return this.templateService.findPaginated({
      active: query.active,
      page: query.page,
      limit: query.limit,
    });
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
