import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import {
  ActivateTwoFactorRequest,
  ActivateTwoFactorResponse,
  EnrollTwoFactorRequest,
  EnrollTwoFactorResponse,
} from './examples/two-factor.examples';

const RateLimitResponse = {
  status: 429,
  description: 'Too many requests. Retry after the specified duration in the Retry-After header.',
  schema: {
    example: {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many requests. Please try again in 45 seconds.',
    },
  },
};

export function ApplyEnrollTwoFactorDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Iniciar enrolamiento del segundo factor (TOTP)',
      description:
        'Genera un secreto TOTP y devuelve la URL otpauth:// para el QR. El secreto se muestra una única vez y ' +
        'queda cifrado en el servidor. Re-enrolar invalida el secreto anterior. El segundo factor se habilita ' +
        'recién al confirmarlo con un código en POST /auth/2fa/activate.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(EnrollTwoFactorRequest, EnrollTwoFactorResponse),
    ApiResponse({
      status: 201,
      description: 'Secreto pendiente de activación generado',
      schema: { $ref: getSchemaPath(EnrollTwoFactorResponse) },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado o token inválido' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
  );
}

export function ApplyActivateTwoFactorDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Activar el segundo factor (TOTP)',
      description:
        'Confirma el enrolamiento validando un código TOTP generado por el secreto pendiente. Con hasta 5 códigos ' +
        'inválidos el enrolamiento se purga y hay que volver a enrolar.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(ActivateTwoFactorRequest, ActivateTwoFactorResponse),
    ApiResponse({
      status: 200,
      description: 'Segundo factor habilitado',
      schema: { $ref: getSchemaPath(ActivateTwoFactorResponse) },
    }),
    ApiBadRequestResponse({ description: 'No hay enrolamiento pendiente', type: BadRequestDTO }),
    ApiUnauthorizedResponse({ description: 'Código inválido o no autenticado' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
    ApiBody({ schema: { $ref: getSchemaPath(ActivateTwoFactorRequest) } }),
  );
}
