import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InternalErrorDTO } from '../../../common/dto/internal-error.dto';
import { CacheStatsResponseDTO } from '../dto/cache-stats.dto';

export function ApplyCacheStatsDoc() {
  return applyDecorators(
    ApiTags('cache'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Métricas de cache en tiempo real',
      description:
        'Counters de hits/misses desde el arranque del proceso, hit rate, claves vivas en Redis y ' +
        'evictions reportadas por Redis. Solo administradores.',
    }),
    ApiOkResponse({ description: 'Métricas actuales del cache', type: CacheStatsResponseDTO }),
    ApiUnauthorizedResponse({ description: 'Sin token válido' }),
    ApiForbiddenResponse({ description: 'Rol o permisos insuficientes' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
