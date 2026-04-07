# NestJS Advanced Patterns - Detailed Guide

## Complete Error Handling System

### Base Error Class

```typescript
// common/errors/error-base/error-base.ts
import { HttpStatus } from '@nestjs/common';

export class ErrorBase extends Error {
  public readonly code: string;
  public readonly message: string;
  public readonly httpStatus: HttpStatus;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    errorConfig: { code: string; message: string; httpStatus: HttpStatus },
    metadata?: Record<string, unknown>,
  ) {
    super(errorConfig.message);
    this.name = this.constructor.name;
    this.code = errorConfig.code;
    this.message = errorConfig.message;
    this.httpStatus = errorConfig.httpStatus;
    this.metadata = metadata;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.metadata && { metadata: this.metadata }),
      timestamp: new Date().toISOString(),
    };
  }
}
```

### Error Filter

```typescript
// common/errors/error.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ErrorBase } from './error-base/error-base';

@Catch(ErrorBase)
export class ErrorFilter implements ExceptionFilter {
  catch(exception: ErrorBase, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response.status(exception.httpStatus).json(exception.toJSON());
  }
}

// Usage in main.ts
app.useGlobalFilters(new ErrorFilter());
```

## Redis Caching Implementation

### Cache Module Setup

```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    CacheModule.register({
      store: redisStore as any,
      url: process.env.REDIS_URL,
      ttl: 60000, // 1 minute
      max: 100, // max items in cache
    }),
  ],
})
export class AppModule {}
```

### Service with Cache

```typescript
// user/service/user.service.ts
@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private userRepository: UserRepository,
  ) {}

  @Cacheable('user:${id}', 120000) // 2 minutes
  async findById(id: string): Promise<User> {
    return this.userRepository.findById(id);
  }

  @Cacheable('users:list:${page}:${limit}', 30000) // 30 seconds
  async findAll(pagination: PaginationQueryDto): Promise<PaginatedResponseDto<User>> {
    return this.userRepository.findAll(pagination);
  }

  @CacheInvalidate('user:*')
  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.update(id, dto);
    await this.cacheManager.del(`user:${id}`);
    return user;
  }

  @CacheReset()
  async clearCache(): Promise<void> {
    // Clear all user-related cache
  }
}
```

## Rate Limiting Configuration

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
        name: 'short',
      },
      {
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
        name: 'long',
      },
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
```

```typescript
// Per-endpoint rate limiting
@Get('search')
@Throttle({ short: { limit: 10, ttl: 60000 } })
async search(@Query() query: SearchQueryDto) {}
```

## JWT Authentication Implementation

### Auth Module

```typescript
// auth/auth.module.ts
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [JwtStrategy, AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```

### JWT Strategy

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
    return { userId: payload.sub, email: payload.email, roles: payload.roles };
  }
}
```

### Auth Guard Usage

```typescript
// user.controller.ts
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  @Get('profile')
  async getProfile(@Request() req) {
    return this.userService.findById(req.user.userId);
  }
}
```

## RBAC Implementation

### Roles Decorator

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator',
}
```

### Roles Guard

```typescript
// common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

### Usage

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  @Delete(':id')
  @Roles(Role.ADMIN)
  async delete(@Param('id') id: string) {
    return this.userService.delete(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MODERATOR)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }
}
```

## Prometheus Metrics

### Metrics Service

```typescript
// metrics/app.metrics.ts
@Injectable()
export class AppMetrics {
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private activeUsers: Gauge;

  constructor() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.activeUsers = new Gauge({
      name: 'active_users',
      help: 'Number of currently active users',
    });
  }

  recordRequest(method: string, path: string, status: number) {
    this.httpRequestsTotal.inc({ method, path, status });
  }

  recordDuration(method: string, path: string, durationMs: number) {
    this.httpRequestDuration.observe({ method, path }, durationMs / 1000);
  }

  setActiveUsers(count: number) {
    this.activeUsers.set(count);
  }
}
```

### Metrics Interceptor

```typescript
// interceptors/metrics.interceptor.ts
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metrics: AppMetrics) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        this.metrics.recordRequest(request.method, request.route.path, response.statusCode);
        this.metrics.recordDuration(request.method, request.route.path, Date.now() - startTime);
      }),
    );
  }
}
```

## OpenTelemetry Tracing

```typescript
// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

const sdk = new NodeSDK({
  serviceName: 'api-user',
  traceExporter: new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

sdk.start();

// In service
import { Span, SpanStatusCode } from '@opentelemetry/api';

@Injectable()
export class UserService {
  private tracer = trace.getTracer('api-user');

  async findById(id: string): Promise<User> {
    return this.tracer.startActiveSpan('user.findById', async (span: Span) => {
      try {
        const user = await this.userRepository.findById(id);
        span.setStatus({ code: SpanStatusCode.OK });
        return user;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}
```

## API Versioning Strategies

### URI Versioning

```typescript
// main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});
```

```typescript
// Controller versions
@Controller({ version: '1' })
export class UserControllerV1 {
  @Get()
  findAll() {
    return 'v1 response';
  }
}

@Controller({ version: '2' })
export class UserControllerV2 {
  @Get()
  findAll() {
    return { data: [], meta: {} }; // different format
  }
}
```

### Header Versioning

```typescript
app.enableVersioning({
  type: VersioningType.HEADER,
  header: 'X-API-Version',
});
```

## Complete Pagination Implementation

### DTOs

```typescript
// pagination.dto.ts
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty()
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

### Service Implementation

```typescript
async findAll(pagination: PaginationQueryDto): Promise<PaginatedResponseDto<User>> {
  const { page = 1, limit = 10 } = pagination;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    this.userModel.find().skip(skip).limit(limit).lean(),
    this.userModel.countDocuments(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
```

## Filtering & Search Patterns

```typescript
// filter.dto.ts
export class UserFilterDto {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string; // searches in name, email
}

// Query builder
buildFilterQuery(filter: UserFilterDto): FilterQuery<User> {
  const query: FilterQuery<User> = {};

  if (filter.status) query.status = filter.status;

  if (filter.createdAfter || filter.createdBefore) {
    query.createdAt = {};
    if (filter.createdAfter) query.createdAt.$gte = new Date(filter.createdAfter);
    if (filter.createdBefore) query.createdAt.$lte = new Date(filter.createdBefore);
  }

  if (filter.search) {
    query.$or = [
      { name: { $regex: filter.search, $options: 'i' } },
      { email: { $regex: filter.search, $options: 'i' } },
    ];
  }

  return query;
}
```

## Health Check Module

```typescript
// health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('live')
  live() {
    return { status: 'live' };
  }

  @Get('ready')
  @UseGuards(InternalGuard)
  async ready(@Inject('DATABASE') db: Db) {
    try {
      await db.command({ ping: 1 });
      return { status: 'ready', database: 'connected' };
    } catch {
      return { status: 'not-ready', database: 'disconnected' };
    }
  }
}
```

## Docker Production Configuration

```dockerfile
# Multi-stage production build
FROM node:18-alpine AS base
WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm ci --omit=dev && npm cache clean --force

FROM node:18-alpine AS production
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
ENV NODE_ENV=production
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "require('http').get('http://localhost:3000/health', \
    res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "dist/main.js"]
```

## Graceful Shutdown

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const server = await app.listen(port, host);

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}
bootstrap();
```