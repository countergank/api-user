## Exploration: COU-142 — Parameter Decorator

### Current State

The codebase already has:
- **ParameterService** (`src/config/parameters/parameter.service.ts`): Async service with `get(key)`, already available globally via `@Global()` ParameterModule. All 13 params registered (email + throttle config).
- **ParameterStore**: Redis-backed store with L1 in-memory cache and TTL-based expiry. Fallback to registry defaults on Redis failure.
- **ParameterRegistry**: Validates parameter definitions against types ('string', 'number', 'boolean').
- **Existing decorators in `common/decorators/`**: `@CurrentUser` and `@RequestLang` — both use `createParamDecorator` with synchronous pure helper functions. Tests test the helper function directly.
- **DynamicThrottlerGuard** (`config/throttle/`): Example of injecting ParameterService via DI. Pre-loads config at `onModuleInit`.

### The Core Challenge

`createParamDecorator` gives the factory function only `(data: unknown, ctx: ExecutionContext)` — there is NO direct access to the DI container. Existing decorators work because they extract data from the HTTP request object synchronously. `ParameterService.get(key)` is async and requires a service instance that only DI can provide.

This means we need a mechanism to bridge the gap between `createParamDecorator` and DI.

### Affected Areas

- `src/config/parameters/parameter.service.ts` — the async service the decorator will consume
- `src/config/parameters/parameter.module.ts` — needs lifecycle hook to initialize the static service reference
- `src/config/parameters/parameter.types.ts` — type definitions for ParameterType
- `src/common/decorators/current-user.decorator.ts` — existing pattern to follow
- `src/common/decorators/request-lang.decorator.ts` — existing pattern to follow
- `src/config/parameters/parameter-definitions.ts` — 13 registered param keys/types for compile-time constants

### Approaches

**Decision 1: Decorator Type**

1. **Method parameter decorator ONLY** — `@Parameter('EMAIL_HOST') emailHost: string` on controller method parameters
   - Pros: Consistent with existing `@CurrentUser`, `@RequestLang`. Uses `createParamDecorator`. Async-compatible. Follows NestJS convention.
   - Cons: Only works in controller methods (not in services or non-controller classes)
   - Effort: Low

2. **Property decorator ONLY** — `@Parameter('EMAIL_HOST') emailHost: string` on class properties
   - Pros: Can be used in any class (including services)
   - Cons: Requires different approach (`reflect-metadata` + factory). Property decorators can't inject values at decoration time — need lazy resolution. Unusual pattern in NestJS. Harder to test.
   - Effort: High

3. **Both patterns**
   - Pros: Maximum flexibility
   - Cons: Two separate implementations. Property decorator path has async timing challenges.
   - Effort: High

**Decision 2: DI Resolution Strategy (for the parameter decorator)**

1. **Static service holder** — ParameterService sets itself in a static variable during `onApplicationBootstrap` (via a helper). The decorator's factory function uses this static reference.
   - Pros: Fast (no lookup per request). Simple. Platform-agnostic (works with Express and Fastify). Testable (swap the static ref). Used by many NestJS production codebases (e.g., @nestjs/graphql uses similar patterns internally).
   - Cons: Global state (but it's initialized at bootstrap before any HTTP request). Slight architectural impurity.
   - Effort: Low

2. **ModuleRef from request** — Access `ModuleRef` via `ctx.switchToHttp().getRequest()` platform internals
   - Pros: Pure DI, no static state
   - Cons: Breaks platform abstraction. Requires platform-specific hacks (different for Express vs Fastify). Fragile across NestJS versions. Not recommended.
   - Effort: Medium

3. **Custom decorator factory** — Create a factory that receives ParameterService via explicit injection at the controller level (decorator takes a service argument)
   - Pros: Pure DI
   - Cons: Awkward API — every controller would need to pass the service. Defeats the purpose of a decorator.
   - Effort: Low (but terrible UX)

4. **Interceptor + custom decorator** — Create an interceptor that resolves the parameter value and attaches it to the request, then a synchronous decorator reads it
   - Pros: Clean separation of concerns. Decorator stays synchronous.
   - Cons: More moving parts. Overhead for every request with @Parameter. Two artifacts instead of one.
   - Effort: Medium

**Decision 3: Decorator Location**

1. **`src/config/parameters/decorators/parameter.decorator.ts`** — collocated with ParameterService
   - Pros: Respects dependency direction (config → nothing, common ← config shouldn't happen). Keeps the decorator close to the service it depends on. Same pattern as DynamicThrottlerGuard in `config/throttle/`.
   - Cons: Different from existing decorators in `common/decorators/`. Users need to know where to find it.
   - Effort: Low

2. **`src/common/decorators/parameter.decorator.ts`** — alongside existing decorators
   - Pros: Consistent with `@CurrentUser`, `@RequestLang`. Single location for all param decorators. Skill rule recommends `common/decorators/`.
   - Cons: Introduces dependency from `common/` → `config/parameters/` (common should be lower-level). Violates domain boundaries.
   - Effort: Low

**Decision 4: Type Safety**

1. **No generics** — Always returns `string | number | boolean`
   - Pros: Simple. Matches ParameterService.get() signature exactly.
   - Cons: Every usage needs type assertion or manual narrowing.
   - Effort: None

2. **Optional generic parameter** — `@Parameter<string>('EMAIL_HOST')`
   - Pros: Compile-time type hint. Caller can specify expected type.
   - Cons: TypeScript generics on decorator functions are compile-time only — no runtime enforcement. The actual value could differ. Type assertion without verification.
   - Effort: Low

3. **Typed constants** — Export key-specific typed functions: `EmailHost()`, `ThrottleLimit()`, etc.
   - Pros: Maximum type safety. Auto-complete for known params.
   - Cons: 13+ individual decorators to maintain. Doesn't scale for dynamic keys. Verbose.
   - Effort: High

**Decision 5: Error Handling**

1. **Let errors propagate** — If the key doesn't exist, the standard `ParameterStore` error (registry not found) throws, resulting in a 500
   - Pros: Consistent with direct ParameterService usage. Catches misconfiguration early.
   - Cons: Can't be used for optional parameters.
   - Effort: None

2. **Graceful fallback** — Return `undefined` for missing keys, accept optional `defaultValue` parameter
   - Pros: More flexible. Can be used in non-critical paths.
   - Cons: Silently hides configuration errors. Different behavior from `ParameterService.get()`.
   - Effort: Low

3. **Both** — Default to propagate errors, accept optional `defaultValue` param for controlled fallback
   - Pros: Best of both. Caller decides.
   - Cons: Slightly more complex signature.
   - Effort: Low

### Recommendation

**For Decorator Type**: Method parameter decorator (Option 1). It follows the existing pattern (`@CurrentUser`, `@RequestLang`), is async-compatible with `createParamDecorator`, and is the NestJS-idiomatic way. The property decorator approach has fundamental timing conflicts — property decorators run at class definition time, long before any request context exists.

**For DI Resolution**: Static service holder (Option 1). It's the simplest, fastest, and most reliable approach. The `ParameterModule` is `@Global()` and initializes during `onApplicationBootstrap`, well before any HTTP request reaches a controller. The holder is a small module-adjacent helper that ParameterService populates during startup.

**For Location**: `src/config/parameters/decorators/parameter.decorator.ts` with the helper at `src/config/parameters/decorators/extract-parameter.helper.ts`. The dependency direction — common/ shouldn't depend on config/ — is a real architectural concern. The decorator belongs with its service, like DynamicThrottlerGuard lives in config/throttle/. Export from `src/config/parameters/index.ts` for convenient import.

**For Type Safety**: Optional generic parameter (Option 2). Lets callers annotate the expected type without imposing a massive maintenance burden of per-key decorators. The tradeoff (compile-time hint without runtime enforcement) is acceptable for a decorator that wraps an inherently untyped runtime call.

**For Error Handling**: Both patterns (Option 3). Default: propagate errors (missing keys = 500). Accept an optional `defaultValue` as second argument for callers that want safe fallback.

### Proposed API

```typescript
// Usage
@Get('send-test')
async sendTest(@Parameter('EMAIL_HOST') host: string) { ... }

// With default
@Get('config')
async getConfig(@Parameter('THROTTLE_LIMIT', 10) limit: number) { ... }

// With generic type hint
@Get('email-config')
async emailConfig(@Parameter<string>('EMAIL_HOST') host: string) { ... }
```

### Files to Create

1. **`src/config/parameters/decorators/extract-parameter.helper.ts`**
   - Pure async function: `extractParameter(key: string, defaultValue?: T): Promise<string | number | boolean | undefined>`
   - Holds a static reference to ParameterService (set by ParameterModule on bootstrap)
   - Tests test this function directly (follows existing pattern)

2. **`src/config/parameters/decorators/parameter.decorator.ts`**
   - `export const Parameter = createParamDecorator(extractParameter)`
   - Optionally generic: `Parameter<T>(key, defaultValue?)`

3. **`src/config/parameters/parameter.module.ts`** (UPDATE)
   - Implement `OnApplicationBootstrap`
   - Call `setParameterService(this.parameterService)` in the hook

4. **Module exports** — Update `src/config/parameters/index.ts` to export the decorator

### Risks

1. **Initialization timing** — `OnApplicationBootstrap` fires after all module constructors but before the server starts listening. Any HTTP request will have access to the service. If a microservice or event handler fires during bootstrap before the hook runs, the static reference won't be set yet. Risk is low given current architecture.

2. **Testing the decorator** — The existing pattern (test the helper function directly) works well for the parameter decorator. The helper receives `ParameterService` via the static holder. Tests should mock the holder before exercising the helper.

3. **Thread safety** — In Node.js single-threaded model, setting a static reference during bootstrap is safe. The reference is effectively immutable after the server starts.

4. **Fastify compatibility** — The decorator works with Fastify (already in use per `openspec/config.yaml`: "API: REST with Fastify adapter") because it accesses `ctx.switchToHttp().getRequest()` — but the decorator doesn't actually read from the request object. It uses the helper which holds a static reference. So no platform compatibility issue.

5. **LSP / IDE support** — TypeScript generic parameter on a `createParamDecorator` may not auto-infer well in all editors. The generic is optional, so users can omit it and type the parameter manually.

6. **Error visibility** — If `ParameterService` is not initialized (missing module, wrong import), the helper throws at first usage with a clear message like "ParameterService not initialized. Ensure ParameterModule is imported."

### Approach Comparison

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **A: Static holder + method decorator** | Fast, simple, testable, platform-agnostic, follows existing pattern | Static global state, module coupling | **Low** |
| B: ModuleRef from request | Pure DI, no global state | Platform-specific, fragile across NestJS versions | Medium |
| C: Interceptor + sync decorator | Clean separation, no async concerns | More moving parts, per-request overhead | Medium |
| D: Property decorator | Works in any class | Timing issues, not NestJS-idiomatic, complex | High |

### Ready for Proposal

**Yes.** The approach is clear, the static holder pattern is well-understood in NestJS production code, and the implementation surface is small (3 files, 1 module update). The orchestrator should proceed to proposal.

### Key Constraints

- The decorator MUST work with Fastify (the platform in use per config)
- The helper function MUST be independently testable (existing pattern)
- Error messages MUST be actionable (clear what went wrong and how to fix)
- `Parameter` is exported from `src/config/parameters/` (preserving dependency direction)
