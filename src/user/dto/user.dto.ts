import { User } from '../entities/user.entity';

export class UserDTO {
  id: string;
  name: string;
  lastName: string;
  email: string;
  userName: string;
  createdAt: string;
  updatedAt: string;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.userName = user.userName;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static of(user: User): UserDTO {
    return new UserDTO(user);
  }
}
