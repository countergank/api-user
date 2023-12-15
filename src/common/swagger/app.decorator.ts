import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation } from '@nestjs/swagger';
import { BadRequestDTO } from '../dto/bad-request.dto';
import { InternalErrorDTO } from '../dto/internal-error.dto';

export function GetVersionDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get API Version' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
