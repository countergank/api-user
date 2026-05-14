import { faker } from '@faker-js/faker';
import { User } from '../entities/user.entity';

export class UserMock extends User {
  name = 'Leandro';
  lastName = 'Cepeda';
  email = 'leandrojaviercepeda@gmail.com';
  userName = 'leandrojaviercepeda';
  password = 'root';
  isActive = true;

  randomize(): UserMock {
    this.name = faker.person.firstName();
    this.lastName = faker.person.lastName();
    this.email = faker.internet.email({ firstName: this.name, lastName: this.lastName });
    this.userName = faker.person.fullName();
    this.password = faker.string.alphanumeric(10);
    return this;
  }
}
