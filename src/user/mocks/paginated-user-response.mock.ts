import { faker } from '@faker-js/faker';
import { PaginatedUserResponseDTO } from '../dto/paginated-user-response.dto';
import { AdminUserDTO } from '../dto/admin-user.dto';
import { UserMock } from './user.mock';

export class PaginatedUserResponseMock extends PaginatedUserResponseDTO<AdminUserDTO> {
  constructor() {
    super();
    const user = new UserMock();
    this.data = [AdminUserDTO.of(user)];
    this.total = 1;
    this.page = 1;
    this.limit = 20;
    this.totalPages = 1;
  }

  randomize(count: number = 5): PaginatedUserResponseMock {
    const users = Array.from({ length: count }, () => AdminUserDTO.of(new UserMock().randomize()));
    const total = faker.number.int({ min: count, max: count * 10 });
    this.data = users;
    this.total = total;
    this.page = 1;
    this.limit = 20;
    this.totalPages = Math.ceil(total / 20);
    return this;
  }
}
