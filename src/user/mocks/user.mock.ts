import { faker } from '@faker-js/faker';
import { User } from '../entities/user.entity';

export class UserMock extends User {
  id = faker.string.uuid();
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
