import { HttpStatus, Version } from '@nestjs/common';
import { applyDocsDecorators } from '../../common/api-docs/defaults.decorator';
import { Message } from '../../common/class/message.class';
import { MessageReqMock } from '../mocks/message-req.mock';

export function GetVersionDoc() {
  return applyDocsDecorators(
    { name: 'get-api-version', description: 'Get API Version' },
    { status: HttpStatus.OK, model: Version },
  );
}

export function PostMessageMicroserviceDoc() {
  return applyDocsDecorators(
    { name: 'post-message-microservice', description: 'Post message to microservice' },
    { status: HttpStatus.OK, model: Message },
    {
      body: {
        model: Message,
        mock: new MessageReqMock().getVersion(),
      },
      params: [
        {
          name: 'message-pattern',
          type: String,
          description: 'Message pattern of microservice',
          example: 'version',
          required: true,
        },
      ],
    },
  );
}
