import { faker } from '@faker-js/faker';
import { UserDTO } from '../../user/dto/user.dto';

export class UserMock extends UserDTO {
  name = 'Leandro';
  lastName = 'Cepeda';
  email = 'leandrojaviercepeda@gmail.com';
  userName = 'leandrojaviercepeda';

  randomize(): UserMock {
    this.name = faker.person.firstName();
    this.lastName = faker.person.lastName();
    this.email = `${faker.person.firstName()}${faker.person.lastName()}@example.com`;
    this.userName = faker.person.fullName();
    return this;
  }
}
