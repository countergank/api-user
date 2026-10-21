import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExampleService } from './example.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { ExampleResponseDto } from './dto/example-response.dto';

@ApiTags('examples')
@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new example' })
  @ApiResponse({ status: 201, type: ExampleResponseDto })
  // NOTE: Prefer a global ValidationPipe in main.ts. Route-level @UsePipes
  // is a documented exception only (e.g., endpoint-specific validation options).
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@Body() dto: CreateExampleDto): Promise<ExampleResponseDto> {
    return this.exampleService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an example by ID' })
  @ApiResponse({ status: 200, type: ExampleResponseDto })
  async findOne(@Param('id') id: string): Promise<ExampleResponseDto> {
    return this.exampleService.findOne(id);
  }
}
