# Proposal: feature/docker-images-github

## Intent

Enable automated Docker image building and publishing to GitHub Container Registry (GHCR) on code merges to main/develop branches. Replace the broken Docker Hub workflow with a zero-credential GHCR approach using GitHub's native OIDC authentication.

## Scope

### In Scope
- Enable Docker image publishing to GHCR (`ghcr.io/countergank/api-user`)
- Use `GITHUB_TOKEN` for authentication (no external secrets)
- Proper version tagging: `latest`, `develop-{version}`, `sha-{sha}`
- Clean up existing disabled workflow file
- Support builds on merge to `develop` and `main` branches
- Environment templates for development and production

### Out of Scope
- Multi-platform builds (linux/arm64, etc.)
- Image signing
- Helm charts or Kubernetes manifests
- Pull requests previews
- Docker Hub publishing

## Capabilities

### New Capabilities
- `docker-ghcr-publish`: Automated Docker image publishing to GHCR on branch merges
- `docker-multi-env`: Different image tags for different environments (develop vs main)
- `docker-env-templates`: Environment templates for development and production

## Approach

### Strategy
Create a modern GHCR workflow and environment templates:

1. **Create** `.github/workflows/release-ghcr.yml` based on best practices
2. **Use OIDC authentication** via `docker/login-action@v3` (no secrets needed)
3. **Configure tagging**:
   - `main` branch → `ghcr.io/countergank/api-user:latest`, `v{version}`, `sha-{sha}`
   - `develop` branch → `ghcr.io/countergank/api-user:develop-{version}`, `sha-{sha}`
4. **Create environment templates**:
   - `.env.development` for local docker-compose
   - `.env.production.example` as production template
5. **Delete** broken Docker Hub workflow

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/release-ghcr.yml` | Create | New GHCR workflow |
| `.github/workflows/release-docker-image.yml.disabled` | Delete | Remove broken Docker Hub workflow |
| `.env.development` | Create | Development environment template |
| `.env.production.example` | Create | Production environment template |
| `Dockerfile` | No change | Already has multi-stage build |
| `docker-compose.yml` | No change | Already supports local dev |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| GHCR requires GitHub login to pull images | Medium | High | Document authentication; public visibility |
| Image size too large | Low | Medium | Review multi-stage build |
| Version extraction fails | Low | Low | Fallback to SHA-based tagging |

## Rollback Plan

1. Disable the new workflow via workflow_dispatch or branch protection
2. Delete `.github/workflows/release-ghcr.yml`
3. Previous images remain in GHCR; no data loss

## Dependencies

- `docker/login-action@v3` (OIDC/GHCR support)
- `docker/build-push-action@v5`
- `docker/setup-buildx-action@v3`
- GitHub OIDC provider (enabled by default on GitHub.com)
- Package.json version field

## Success Criteria

- [ ] GHCR workflow runs successfully on merge to develop
- [ ] GHCR workflow runs successfully on merge to main
- [ ] Images are tagged correctly (latest, develop-{version}, sha-{sha})
- [ ] .env.development works with docker-compose
- [ ] .env.production.example is complete template
- [ ] Old Docker Hub workflow file is removed
- [ ] Manual workflow_dispatch trigger works
- [ ] No external secrets required (uses GITHUB_TOKEN)

---
Created: 2026-04-15
