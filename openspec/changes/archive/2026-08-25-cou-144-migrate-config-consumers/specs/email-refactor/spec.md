# Spec: Email Module Refactor — Config injection

## Problem
`SmtpProvider` y `ResendProvider` leen `process.env` directamente y se instancian con `new ProviderClass()` fuera del DI container.

## Solution
Refactor la factoría de providers para que reciba config de `ParameterService` y lo pase a los providers por constructor.

### EmailProviderFactory
- Cambiar de `useFactory: () => createEmailProvider()` a provider async con inyección de `ParameterService`
- Resolver la config necesaria (host, port, secure, from, provider type) al iniciar el módulo
- Pasar la config como `EmailProviderConfig` tipado a los providers

### SmtpProvider
- Constructor recibe `EmailProviderConfig` en vez de leer env vars
- Mantiene misma interfaz `sendEmail(options): Promise<SendResult>`

### ResendProvider
- Constructor recibe `EmailProviderConfig` (solo `fromEmail` + mantiene `RESEND_API_KEY` de env)
- Mantiene misma interfaz

### EmailProviderConfig Interface
```typescript
interface EmailProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  fromEmail: string;
}
```

### Files to modify
- `src/email/email.provider.factory.ts` — refactor to async DI
- `src/email/providers/smtp.provider.ts` — receive config via constructor
- `src/email/providers/resend.provider.ts` — receive config via constructor
- `src/email/email.module.ts` — update provider registration
- `src/email/__tests__/email.service.spec.ts` — update mocks
- `src/email/__tests__/email.listener.spec.ts` — update mocks
