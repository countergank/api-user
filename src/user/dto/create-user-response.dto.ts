import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class CreateUserResponseDTO {
  @ApiProperty()
  name: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
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
