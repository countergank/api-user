import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateParameterDto {
  @IsString()
  @IsNotEmpty()
  value: string;
}
