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
        const microservice_host = configService.getOrThrow(`${name}_MICROSERVICE_HOST`);
        const microservice_port = configService.getOrThrow(`${name}_MICROSERVICE_PORT`);
        return ClientProxyFactory.create({
          options: { host: microservice_host, port: microservice_port },
        });
      } catch (error) {
        logger.warn(error);
      }
    },
    inject: [ConfigService],
  };
};
