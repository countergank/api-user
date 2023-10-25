import { ApiBodyOptions, getSchemaPath } from '@nestjs/swagger';
import { CreateUserRequestMock } from '../../../mocks/user/create-user.mock';
import { CreateUserDTO } from '../../../user/dto/create-user.dto';

export const CREATE_USER_BODY_SWAGGER: ApiBodyOptions = {
  examples: {
    'Crear Usuario': {
      value: new CreateUserRequestMock(),
    },
  },
  schema: {
    $ref: getSchemaPath(CreateUserDTO),
  },
};
