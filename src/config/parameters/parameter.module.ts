import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParameterRegistry } from './parameter-registry';
import { PARAMETER_DEFINITIONS } from './parameter-definitions';

@Global()
@Module({
  imports: [ConfigModule],
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