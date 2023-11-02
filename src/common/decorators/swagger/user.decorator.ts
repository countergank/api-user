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
import { CREATE_USER_SWAGGER } from '../../schemas/user/user-sign-up.schema';

export function CreateUserDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a user' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestResponseDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorResponseDTO }),
    ApiExtraModels(CreateUserDTO),
    ApiBody(CREATE_USER_SWAGGER),
  );
}

export function RetrieveByIdUserDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve user' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestResponseDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorResponseDTO }),
  );
}

export function RetrieveUserDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve all users' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestResponseDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorResponseDTO }),
  );
}
