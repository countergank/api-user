import { Module, Global } from '@nestjs/common';
import { ParameterRegistry } from './parameter-registry';
import { PARAMETER_DEFINITIONS } from './parameter-definitions';

@Global()
@Module({
  providers: [
    {
      provide: ParameterRegistry,
      useFactory: () => {
        const registry = new ParameterRegistry();
        for (const def of PARAMETER_DEFINITIONS) {
          registry.register(def);
        }
        return registry;
      },
    },
  ],
  exports: [ParameterRegistry],
})
export class ParameterModule {}