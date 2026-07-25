import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ParameterRegistry } from './parameter-registry';
import { ParameterStore } from './parameter.store';
import { ParameterService } from './parameter.service';
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
    ParameterStore,
    ParameterService,
  ],
  exports: [ParameterRegistry, ParameterStore, ParameterService],
})
export class ParameterModule {}