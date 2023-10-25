import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CreateUserDTO } from '../../../user/dto/create-user.dto';
import { BadRequestResponseDTO } from '../../response/bad-request.response.dto';
import { InternalErrorResponseDTO } from '../../response/internal-error.response.dto';
import { CREATE_USER_BODY_SWAGGER } from '../../schemas/user/create-user.schema';

export function CreateUserDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a User' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestResponseDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorResponseDTO }),
    ApiExtraModels(CreateUserDTO),
    ApiBody(CREATE_USER_BODY_SWAGGER),
  );
}
