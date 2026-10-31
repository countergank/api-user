# Security — Priority P0–P1

Read this file when the task touches what arrives in the request: payload validation, security headers, CORS, or rate limits.

## P0 — Apply ValidationPipe globally with transform and whitelist

Register `ValidationPipe` once globally in `main.ts` with `transform: true` and `whitelist: true`, so every controller route validates incoming bodies and strips unexpected properties by default. DTOs carry `class-validator` decorators that describe the payload, and handlers receive typed, transformed bodies without validating fields by hand. A route-level `@UsePipes(new ValidationPipe(...))` is a documented exception for a single endpoint that needs different validation options than the global pipe.

```typescript
// ✅ One global pipe covers every route
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true })
  );
  await app.listen(3000);
}
```

```typescript
// ❌ Repeating the pipe per route leaves the rest of the API unvalidated
@Post()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
async create(@Body() dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

## P0 — Enable Helmet and restrict CORS to an origin allowlist

Enable Helmet for security headers and configure CORS with an explicit `origin` allowlist in production. On Fastify, register `@fastify/helmet` on the Fastify instance instead of the Express `helmet()` middleware; CORS configuration itself is unchanged.

```typescript
// ✅ Helmet plus an explicit origin allowlist
app.use(helmet());
app.enableCors({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST'],
  credentials: true,
});
```

```typescript
// ❌ Wildcard origin exposes the API to cross-origin attacks
app.enableCors({ origin: '*' });
```

## P1 — Rate-limit authentication and mutation endpoints

Cap requests per IP or per user within a time window using `@nestjs/throttler`, and give login, registration, and password-reset endpoints stricter limits than the module default so credential stuffing is impractical.

```typescript
// ✅ Module default plus a stricter limit on login
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),
  ],
})
export class AppModule {}

@Throttle({ default: { limit: 5, ttl: 60 } })
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

```typescript
// ❌ Login endpoint without a throttle limit of its own
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```
