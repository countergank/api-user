import { applyDecorators } from '@nestjs/common';
import { ApiBadRequestResponse, ApiInternalServerErrorResponse, ApiOperation } from '@nestjs/swagger';
import { BadRequestResponseDTO } from '../../response/bad-request.response.dto';
import { InternalErrorResponseDTO } from '../../response/internal-error.response.dto';

export function GetVersionDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Get API Version' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestResponseDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorResponseDTO }),
  );
}
