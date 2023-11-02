import { ApiBodyOptions, getSchemaPath } from '@nestjs/swagger';
import { CreateUserMock } from '../../../mocks/user/create-user.mock';
import { CreateUserDTO } from '../../../user/dto/create-user.dto';

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
