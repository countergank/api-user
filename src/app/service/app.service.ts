import { Inject, Injectable, Optional } from '@nestjs/common';
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
    // PERF-10: version config is static — cache it at startup. Invalid config
    // is not cached: getVersion keeps failing per call exactly as before.
    await this.getVersion()
      .then((version) => {
        this.cachedVersion = version;
      })
      .catch(() => {
        // Leave the cache empty; the per-call error contract is unchanged.
      });
  }

  async getVersion(): Promise<Version> {
    if (this.cachedVersion) {
      return this.cachedVersion;
    }

    const packageName = this.configService.get<string>('npm_package_name', 'api-user');
    const env = this.configService.getOrThrow('NODE_ENV');
    const version = this.configService.get<string>('npm_package_version')
      || this.configService.get<string>('VERSION', 'unknown');

    if (!packageName || !env || !version) {
      throw DomainError.fromKind('APP_VERSION_NOT_FOUND');
    }

    const result = new Version({ version: versionStructure(packageName, env, version) });
    this.cachedVersion = result;
    return result;
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
