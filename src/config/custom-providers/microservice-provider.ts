import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory } from '@nestjs/microservices';
import { CustomLogger } from '../../common/logger';
import { MicroservicesNames } from './microservices-names.enum';

export const MicroserviceFactory = (name: MicroservicesNames) => {
  return {
    provide: String(name),
    useFactory: (configService: ConfigService) => {
      const logger = new CustomLogger(name);
      try {
        // Lee la variable *_MICROSERVICE_ENABLED para saber si el microservicio está habilitado
        const microservice_enabled = configService.getOrThrow(`${name}_MICROSERVICE_ENABLED`);
        if (microservice_enabled === 'true') {
          const microservice_host = configService.getOrThrow(`${name}_MICROSERVICE_HOST`);
          const microservice_port = configService.getOrThrow(`${name}_MICROSERVICE_PORT`);
          return ClientProxyFactory.create({
            options: { host: microservice_host, port: microservice_port },
          });
        }
        logger.log(`${name} microservice is disabled by configuration.`);
        return null;
      } catch (error) {
        logger.warn(error);
        return null;
      }
    },
    inject: [ConfigService],
  };
};
