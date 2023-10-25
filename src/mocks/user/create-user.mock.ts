import { faker } from '@faker-js/faker';
import { CreateUserDTO } from '../../user/dto/create-user.dto';

export class CreateUserRequestMock extends CreateUserDTO {
  name = 'Leandro';
  lastName = 'Cepeda';
  email = 'leandrojaviercepeda@gmail.com';
  userName = 'leandrojaviercepeda';
  password = 'secret';

  randomize(): CreateUserRequestMock {
    this.name = faker.person.firstName();
    this.lastName = faker.person.lastName();
    return this;
  }
}
