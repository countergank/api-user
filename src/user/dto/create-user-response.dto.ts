import { User } from '../entities/user.entity';

export class CreateUserResponseDTO {
  name: string;
  lastName: string;
  email: string;
  userName: string;

  constructor(user: User) {
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.userName = user.userName;
  }

  static of(user: User): CreateUserResponseDTO {
    return new CreateUserResponseDTO(user);
  }
}
