import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { User } from '../entities/user.entity';

export class CreateUserDTO {
  @ApiProperty({ example: 'Leandro', description: 'Nombre' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Cepeda', description: 'Apellido' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'leandrojaviercepeda@gmail.com', description: 'Email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'leandrojaviercepeda', description: 'Nombre de usuario' })
  @IsNotEmpty()
  @IsString()
  userName: string;

  @ApiProperty({ example: 'secret', description: 'Contraseña' })
  @IsNotEmpty()
  @IsString()
  password: string;

  toEntity(): User {
    const user = new User();
    user.name = this.name;
    user.lastName = this.lastName;
    user.email = this.email;
    user.userName = this.userName;
    user.password = this.password;
    return user;
  }
}
