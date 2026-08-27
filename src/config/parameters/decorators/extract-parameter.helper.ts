import { ExecutionContext } from '@nestjs/common';
import { ParameterService } from '../parameter.service';

export interface ParameterDecoratorOptions {
  strict?: boolean;
}

export function extractParameter(
  key: string,
  options?: ParameterDecoratorOptions,
) {
  return async (
    _data: unknown,
    _ctx: ExecutionContext,
  ): Promise<string | number | boolean | undefined> => {
    const service = ParameterService.ensureInitialized();

    if (!service.has(key)) {
      if (options?.strict) {
        throw new Error(
          `Parameter "${key}" is unknown. Ensure it is registered.`,
        );
      }
      return undefined;
    }

    return service.get(key);
  };
}
