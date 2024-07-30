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
import { BadRequestError } from '../errors/bad-request.error';
import { statusKey } from '../errors/helpers';
import { InternalServerError } from '../errors/internal-server.error';

export const applyDocsDecorators = (
  doc: { name: string; description?: string },
  response: { status: HttpStatus; model: any },
  request?: { body?: { model: any; mock: any }; queries?: ApiQueryOptions[]; params?: ApiParamOptions[] },
) => {
  const decorators = [
    ApiBadRequestResponse({ description: statusKey(HttpStatus.BAD_REQUEST), type: BadRequestError }),
    ApiInternalServerErrorResponse({
      description: statusKey(HttpStatus.INTERNAL_SERVER_ERROR),
      type: InternalServerError,
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
