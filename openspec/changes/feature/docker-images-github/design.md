# Design: feature/docker-images-github

## Architecture Decisions

### AD-01: Registry Selection
**Decision**: Use GitHub Container Registry (GHCR) with OIDC authentication

**Rationale**: 
- No credential management — uses `GITHUB_TOKEN` automatically
- Native GitHub integration
- Generous free tier (500MB storage, 1TB bandwidth)
- Scoped permissions via OIDC

**Alternatives Considered**:
- Docker Hub: Requires external credentials (currently broken)
- Multi-registry: Too complex for initial implementation

---

### AD-02: Image Tagging Strategy
**Decision**: Branch-based tagging with semantic versioning

| Branch | Tags |
|--------|------|
| `main` | `latest`, `v{version}`, `sha-{sha}` |
| `develop` | `develop-{version}`, `sha-{sha}` |

**Rationale**:
- `latest` always points to production-ready main
- `v{version}` follows semver convention
- `develop-{version}` clearly identifies development builds
- `sha-{sha}` provides reproducibility for rollbacks

---

### AD-03: Environment File Structure
**Decision**: Separate templates for each environment

**Files**:
- `.env.example` — Reference with all variables (existing)
- `.env.development` — Development values for docker-compose
- `.env.production.example` — Production template with placeholders

**Rationale**:
- Clear separation of concerns
- No secrets accidentally committed
- docker-compose works out-of-the-box for development

---

## File Structure

```
├── .env.example                    # Reference (existing)
├── .env.development                # Development template (new)
├── .env.production.example         # Production template (new)
├── Dockerfile                      # Multi-stage build (existing)
├── docker-compose.yml              # Local dev (existing)
└── .github/
    └── workflows/
        ├── release-ghcr.yml        # GHCR workflow (new)
        └── release-docker-image.yml.disabled  # DELETED
```

---

## Workflow Design

### release-ghcr.yml

```yaml
Trigger: push to main, develop; workflow_dispatch
Permissions: packages: write
```

**Steps**:
1. Checkout code
2. Setup QEMU (for multi-platform future)
3. Setup Docker Buildx
4. Login to GHCR via OIDC
5. Extract metadata and version from package.json
6. Build and push with tags
7. Generate summary

**Tags Applied**:
```
ghcr.io/countergank/api-user:latest
ghcr.io/countergank/api-user:v{version}
ghcr.io/countergank/api-user:develop-{version}
ghcr.io/countergank/api-user:sha-{sha}
```

---

## Security Considerations

1. **No secrets in image**: Multi-stage build strips .env, .git, tests
2. **OIDC authentication**: No long-lived tokens
3. **Read-only package permissions**: Workflow can only write, not read secrets
4. **No external dependencies in workflow**: Uses official Docker actions

---

## Testing Strategy

1. **YAML validation**: GitHub validates workflow syntax
2. **workflow_dispatch**: Manual trigger for testing without merge
3. **Image verification**: Check GHCR packages page after run
4. **Pull test**: Verify image can be pulled and run

---

## Open Questions

- [x] Should `main` also tag as `v{version}`? **Yes, included**
- [ ] Should we enable public visibility on GHCR packages? **Recommended for easier pulls**
- [x] Should docker-compose use .env.development? **Yes, by default**

---
Created: 2026-04-15
