import { User } from '../entities/user.entity';

export class CreateUserResponseDTO {
  name: string;
  lastName: string;
  email: string;
  userName: string;
  createdAt: string;
  updatedAt: string;

  constructor(user: User) {
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.userName = user.userName;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static of(user: User): CreateUserResponseDTO {
    return new CreateUserResponseDTO(user);
  }
}
