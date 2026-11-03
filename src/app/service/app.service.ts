import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Message } from '../../common/class/message.class';
import { versionStructure } from '../../common/utils/global';
import { MicroservicesNames } from '../../config/custom-providers/microservices-names.enum';
import { Version } from '../class/version.class';
import { DomainError } from '../../common/errors/domain.error';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private microserviceEnabled: boolean;
  private cachedVersion: Version | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject(MicroservicesNames.EXAMPLE) private client: ClientProxy,
  ) {
    // Lee la variable de entorno para saber si el microservicio está habilitado
    const enabled = this.configService.getOrThrow(`${MicroservicesNames.EXAMPLE}_MICROSERVICE_ENABLED`);
    this.microserviceEnabled = enabled === 'true';
  }

  async onApplicationBootstrap() {
    if (this.microserviceEnabled && this.client) {
      await this.client.connect();
    }
    // PERF-10: version config is static — warm the cache at startup.
    // A failed warm-up is logged, not swallowed: getVersion keeps failing
    // per call with the same error contract as before.
    try {
      this.cachedVersion = this.computeVersion();
    } catch (error) {
      this.logger.warn(`Version cache warm-up skipped: ${(error as Error).message}`);
    }
  }

  async getVersion(): Promise<Version> {
    if (!this.cachedVersion) {
      // Synchronous compute: no window between warm-up and first call.
      this.cachedVersion = this.computeVersion();
    }
    return this.cachedVersion;
  }

  private computeVersion(): Version {
    const packageName = this.configService.get<string>('npm_package_name', 'api-user');
    const env = this.configService.getOrThrow('NODE_ENV');
    const version = this.configService.get<string>('npm_package_version')
      || this.configService.get<string>('VERSION', 'unknown');

    if (!packageName || !env || !version) {
      throw DomainError.fromKind('APP_VERSION_NOT_FOUND');
    }

    return new Version({ version: versionStructure(packageName, env, version) });
  }

  async messageMicroservice(messagePattern: string, body: Message<unknown>): Promise<Message<unknown>> {
    if (!this.microserviceEnabled || !this.client) {
      throw DomainError.fromKind('MICROSERVICE_UNAVAILABLE');
    }
    const microserviceRespDTO = await lastValueFrom(
      this.client.send<Message<unknown>, Message<unknown>>(messagePattern, body),
    );

    return microserviceRespDTO;
  }
}
