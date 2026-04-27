import { faker } from '@faker-js/faker';
import { CreateUserDTO } from '../dto/create-user.dto';

// Valid password for testing
const VALID_PASSWORD = 'SecurePass123@';

export class CreateUserDTOMock extends CreateUserDTO {
  name = 'Leandro';
  lastName = 'Cepeda';
  email = 'leandrojaviercepeda@gmail.com';
  userName = 'leandrojaviercepeda';
  password = VALID_PASSWORD;

  randomize(): CreateUserDTOMock {
    this.name = faker.person.firstName();
    this.lastName = faker.person.lastName();
    this.email = faker.internet.email({ firstName: this.name, lastName: this.lastName });
    this.userName = faker.person.fullName();
    this.password = 'SecurePass123@'; // Always use valid password
    return this;
  }
}
