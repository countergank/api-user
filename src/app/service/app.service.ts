import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { EventPatternsMS } from '../../common/enums/event-patternts-ms.enum';
import { versionStructure } from '../../common/utils/global';
import { MicroservicesNames } from '../../config/custom-providers/microservices-names.enum';
import { VersionReqDTO } from '../dto/version-req.dto';
import { VersionRespDTO } from '../dto/version-res.dto';
import { AppVersionNotFoundError } from '../errors/app-version-not-found.error';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(MicroservicesNames.EXAMPLE) private client: ClientProxy,
  ) {}

  async onApplicationBootstrap() {
    await this.client.connect();
  }

  async getVersionV1(): Promise<string> {
    const packageName = this.configService.getOrThrow('npm_package_name');
    const env = this.configService.getOrThrow('NODE_ENV');
    const version = this.configService.getOrThrow('npm_package_version');

    if (!packageName || !env || !version) {
      throw new AppVersionNotFoundError();
    }

    return versionStructure(packageName, env, version);
  }

  async callMicroservice(): Promise<VersionRespDTO> {
    const version = await this.getVersionV1();
    const versionReqDTO = new VersionReqDTO({ timestamp: new Date(), payload: { version: version } });

    const versionRespDTO = await lastValueFrom(
      this.client.send<VersionRespDTO, VersionReqDTO>(EventPatternsMS.Version, versionReqDTO),
    );

    return versionRespDTO;
  }
}
