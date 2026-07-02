---
priority: P1
category: security
---

# Validate file uploads with size, type, and malware checks

**Do**: Use `FileInterceptor` with explicit file size limits, MIME type validation, and filename sanitization before storage.
**Avoid**: Accepting arbitrary file uploads without validation, which enables storage exhaustion or malicious file execution.
**Example**:
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  },
}))
async upload(@UploadedFile() file: Express.Multer.File) { ... }
```
