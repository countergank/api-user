import { faker } from '@faker-js/faker';
import { CreateUserDTO } from '../dto/create-user.dto';

export class CreateUserDTOMock extends CreateUserDTO {
  name = 'Leandro';
  lastName = 'Cepeda';
  email = 'leandrojaviercepeda@gmail.com';
  userName = 'leandrojaviercepeda';
  password = 'secret';

  randomize(): CreateUserDTOMock {
    this.name = faker.person.firstName();
    this.lastName = faker.person.lastName();
    this.email = `${faker.person.firstName()}${faker.person.lastName()}@example.com`;
    this.userName = faker.person.fullName();
    this.password = 'random';
    return this;
  }
}
