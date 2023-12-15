import { ApiBodyOptions, getSchemaPath } from '@nestjs/swagger';
import { CreateUserDTO } from '../dto/create-user.dto';
import { CreateUserMock } from '../mocks/create-user.mock';

export const CREATE_USER_SWAGGER: ApiBodyOptions = {
  examples: {
    'Crear Usuario': {
      value: new CreateUserMock(),
    },
  },
  schema: {
    $ref: getSchemaPath(CreateUserDTO),
  },
};
