import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../../common/dto/internal-error.dto';
import { AuditLogResponseDTO } from '../dto/audit-log-response.dto';
import { PaginatedAuditLogResponseDTO } from '../dto/paginated-audit-log-response.dto';

/**
 * API documentation for the admin audit logs query endpoint.
 */
export function ApplyAuditLogsDoc() {
  return applyDecorators(
    ApiTags('admin'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Query audit logs (Admin)',
      description:
        'Retrieves paginated audit logs with filtering options. Only accessible by administrators.\n\n' +
        '**Filters**: userId, action, resource, from/to dates, ipAddress\n\n' +
        '**Pagination**: page (1-indexed), limit (1-100, default 20)\n\n' +
        '**i18n Support**: Use `Accept-Language` header (es, en, pt) for localized error messages.',
    }),
    ApiExtraModels(AuditLogResponseDTO, PaginatedAuditLogResponseDTO),
    ApiResponse({
      status: 200,
      description: 'Paginated audit logs retrieved successfully',
      schema: {
        $ref: getSchemaPath(PaginatedAuditLogResponseDTO),
      },
    }),
    ApiQuery({
      name: 'userId',
      required: false,
      type: String,
      description: 'Filter by user ID',
      example: '507f191e810c19729de860ea',
    }),
    ApiQuery({
      name: 'action',
      required: false,
      type: String,
      description: 'Filter by action name',
      example: 'user.create',
    }),
    ApiQuery({
      name: 'resource',
      required: false,
      type: String,
      description: 'Filter by resource type',
      example: 'user',
    }),
    ApiQuery({
      name: 'from',
      required: false,
      type: String,
      description: 'Filter from date (ISO 8601)',
      example: '2024-01-01T00:00:00.000Z',
    }),
    ApiQuery({
      name: 'to',
      required: false,
      type: String,
      description: 'Filter to date (ISO 8601)',
      example: '2024-12-31T23:59:59.999Z',
    }),
    ApiQuery({
      name: 'ipAddress',
      required: false,
      type: String,
      description: 'Filter by IP address',
      example: '192.168.1.1',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (1-indexed)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page (1-100)',
      example: 20,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized. Valid JWT required.' }),
    ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' }),
    ApiBadRequestResponse({ description: 'Bad Request. Invalid filter parameters.', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
