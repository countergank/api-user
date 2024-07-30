import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { ExampleInstanceError } from './example/example-instance.error';

export class BadRequestError {
  @ApiProperty({ example: new ExampleInstanceError().code })
  @IsString()
  code: string;

  @ApiProperty({ example: new ExampleInstanceError().message })
  @IsString()
  message: string;

  @ApiProperty({ example: HttpStatus.BAD_REQUEST })
  @IsNumber()
  status: number;
}
