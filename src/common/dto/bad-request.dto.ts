import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class BadRequestDTO {
  @ApiProperty({ example: 'ERR_BAD_REQUEST' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Message error' })
  @IsString()
  message: string;

  @ApiProperty({ example: '400' })
  @IsNumber()
  status: number;
}
