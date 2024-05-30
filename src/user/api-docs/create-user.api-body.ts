import { ApiBodyOptions, getSchemaPath } from '@nestjs/swagger';
import { CreateUserDTO } from '../dto/create-user.dto';
import { CreateUserDTOMock } from '../mocks/create-user-dto.mock';

export const CREATE_USER_SWAGGER: ApiBodyOptions = {
  examples: {
    'Crear Usuario': {
      value: new CreateUserDTOMock(),
    },
  },
  schema: {
    $ref: getSchemaPath(CreateUserDTO),
  },
};
