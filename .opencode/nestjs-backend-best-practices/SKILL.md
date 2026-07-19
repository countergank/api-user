---
name: nestjs-backend-best-practices
description: Apply senior-level NestJS backend best practices including hexagonal architecture, error handling, testing, caching, security, observability, and production-ready API design.
---

# NestJS Backend Best Practices

Load this skill when:
- Architecting NestJS applications
- Implementing error handling patterns
- Writing unit and e2e tests
- Setting up configuration management
- Building scalable microservices
- Adding caching, rate limiting, or performance optimization
- Implementing authentication and authorization
- Setting up metrics and observability
- Designing REST APIs with pagination, filtering, versioning

## Architecture Patterns

### 1. Module Organization (Screaming Architecture)

Organize by feature, not by type:

```
src/
├── user/                    # Feature module
│   ├── controller/          # HTTP layer
│   ├── service/             # Business logic
│   ├── repository/          # Data access
│   ├── dto/                 # Data transfer objects
│   ├── entities/            # Domain models
│   ├── errors/              # Domain errors
│   ├── mocks/               # Test fixtures
│   └── api-docs/            # Swagger docs
├── common/                  # Shared utilities
│   ├── errors/              # Base error classes
│   ├── dto/                 # Shared DTOs
│   ├── utils/               # Helper functions
│   ├── decorators/          # Custom decorators
│   ├── filters/             # Exception filters
│   └── interceptors/        # Interceptors
├── config/                  # Configuration
└── health/                  # Health check module
```

### 2. Repository Pattern

```typescript
@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private model: Model<UserDocument>) {}

  async findById(id: string): Promise<User> {
    const user = await this.model.findById(id).exec();
    if (!user) throw new UserNotFoundError(id);
    return user;
  }
}
```

### 3. Error Handling (Error Catalog Pattern)

```typescript
// errors/error.dictionary.ts
export const ERROR_DICTIONARY = {
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'User with id "{{id}}" not found',
    httpStatus: HttpStatus.NOT_FOUND,
  },
} as const;

// errors/error-instances.error.ts
export class UserNotFoundError extends ErrorBase {
  constructor(id: string) {
    super(ERROR_DICTIONARY.USER_NOT_FOUND, { id });
  }
}
```

## Testing Patterns

### Unit Tests (Service)

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    const module = Test.createTestingModule({
      providers: [UserService, { provide: UserRepository, useValue: mockRepository }],
    }).compile();
    service = module.get(UserService);
    repository = module.get(UserRepository);
  });

  it('should create user successfully', async () => {
    repository.create.mockResolvedValue(userMock);
    const result = await service.create(createUserDtoMock);
    expect(result).toEqual(userMock);
  });
});
```

### Controller Tests

```typescript
describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockService }],
    }).compile();
    controller = module.get(UserController);
  });

  it('should return created user', async () => {
    mockService.create.mockResolvedValue(userMock);
    const result = await controller.create(createUserDtoMock);
    expect(result).toEqual(userMock);
  });
});
```

## Performance Patterns

### 1. Caching with Redis

```typescript
// cache.config.ts
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 60000, // 1 minute default
    }),
  ],
})
export class AppModule {}
```

```typescript
// service with caching
@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Cacheable('user:${id}')
  async findById(id: string): Promise<User> {
    return this.repository.findById(id);
  }

  @CacheInvalidate('user:*')
  async update(id: string, data: UpdateUserDto): Promise<User> {
    return this.repository.update(id, data);
  }
}
```

### 2. Rate Limiting

```typescript
// main.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
})
export class AppModule {}

@Controller()
@UseGuards(ThrottlerGuard)
export class AppController {}
```

### 3. Query Optimization

```typescript
// Use projections, lean(), indexes
async findAll(paginationDto: PaginationDto): Promise<User[]> {
  return this.model
    .find({ active: true })
    .select('name email avatar')  // projection
    .skip(paginationDto.offset)
    .limit(paginationDto.limit)
    .lean()  // plain JS objects, faster
    .exec();
}
```

## Security Patterns

### 1. JWT Authentication

```typescript
// auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}

// auth/jwt-auth.guard.ts
export const JwtAuthGuard = new AuthGuard('jwt');
```

### 2. RBAC (Role-Based Access Control)

```typescript
// roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}

// Usage
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UserController {
  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {}
}
```

### 3. Input Sanitization

```typescript
// Prevent XSS, SQL injection
import { sanitize } from 'class-sanitizer';

@Injectable()
export class SanitizationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallableNext): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request.body) {
      sanitize(request.body);
    }
    return next.handle();
  }
}
```

## Observability

### 1. Prometheus Metrics

```typescript
// metrics/user.metrics.ts
@Injectable()
export class UserMetrics {
  private counter = new Counter({
    name: 'user_creation_total',
    help: 'Total number of users created',
  });

  private histogram = new Histogram({
    name: 'user_creation_duration',
    help: 'Duration of user creation',
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  recordUserCreation(durationMs: number) {
    this.counter.inc();
    this.histogram.observe(durationMs);
  }
}

// Use in service
@Injectable()
export class UserService {
  constructor(private metrics: UserMetrics) {}

  async create(dto: CreateUserDto): Promise<User> {
    const start = Date.now();
    const user = await this.repository.create(dto);
    this.metrics.recordUserCreation(Date.now() - start);
    return user;
  }
}
```

### 2. OpenTelemetry Tracing

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  serviceName: 'api-user',
  traceExporter: new JaegerExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();
```

### 3. Health Checks

```typescript
// health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  ready() {
    return { status: 'ready' };
  }

  @Get('live')
  live() {
    return { status: 'live' };
  }
}
```

## API Design Patterns

### 1. Pagination

```typescript
// pagination.dto.ts
export class PaginationQueryDto {
  @IsOptional() @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) limit?: number = 10;
}

export class PaginatedResponseDto<T> {
  @ApiProperty() data: T[];
  @ApiProperty() meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Controller
@Get()
async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponseDto<User>> {
  const [users, total] = await this.userService.findAll(query);
  return {
    data: users,
    meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}
```

### 2. Filtering & Search

```typescript
// filter.dto.ts
export class UserFilterDto {
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @IsOptional() @IsDateString() createdAfter?: string;
  @IsOptional() @IsDateString() createdBefore?: string;
}

// Query building
async findWithFilters(filter: UserFilterDto): Promise<User[]> {
  const query: FilterQuery<User> = {};
  if (filter.status) query.status = filter.status;
  if (filter.createdAfter || filter.createdBefore) {
    query.createdAt = {};
    if (filter.createdAfter) query.createdAt.$gte = new Date(filter.createdAfter);
    if (filter.createdBefore) query.createdAt.$lte = new Date(filter.createdBefore);
  }
  return this.repository.find(query);
}
```

### 3. API Versioning

```typescript
// main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

// Controller versions
@Controller({ version: '1' })
export class UserControllerV1 {}

@Controller({ version: '2' })
export class UserControllerV2 {}
```

### 4. Response Wrapper

```typescript
// response.interceptor.ts
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// usage
@UseInterceptors(ResponseInterceptor)
@Controller('users')
export class UserController {}
```

## Configuration

```typescript
// config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

enum Environment { Development = 'development', Staging = 'staging', Production = 'production' }

class EnvironmentVariables {
  @IsEnum(Environment) NODE_ENV: Environment;
  @IsNumber() PORT: number;
  @IsString() DATABASE_HOST: string;
  @IsNumber() DATABASE_PORT: number;
  @IsString() JWT_SECRET: string;
  @IsString() REDIS_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) throw new Error(errors.toString());
  return validatedConfig;
}
```

## Logging

```typescript
// structured logging with pino
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
  formatters: { level: (label) => ({ level: label }) },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});
```

## Microservices

```typescript
@MessagePattern('user.create')
async handleCreate(@Payload() data: CreateUserDto, @Ctx() context: RmqContext) {
  try {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    const user = await this.userService.create(data);
    channel.ack(originalMsg);
    return user;
  } catch (error) {
    channel.nack(originalMsg, false, true);
    throw error;
  }
}
```

## API Documentation

```typescript
const config = new DocumentBuilder()
  .setTitle('User API')
  .setDescription('User management endpoints')
  .setVersion('1.0')
  .addBearerAuth()
  .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

See `references/advanced-patterns.md` for detailed code examples.