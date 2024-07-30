import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { statusKey } from './helpers';

export class InternalServerError {
  @ApiProperty({
    example: statusKey(HttpStatus.INTERNAL_SERVER_ERROR),
  })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Internal server error' })
  @IsString()
  message: string;

  @ApiProperty({ example: HttpStatus.INTERNAL_SERVER_ERROR })
  @IsNumber()
  status: number;
}
