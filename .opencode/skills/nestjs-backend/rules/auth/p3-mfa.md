---
priority: P3
category: auth
---

# Add MFA for high-security operations

**Do**: Implement TOTP-based multi-factor authentication with `otplib` or similar, requiring a second verification step after password validation for sensitive actions.
**Avoid**: Relying solely on password-based authentication for admin panels, financial transactions, or data export endpoints.
**Example**:
```typescript
@Post('verify-mfa')
async verifyMfa(@Body() dto: MfaVerifyDto) {
  const valid = authenticator.check(dto.token, user.mfaSecret);
  if (!valid) throw new UnauthorizedException('Invalid MFA code');
  return this.authService.issueToken(user);
}
```
