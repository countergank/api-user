# Auth — Priority P0–P1

Authentication rules for who is calling: read this file when the task touches route protection with guards, guard composition, or JWT token validation.

## P0 — Enforce access with guards, not handler checks

Create guards that implement `CanActivate` and apply them with `@UseGuards()` at the controller or method level, so every protected route carries an explicit guard for authentication and authorization. Verification lives in the guard; controller methods stay free of authentication logic.

```typescript
// ✅ Guard implements CanActivate and verifies the bearer token
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    request.user = await this.jwtService.verifyAsync(token);
    return true;
  }
}
```

```typescript
// ❌ Authentication checked by hand inside the handler
@Get('profile')
async profile(@Req() request: Request) {
  const token = request.headers.authorization.replace('Bearer ', '');
  const user = await this.jwtService.verifyAsync(token);
  return this.usersService.findOne(user.sub);
}
```

## P1 — Compose guards so authentication runs before authorization

Stack guards with `@UseGuards(JwtAuthGuard, RolesGuard)` in the order they should run, so authentication executes first and authorization second, and declare the required role with `@Roles('admin')` on the route. A single guard holding both authentication and authorization is harder to test and reuse.

```typescript
// ✅ Guard order matches execution: authenticate, then authorize
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
async remove(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```

```typescript
// ❌ One guard mixes authentication and authorization
@Injectable()
export class AdminJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = await this.authenticate(context); // authentication
    return this.checkRole(user, ['admin']); // authorization
  }
}
```

## P1 — Validate tokens with a Passport JWT strategy

Create a `JwtStrategy` extending `PassportStrategy(Strategy)` that validates tokens and attaches the decoded user to the request. List the strategy class in the module's `providers` array — with `PassportModule.register({ defaultStrategy: 'jwt' })` in `imports` — so NestJS instantiates and registers it with the Passport framework; an unregistered strategy fails silently.

```typescript
// ✅ Passport strategy validates the payload and returns the request user
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: config.jwtSecret });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

```typescript
// ❌ Tokens parsed and verified by hand outside the Passport flow
export class JwtMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const token = req.headers.authorization.replace('Bearer ', '');
    req.user = verify(token, process.env.JWT_SECRET);
    next();
  }
}
```
