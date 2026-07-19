---
priority: P2
category: security
---

# Encrypt sensitive data at rest with application-level encryption

**Do**: Use a library like `crypto` or `bcrypt` to encrypt PII, tokens, or secrets before persisting to the database.
**Avoid**: Storing sensitive fields in plaintext, even if the database is encrypted at the disk level.
**Example**:
```typescript
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  encrypt(plaintext: string): string {
    const key = this.config.get('ENCRYPTION_KEY');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(key), iv);
    // ... encryption logic
  }
}
```
