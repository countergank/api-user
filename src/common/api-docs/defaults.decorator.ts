import { HttpStatus, applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiParamOptions,
  ApiQuery,
  ApiQueryOptions,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

/**
 * Maps an HTTP status to its enum key name (e.g. 400 -> 'BAD_REQUEST').
 */
const statusKey = (status: HttpStatus): string => {
  return Object.keys(HttpStatus).find((key) => HttpStatus[key] == status);
};

export const applyDocsDecorators = (
  doc: { name: string; description?: string },
  response: { status: HttpStatus; model: any },
  request?: { body?: { model: any; mock: any }; queries?: ApiQueryOptions[]; params?: ApiParamOptions[] },
) => {
  const decorators = [
    ApiBadRequestResponse({ description: statusKey(HttpStatus.BAD_REQUEST), type: ErrorResponseDto }),
    ApiInternalServerErrorResponse({
      description: statusKey(HttpStatus.INTERNAL_SERVER_ERROR),
      type: ErrorResponseDto,
    }),
    ApiOperation({ summary: doc?.description ?? doc.name }),
    ApiResponse({
      status: response.status,
      description: statusKey(response.status),
      type: response.model,
    }),
  ];

  if (request?.body) {
    decorators.push(
      ApiBody({
        examples: { [`${doc.name}`]: { value: request.body.mock } },
        schema: { $ref: getSchemaPath(request.body.model) },
      }),
    );
    decorators.push(ApiExtraModels(request.body.model));
  }

  if (request?.params) {
    request.params.forEach((apiParam) => decorators.push(ApiParam(apiParam)));
  }

  if (request?.queries) {
    request.queries.forEach((apiQuery) => decorators.push(ApiQuery(apiQuery)));
  }

  return applyDecorators(...decorators);
};
