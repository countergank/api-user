import { faker } from '@faker-js/faker';
import { UpdateUserDTO } from '../dto/update-user.dto';

export class UpdateUserDTOMock extends UpdateUserDTO {
  name = 'Juan Carlos';
  lastName = 'Gómez';
  email = 'juancarlos@example.com';
  userName = 'juancarlos';

  randomize(): UpdateUserDTOMock {
    this.name = faker.person.firstName();
    this.lastName = faker.person.lastName();
    this.email = faker.internet.email({ firstName: this.name, lastName: this.lastName });
    this.userName = faker.internet.userName({ firstName: this.name, lastName: this.lastName });
    return this;
  }
}
