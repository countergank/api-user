import { User } from '../entities/user.entity';

export class CreateUserResponseDTO {
  id: string;
  name: string;
  lastName: string;
  email: string;
  userName: string;
  created_at: string;
  updated_at: string;

  constructor(user: User) {
    this.id = user._id.toString();
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.userName = user.userName;
    this.created_at = user.created_at.toISOString();
    this.updated_at = user.updated_at.toISOString();
  }

  static of(user: User): CreateUserResponseDTO {
    return new CreateUserResponseDTO(user);
  }
}
