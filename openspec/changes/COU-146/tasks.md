# Tasks: User Cache for JWT Validation

**Change**: COU-146
**Estimated**: ~150-200 changed lines
**Dependency**: COU-145 (CacheService, completed)

---

## Phase 1: Foundation

### 1.1 Add CacheService to AuthService
- **File**: `src/auth/auth.service.ts`
- **Changes**: Import `CacheService`, inject in constructor
- **Verify**: TypeScript compiles, existing tests pass
- **Lines**: ~5

### 1.2 Rewrite validateUser with cache-aside
- **File**: `src/auth/auth.service.ts`
- **Changes**: Check `cacheService.get(user:${userId})` before `userService.findById`; populate cache on miss
- **Verify**: Unit test: cache hit returns cached user; cache miss queries DB and populates cache
- **Lines**: ~10

### 1.3 Add CacheService to UserService
- **File**: `src/user/service/user.service.ts`
- **Changes**: Import `CacheService`, inject in constructor
- **Verify**: TypeScript compiles, existing tests pass
- **Lines**: ~5

### 1.4 Add invalidation helper
- **File**: `src/user/service/user.service.ts`
- **Changes**: Add `private async invalidateUserCache(userId: string)` method
- **Verify**: Unit test: helper calls `cacheService.del`
- **Lines**: ~5

---

## Phase 2: Invalidation

### 2.1 Invalidation — create / createWithRole
- **File**: `src/user/service/user.service.ts`
- **Changes**: Call `invalidateUserCache` after `create` and `createWithRole`
- **Lines**: ~4

### 2.2 Invalidation — update / updateUser
- **File**: `src/user/service/user.service.ts`
- **Changes**: Call `invalidateUserCache` after `update` and `updateUser`
- **Lines**: ~4

### 2.3 Invalidation — deleteUser
- **File**: `src/user/service/user.service.ts`
- **Changes**: Call `invalidateUserCache` after soft-delete
- **Lines**: ~2

### 2.4 Invalidation — toggleActiveUser / unlockUser
- **File**: `src/user/service/user.service.ts`
- **Changes**: Call `invalidateUserCache` after each
- **Lines**: ~4

### 2.5 Invalidation — requestEmailChange
- **File**: `src/user/service/user.service.ts`
- **Changes**: Call `invalidateUserCache` after pending email set
- **Lines**: ~2

---

## Phase 3: Testing

### 3.1 AuthService cache tests
- **File**: `src/auth/auth.service.spec.ts`
- **Changes**: Test cache hit, cache miss, cache population, Redis error fallback
- **Lines**: ~40

### 3.2 UserService invalidation tests
- **File**: `src/user/service/user.service.spec.ts`
- **Changes**: Test `cacheService.del` called after each mutation method
- **Lines**: ~60

---

## Verification Checklist

- [x] All existing tests pass unchanged
- [x] `validateUser` cache hit returns cached user (no DB call)
- [x] `validateUser` cache miss queries DB and populates cache
- [x] Every mutation method calls `invalidateUserCache`
- [x] Redis down → no 401/500 errors (graceful degradation)
- [x] Cache key format is `user:{userId}`
- [x] TTL is 5 minutes (via CacheService default)
