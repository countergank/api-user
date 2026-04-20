import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Message } from '../../common/class/message.class';
import { CustomLogger } from '../../common/logger';
import { GetVersionDoc, PostMessageMicroserviceDoc } from '../api-docs/app.decorator';
import { Version } from '../class/version.class';
import { AppVersionNotFoundError } from '../errors/error-instances.error';
import { AppService } from '../service/app.service';

/**
 * Controller raíz para información de la API.
 * Provee endpoints de health check y versión.
 * @public
 */
@ApiTags('Root')
@Controller({ version: [VERSION_NEUTRAL] })
export class AppController {
  private readonly logger = new CustomLogger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @GetVersionDoc()
  @Get()
  @ApiOperation({ 
    summary: 'Obtener información de la API', 
    description: 'Retorna la versión y metadata de la API.' 
  })
  @ApiResponse({ status: 200, description: 'Información de la API' })
  async getVersion(): Promise<Version> {
    try {
      return await this.appService.getVersion();
    } catch (error) {
      if (error instanceof AppVersionNotFoundError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @PostMessageMicroserviceDoc()
  @Post('message-microservice/:message-pattern')
  @ApiOperation({ 
    summary: 'Enviar mensaje al microservice', 
    description: 'Envía un mensaje al microservice interne.' 
  })
  @ApiParam({ 
    name: 'message-pattern', 
    description: 'Patrón del mensaje (ej: user-created, order-completed)', 
    example: 'user-created' 
  })
  @ApiResponse({ status: 200, description: 'Mensaje procesado' })
  @ApiResponse({ status: 400, description: 'Patrón de mensaje inválido' })
  async messageMicroservice(
    @Param('message-pattern') messagePattern: string,
    @Body() body: Message<any>,
  ): Promise<Message<any>> {
    try {
      return await this.appService.messageMicroservice(messagePattern, body);
    } catch (error) {
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }
}
