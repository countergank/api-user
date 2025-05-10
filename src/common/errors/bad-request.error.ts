import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { GenericError } from './error/error-instances.error';

export class BadRequestError {
  @ApiProperty({ example: new GenericError().code })
  @IsString()
  code: string;

  @ApiProperty({ example: new GenericError().message })
  @IsString()
  message: string;

  @ApiProperty({ example: HttpStatus.BAD_REQUEST })
  @IsNumber()
  status: number;
}
