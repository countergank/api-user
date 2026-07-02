---
priority: P1
category: auth
---

# Register Passport strategies in the module providers

**Do**: Add each Passport strategy class to the module's `providers` array so NestJS can instantiate and register it with the Passport framework.
**Avoid**: Importing Passport strategies without registering them as providers, which causes authentication to silently fail.
**Example**:
```typescript
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({ secret: config.jwtSecret, signOptions: { expiresIn: '1h' } }),
  ],
  providers: [UsersService, JwtStrategy],
  exports: [UsersService],
})
export class UsersModule {}
```
