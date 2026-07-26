# Proposal: COU-142 — Parameter Decorator

## Intent

Create a NestJS `@Parameter()` method parameter decorator that injects `ParameterService` values into controller method parameters. This enables clean, type-safe access to dynamic configuration parameters (e.g., throttle limits, email settings) directly in controller signatures, following the existing `@CurrentUser` and `@RequestLang` decorator patterns.

## Scope

### In Scope
- Create `@Parameter(key: string, options?: ParameterDecoratorOptions)` decorator in `src/config/parameters/decorators/parameter.decorator.ts`
- Add static service holder pattern to `ParameterService` (via `onApplicationBootstrap` lifecycle hook)
- Support typed return values via `ParameterType` mapping from `parameter.types.ts` (e.g., `@Parameter('THROTTLE_LIMIT')` → `number`)
- Return `undefined` for unknown keys (graceful degradation); optional `strict: true` to throw
- Export decorator from `src/config/parameters/decorators/index.ts` and re-export from module barrel
- Update `ParameterModule` to ensure service initialization via `onApplicationBootstrap`

### Out of Scope
- Validation pipe integration (separate concern)
- OpenAPI/Swagger parameter decoration
- Reactive/observable parameter streams
- Parameter change hot-reload in controllers (requires separate event-driven design)

## Capabilities

> Contract between proposal and specs phases. The sdd-spec agent reads this to know which spec files to create or update.

### New Capabilities
- `parameter-decorator`: New `@Parameter()` decorator for injecting parameter values into controller method parameters with type inference from registered definitions

### Modified Capabilities
- `parameter-service`: Add static holder pattern and `onApplicationBootstrap` lifecycle hook to expose service instance to decorator factory

## Approach

Follow the established `createParamDecorator` pattern from `@CurrentUser` and `@RequestLang` decorators. Use the static service holder pattern from `DynamicThrottlerGuard` (service registers itself in static field during `onApplicationBootstrap`). The decorator factory uses this static reference to call `await service.get(key)` at request time.

**Decorator signature:**
```typescript
interface ParameterDecoratorOptions {
  strict?: boolean; // throw if key not found (default: false → returns undefined)
}

function Parameter(key: string, options?: ParameterDecoratorOptions): ParameterDecorator;
```

**Type inference:** Map `ParameterType` from registry (`string` | `number` | `boolean`) to TypeScript return type via conditional type helper.

**Error handling:** Unknown key → `undefined` (default) or throw if `strict: true`. Service errors (Redis down) propagate — caller handles via global exception filter.

**Location:** `src/config/parameters/decorators/parameter.decorator.ts` — collocated with `ParameterService` (config owns the dependency).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/config/parameters/parameter.service.ts` | Modified | Add static holder + `onApplicationBootstrap` |
| `src/config/parameters/parameter.module.ts` | Modified | Ensure service init hook runs |
| `src/config/parameters/decorators/parameter.decorator.ts` | New | Decorator factory + type helper |
| `src/config/parameters/decorators/index.ts` | New | Barrel export |
| `src/config/parameters/index.ts` | Modified | Re-export decorator |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Static holder not initialized when decorator runs | Low | `onApplicationBootstrap` runs after all providers instantiated; decorator used in controllers which load after modules |
| Redis failure during decorator execution | Medium | Service already handles Redis failure gracefully (returns default); propagate error for global filter |
| Type mismatch between registry and decorator usage | Low | TypeScript conditional type maps `ParameterType` → TS type; unknown key returns `unknown` |
| Circular dependency (decorator → service → module) | Low | Decorator uses static holder, no DI injection; module exports service, decorator imports from decorators barrel |

## Rollback Plan

1. Revert `parameter.service.ts` — remove static holder and `onApplicationBootstrap`
2. Revert `parameter.module.ts` — remove init logic if any
3. Delete `src/config/parameters/decorators/` directory
4. Remove decorator export from `parameter/index.ts`
5. Revert any controller usages (grep `@Parameter`)

## Dependencies

- `ParameterModule` must be imported in `AppModule` (already global)
- Existing `ParameterService`, `ParameterRegistry`, `ParameterStore` unchanged
- NestJS `createParamDecorator` from `@nestjs/common`

## Success Criteria

- [ ] `@Parameter('THROTTLE_LIMIT')` returns `number` in controller method parameter
- [ ] `@Parameter('EMAIL_HOST')` returns `string`
- [ ] `@Parameter('UNKNOWN_KEY')` returns `undefined` (no throw)
- [ ] `@Parameter('UNKNOWN_KEY', { strict: true })` throws
- [ ] Decorator works in controller methods alongside `@CurrentUser`, `@RequestLang`
- [ ] Existing `DynamicThrottlerGuard` continues to work (no regression)
- [ ] TypeScript compiles without errors; type inference works in IDE