# Design: Email Service with Resend/SMTP and DB Templates

**Change**: `feature/email-service-resend-and-google`
**Project**: api-user

---

## Context

The project has zero email infrastructure despite needing it for account verification, password reset, email change, and other transactional flows. The `forgotPassword` endpoint generates tokens but never sends emails, and user registration sets `isActive: false` with no verification mechanism.

## Goals

1. Create a production-ready email service with multi-provider support
2. Enable dynamic template management stored in MongoDB
3. Provide audit logging for all email activity
4. Integrate with existing auth flows (forgot password, registration)
5. Support future email use cases without code changes

## Non-Goals

- Email marketing or bulk sending
- Webhook handling for delivery/open tracking (future)
- Admin UI for template management (future)
- Rate limiting (handled at infrastructure level)

## Architecture Decisions

### AD-1: Provider Pattern with Factory

**Decision**: Use Strategy pattern with an `EmailProvider` interface resolved at runtime by a factory based on `EMAIL_PROVIDER` env var.

**Rationale**:
- Enables switching providers without code changes
- Each provider encapsulates its own SDK/config logic
- Easy to add future providers (SendGrid, SES, etc.)
- Provider resolution happens once at app startup (singleton)

**Alternative considered**: Using `@nestjs-modules/mailer` with transport configuration.
**Rejected because**: It wraps nodemailer and doesn't support Resend's native SDK features (attachments, React templates, etc.). Direct provider implementations give full control.

```
                    ┌─────────────────┐
                    │  EmailService   │
                    │  (orchestrator) │
                    └────────┬────────┘
                             │ uses
                    ┌────────▼────────┐
                    │  EmailProvider  │ ← interface
                    │   (contract)    │
                    └────────┬────────┘
                             │
               ┌──────────────┴──────────────┐
               │                             │
      ┌────────▼────────┐          ┌────────▼────────┐
      │ ResendProvider  │          │  SmtpProvider   │
      │ (SDK oficial)   │          │ (nodemailer)    │
      └─────────────────┘          └─────────────────┘
```

### AD-2: Templates in MongoDB with Fallback

**Decision**: Store templates in MongoDB as documents with HTML content and variable lists. Embed default HTML files as fallback.

**Rationale**:
- Dynamic template changes without redeploy
- Multi-tenant capable (can add tenantId later)
- Version tracking for audit purposes
- Embedded defaults guarantee critical emails always work

**Template resolution flow**:
```
sendBySlug('password-reset', vars)
  → Query MongoDB WHERE slug='password-reset' AND isActive=true
    → Found → Use DB template
    → Not found → Load from templates/defaults/password-reset.html
    → DB exists but isActive=false → Load from defaults
  → Substitute variables → Render HTML → Send
```

### AD-3: Simple String Replacement for Variables

**Decision**: Use simple `{{variableName}}` placeholder replacement via regex.

**Rationale**:
- No build-time compilation needed (works with DB-stored templates)
- No dependency on React/JSX rendering pipeline
- Predictable and debuggable
- Performant enough for transactional emails

**Rejected**: Handlebars/EJS/Pug — adds unnecessary complexity and security concerns with server-side templating.

### AD-4: Async Dispatch via EventEmitter

**Decision**: Use Node.js EventEmitter for async email dispatch instead of message queues.

**Rationale**:
- No external infrastructure needed (no RabbitMQ, Redis, etc.)
- Simple implementation for transactional emails
- Keeps request response fast (return "queued" immediately)
- Can upgrade to proper queue later if volume increases

**Alternative considered**: Bull/BullMQ with Redis.
**Rejected because**: Over-engineering for current scale. Transactional emails are low volume. Can migrate later.

### AD-5: Email Audit Log in MongoDB

**Decision**: Store every email send attempt in a dedicated MongoDB collection.

**Rationale**:
- Full visibility into email delivery
- Debugging failed sends
- Compliance and audit requirements
- Queryable without external tools

### AD-6: Provider Default by Environment

**Decision**: SMTP (simple auth) for `local`/`development`, Resend for `staging`/`production`.

**Rationale**:
- SMTP with app password is simple and works for any email provider (Gmail, Outlook, custom)
- No OAuth2 complexity — just host, port, user, pass
- Resend requires verified domains — impractical for local dev
- Production benefits from Resend's delivery tracking and webhooks
- Can override via `EMAIL_PROVIDER` env var at any time

### AD-7: Admin-Only Access

**Decision**: All email endpoints require `ADMIN` role via `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` at controller level.

**Rationale**:
- Sending emails is a privileged operation
- Template management affects the entire system
- Prevents regular users from abusing email sending
- Consistent with existing admin-only controllers (UserController)

### AD-8: Function-based Factory (not class)

**Decision**: Use `createEmailProvider()` function instead of `EmailProviderFactory` class.

**Rationale**:
- Biome linter flag: `noStaticOnlyClass` — classes with only static members should be functions
- Simpler and more idiomatic TypeScript
- No state to encapsulate

### AD-9: Event-Driven Architecture for Email Triggers

**Decision**: Use `EventEmitter2` to decouple domain events from email sending. `AuthService` emits events; `EmailListener` (in `EmailModule`) handles them.

**Before (coupled)**:
```
AuthService.register() → this.emailService.sendBySlug('welcome', ...)
```

**After (decoupled)**:
```
AuthService.register() → this.eventEmitter.emit('user.registered', payload)
                                                          ↓ (async)
EmailListener.handleUserRegistered() → this.emailService.sendBySlug('welcome', ...)
```

**Rationale**:
- `AuthService` doesn't know about emails — follows Single Responsibility Principle
- Eliminates circular dependency between `AuthModule` and `EmailModule`
- Adding new reactions to events (analytics, notifications, audit) requires zero changes to auth
- Events are a clean contract between bounded contexts
- `EventEmitter2` supports async handling, error isolation, wildcards

**Tradeoff**:
- Slightly more code (listener classes, event constants)
- Harder to trace flow (events are implicit) — mitigated by naming conventions

**Event Constants**:
```typescript
export const EmailEvents = {
  USER_REGISTERED: 'user.registered',
  FORGOT_PASSWORD: 'auth.forgot-password',
  PASSWORD_CHANGED: 'auth.password-changed',
  EMAIL_CHANGE_REQUESTED: 'user.email-change-requested',
  EMAIL_CHANGE_CONFIRMED: 'user.email-change-confirmed',
  RESEND_VERIFICATION: 'auth.resend-verification',
} as const;
```

**Event Listener Pattern**:
```typescript
@Injectable()
export class EmailListener {
  @OnEvent('user.registered')
  async handleUserRegistered(payload: UserRegisteredEvent) {
    const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${payload.verificationToken}`;
    await this.emailService.sendBySlug('welcome', payload.email, {
      userName: payload.name,
      verificationLink,
    });
  }

  @OnEvent('auth.forgot-password')
  async handleForgotPassword(payload: ForgotPasswordEvent) { ... }

  @OnEvent('auth.password-changed')
  async handlePasswordChanged(payload: PasswordChangedEvent) { ... }

  // etc.
}
```

### AD-10: Injection Token for EmailProvider

**Decision**: Use `EMAIL_PROVIDER_TOKEN` (string) as DI token instead of the `EmailProvider` interface.

**Rationale**:
- TypeScript interfaces are compile-time only — can't be used as runtime DI tokens
- Using a string token is NestJS standard for interface-based providers
- Centralized in `email.module.ts` for consistency

## Component Design

### Email Provider Interface

```typescript
interface EmailSendParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailProvider {
  send(params: EmailSendParams): Promise<EmailSendResult>;
}
```

### Email Provider Factory

```typescript
export function createEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || getDefaultProvider();
  const ProviderClass = PROVIDER_MAP[provider];
  if (!ProviderClass) {
    throw new Error(`Unsupported email provider: ${provider}`);
  }
  return new ProviderClass();
}

function getDefaultProvider(): string {
  const env = process.env.NODE_ENV;
  if (env === 'local' || env === 'development') return 'smtp';
  return 'resend';
}
```

### Template Entity

```typescript
@Schema({ autoIndex: true, timestamps: true, versionKey: false })
class EmailTemplate extends Base {
  @Prop({ required: true }) name: string;
  @Prop({ required: true, unique: true, lowercase: true }) slug: string;
  @Prop({ required: true }) subject: string;
  @Prop({ required: true }) content: string;
  @Prop({ type: [String], default: [] }) variables: string[];
  @Prop() imageUrl?: string;
  @Prop({ default: true }) isActive: boolean;
  @Prop({ default: 1 }) version: number;
}
```

### Email Log Entity

```typescript
@Schema({ autoIndex: true, timestamps: true, versionKey: false })
class EmailLog extends Base {
  @Prop({ required: true }) recipient: string;
  @Prop() templateSlug?: string;
  @Prop({ required: true }) subject: string;
  @Prop({ required: true }) provider: string;
  @Prop({ required: true, enum: ['pending', 'sent', 'failed'] }) status: string;
  @Prop() messageId?: string;
  @Prop() error?: string;
  @Prop({ type: Object }) metadata?: Record<string, unknown>;
}
```

### Email Service (Main Orchestrator)

```typescript
class EmailService {
  constructor(
    private provider: EmailProvider,
    private templateService: EmailTemplateService,
    private logRepository: EmailLogRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  async sendBySlug(slug: string, variables: Record<string, string>): Promise<{ status: string }> {
    // 1. Resolve template (DB → fallback)
    const template = await this.templateService.resolve(slug);
    
    // 2. Render with variables
    const { subject, html } = this.templateService.render(template, variables);
    
    // 3. Create pending log
    const log = await this.logRepository.create({ ... });
    
    // 4. Async dispatch
    this.eventEmitter.emit('email.send', { to, subject, html, logId: log.id });
    
    return { status: 'queued' };
  }
}
```

### Smtp Provider

```typescript
class SmtpProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }

  async send(params: EmailSendParams): Promise<EmailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: params.from || process.env.EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
```

### Resend Provider

```typescript
class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async send(params: EmailSendParams): Promise<EmailSendResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: params.from || process.env.EMAIL_FROM!,
        to: params.to,
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, messageId: data?.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
```

## Module Registration

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: EmailLog.name, schema: EmailLogSchema },
    ]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [EmailController, EmailTemplateController],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailTemplateRepository,
    EmailLogRepository,
    {
      provide: EMAIL_PROVIDER_TOKEN, // string token, not interface
      useFactory: () => createEmailProvider(),
    },
  ],
  exports: [EmailService],
})
export class EmailModule implements OnModuleInit {
  constructor(private templateService: EmailTemplateService) {}

  async onModuleInit() {
    await this.templateService.seedDefaults();
  }
}
```

## Integration Points

### Event Emission (AuthService — NO direct email dependency)

**auth.service.ts** — emits events, doesn't call EmailService:
```typescript
async forgotPassword(email: string): Promise<void> {
  const user = await this.userService.findByEmail(email);
  if (!user) return;

  const resetToken = randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await this.userService.update(user.id, {
    resetPasswordToken: resetToken,
    resetPasswordExpires: expires,
  });

  // Emit event — EmailListener handles the actual email
  this.eventEmitter.emit('auth.forgot-password', {
    userId: user.id,
    email: user.email,
    name: user.name,
    resetToken,
  });
}

async register(...) {
  // ... user creation ...

  const verificationToken = randomUUID();
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await this.userService.update(user.id, {
    emailVerificationToken: verificationToken,
    emailVerificationExpires,
  });

  // Emit event — EmailListener handles the actual email
  this.eventEmitter.emit('user.registered', {
    userId: user.id,
    email: user.email,
    name: user.name,
    verificationToken,
  });

  return this.generateAuthResponse(user);
}
```

### Event Handling (EmailListener — in EmailModule)

```typescript
@Injectable()
export class EmailListener {
  constructor(private emailService: EmailService) {}

  @OnEvent('user.registered')
  async handleUserRegistered(payload: UserRegisteredEvent) {
    const link = `${process.env.FRONTEND_URL}/verify?token=${payload.verificationToken}`;
    await this.emailService.sendBySlug('welcome', payload.email, {
      userName: payload.name,
      verificationLink: link,
    });
  }

  @OnEvent('auth.forgot-password')
  async handleForgotPassword(payload: ForgotPasswordEvent) {
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${payload.resetToken}`;
    await this.emailService.sendBySlug('password-reset', payload.email, {
      userName: payload.name,
      resetLink: link,
    });
  }

  @OnEvent('auth.password-changed')
  async handlePasswordChanged(payload: PasswordChangedEvent) {
    await this.emailService.sendBySlug('password-changed', payload.email, {
      userName: payload.name,
    });
  }
}
```

### Module Dependency Flow

```
AppModule
├── AuthModule (NO dependency on EmailModule)
│   ├── AuthService → EventEmitter2 (emit only)
│   └── JwtStrategy, LocalStrategy
│
└── EmailModule
    ├── EmailModule → EventEmitterModule.forRoot()
    ├── EmailListener → listens to events, calls EmailService
    ├── EmailService → orchestrates template resolution + provider sending
    ├── EmailTemplateService → CRUD + seeding
    └── Providers → SmtpProvider / ResendProvider
```

**Key**: `AuthService` has ZERO knowledge of `EmailService`. Communication is one-way via events.

## Migration Notes

- No existing data migration needed (new collections)
- Default templates seeded on first module initialization
- `forgotPassword` endpoint behavior changes: now actually sends emails (was a no-op)
- Users registering after this change will receive verification emails
- Circular dependency between AuthModule and EmailModule is ELIMINATED

## Rollback Plan

1. **Provider switch**: Change `EMAIL_PROVIDER` env var to use working provider
2. **Module disable**: Comment out `EmailModule` import in `app.module.ts`
3. **Event disable**: Add `EMAIL_ENABLED=false` — listeners can check env before sending
4. **Template fallback**: Embedded defaults ensure emails work even if DB is corrupted
5. **No breaking changes**: Existing endpoints maintain same response shapes
