import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class InternalErrorResponseDTO {
  @ApiProperty({ example: 'INTERNAL_SERVER_ERR' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Internal server error' })
  @IsString()
  message: string;

  @ApiProperty({ example: '500' })
  @IsNumber()
  status: number;
}
