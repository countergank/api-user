import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { CREATE_USER_SWAGGER } from './create-user.api-body';

export function CreateUserDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a user' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiExtraModels(CreateUserDTO),
    ApiBody(CREATE_USER_SWAGGER),
  );
}

export function FindByIdUserDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve a user by ID' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function FindAllUserDoc() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve all users' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
