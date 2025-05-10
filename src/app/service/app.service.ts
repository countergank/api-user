import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { Message } from '../../common/class/message.class';
import { versionStructure } from '../../common/utils/global';
import { MicroservicesNames } from '../../config/custom-providers/microservices-names.enum';
import { Version } from '../class/version.class';
import { AppVersionNotFoundError } from '../errors/error-instances.error';

@Injectable()
export class AppService {
  constructor(
    private readonly configService: ConfigService,
    @Inject(MicroservicesNames.EXAMPLE) private client: ClientProxy,
  ) { }

  async onApplicationBootstrap() {
    await this.client.connect();
  }

  async getVersion(): Promise<Version> {
    const packageName = this.configService.getOrThrow('npm_package_name');
    const env = this.configService.getOrThrow('NODE_ENV');
    const version = this.configService.getOrThrow('npm_package_version');

    if (!packageName || !env || !version) {
      throw new AppVersionNotFoundError();
    }

    return new Version({ version: versionStructure(packageName, env, version) });
  }

  async messageMicroservice(messagePattern: string, body: Message<any>): Promise<Message<any>> {
    const microserviceRespDTO = await lastValueFrom(this.client.send<Message<any>, Message<any>>(messagePattern, body));

    return microserviceRespDTO;
  }
}
