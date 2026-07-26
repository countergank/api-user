import { createParamDecorator } from '@nestjs/common';
import {
  extractParameter,
  ParameterDecoratorOptions,
} from './extract-parameter.helper';

export { ParameterDecoratorOptions };

export function Parameter(
  key: string,
  options?: ParameterDecoratorOptions,
): ParameterDecorator {
  return createParamDecorator(extractParameter(key, options))();
}
