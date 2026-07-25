# Design: COU-144 — Migrate config consumers to ParameterService

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   ParameterService                    │
│  (Redis-backed, env-override, registry defaults)      │
└──────────┬──────────────┬──────────────────┬──────────┘
           │              │                  │
           ▼              ▼                  ▼
    ┌──────────┐  ┌──────────────┐  ┌────────────────────┐
    │ Parameter│  │    Email     │  │ DynamicThrottler   │
    │Definitions│  │   Factory    │  │     Guard          │
    │(registry) │  │  (async DI)  │  │  (sync cache)      │
    └──────────┘  └──────┬───────┘  └────────────────────┘
                         │
                    ┌────┴────┐
                    ▼         ▼
             ┌──────────┐ ┌──────────┐
             │  Smtp    │ │  Resend  │
             │ Provider │ │ Provider │
             └──────────┘ └──────────┘
```

## Component Design

### 1. Parameter Definitions (parameter-definitions.ts)

Add 14 new definitions to the existing `register()` call. Follow the same pattern as `EMAIL_PROVIDER`:

```typescript
register({
  key: 'EMAIL_HOST',
  type: 'string',
  defaultValue: 'smtp',
  label: 'SMTP Host',
  group: 'email',
  envVar: 'EMAIL_HOST',
  validate: (v) => typeof v === 'string' && v.length > 0,
});
```

### 2. Email Provider Factory Refactor

**Current:**
```typescript
// email.provider.factory.ts — sync factory
export function createEmailProvider(type: string): EmailProvider {
  if (type === 'resend') return new ResendProvider();
  return new SmtpProvider();
}

// email.module.ts — useFactory
providers: [{
  provide: 'EMAIL_PROVIDER',
  useFactory: () => createEmailProvider(process.env.EMAIL_PROVIDER || 'smtp'),
}]
```

**New:**
```typescript
// email.module.ts — async provider
providers: [
  {
    provide: 'EMAIL_PROVIDER_CONFIG',
    useFactory: async (paramService: ParameterService) => ({
      host: await paramService.get<string>('EMAIL_HOST'),
      port: await paramService.get<number>('EMAIL_PORT'),
      secure: await paramService.get<boolean>('EMAIL_SECURE'),
      fromEmail: await paramService.get<string>('EMAIL_FROM'),
    }),
    inject: [ParameterService],
  },
  SmtpProvider,  // ← DI injects config
  ResendProvider, // ← DI injects config
  EmailProviderFactory,
]
```

### 3. DynamicThrottlerGuard

**NEW FILE: `src/config/throttle/dynamic-throttler.guard.ts`**

```typescript
@Injectable()
export class DynamicThrottlerGuard extends ThrottlerGuard {
  private configMap = new Map<string, { limit: number; ttl: number }>();

  constructor(
    private readonly parameterService: ParameterService,
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorageService,
  ) {
    super(options, storageService);
  }

  async onModuleInit() {
    await this.loadConfig();
  }

  private async loadConfig() {
    const groups = [
      ['global', 'THROTTLE_LIMIT', 'THROTTLE_TTL'],
      ['login', 'LOGIN_THROTTLE_LIMIT', 'LOGIN_THROTTLE_TTL'],
      ['register', 'REGISTER_THROTTLE_LIMIT', 'REGISTER_THROTTLE_TTL'],
      ['forgot-password', 'FORGOT_PASSWORD_THROTTLE_LIMIT', 'FORGOT_PASSWORD_THROTTLE_TTL'],
    ];

    for (const [name, limitKey, ttlKey] of groups) {
      this.configMap.set(name, {
        limit: Number(await this.parameterService.get(limitKey)),
        ttl: Number(await this.parameterService.get(ttlKey)),
      });
    }
  }

  async refreshConfig(): Promise<void> {
    await this.loadConfig();
  }
}
```

**Route matching** overrides `getTracker()` to map request routes to config keys.

### 4. Auth Controller Changes

Remove all `@Throttle()` decorators. The guard handles limits per-route internally.

```typescript
// BEFORE
@Post('login')
@Throttle({ default: { limit: +process.env.LOGIN_THROTTLE_LIMIT, ttl: +process.env.LOGIN_THROTTLE_TTL } })
async login(@Body() dto: LoginDto) { ... }

// AFTER
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

### 5. ThrottlerModule Registration

```typescript
// app.module.ts
ThrottlerModule.forRootAsync({
  imports: [ParameterModule],
  inject: [ParameterService],
  useFactory: async (paramService: ParameterService) => ({
    throttlers: [
      {
        limit: Number(await paramService.get('THROTTLE_LIMIT')),
        ttl: Number(await paramService.get('THROTTLE_TTL')),
      },
    ],
  }),
}),
```

## Data Flow

### Read Path (request → throttle check)
1. Request hits controller
2. `DynamicThrottlerGuard` intercepts
3. Guard reads `this.configMap.get(routeName)` for limit/ttl
4. Falls back to `global` config if no route-specific config
5. `ThrottlerGuard.handleRequest()` executes with those values
6. If limit exceeded → 429 Too Many Requests

### Config Update Path (admin PUT → refresh)
1. Admin PUTs new value to `/admin/parameters/THROTTLE_LIMIT`
2. `ParameterAdminController` updates `ParameterStore` (Redis)
3. `DynamicThrottlerGuard.refreshConfig()` is called → reloads from ParameterService

## Test Strategy

### Unit Tests
- `DynamicThrottlerGuard`: mock ParameterService, verify configMap is populated
- `SmtpProvider`: pass mock config, verify it uses config values
- `ResendProvider`: same pattern
- `EmailProviderFactory`: verify it creates correct provider with config

### Integration Tests
- Auth controller: verify throttle limits are applied correctly
- Email module: verify providers are created with correct config

## Files

### Modified
| File | Change |
|------|--------|
| `src/config/parameters/parameter-definitions.ts` | +14 new definitions |
| `src/email/email.module.ts` | Refactor provider registration |
| `src/email/email.provider.factory.ts` | Refactor to async DI |
| `src/email/providers/smtp.provider.ts` | Constructor receives config |
| `src/email/providers/resend.provider.ts` | Constructor receives config |
| `src/auth/auth.controller.ts` | Remove @Throttle decorators |
| `src/app/app.module.ts` | Update ThrottlerModule registration |
| `src/config/parameters/__tests__/parameter-registry.spec.ts` | +new param tests |
| `src/email/__tests__/email.service.spec.ts` | Update mocks |
| `src/email/__tests__/email.listener.spec.ts` | Update mocks |
| `src/auth/auth.controller.spec.ts` | Update mocks |

### New
| File | Description |
|------|-------------|
| `src/config/throttle/dynamic-throttler.guard.ts` | Custom throttle guard |
| `src/config/throttle/__tests__/dynamic-throttler.guard.spec.ts` | Guard tests |
| `src/config/throttle/index.ts` | Barrel export |

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Throttle cache stale after reboot | Low | Medium | Load from ParameterService on module init |
| Email sending breaks during migration | Low | High | Keep env fallback in providers during transition |
| Test coverage gaps | Medium | Medium | Write tests first (Strict TDD) |
