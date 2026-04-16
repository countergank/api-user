# Tasks: feature/docker-images-github

## Phase 1: Environment Templates ✅

- [x] 1.1 Review existing `.env.example` variables
- [x] 1.2 Create `.env.development` with default values for local docker-compose
- [x] 1.3 Create `.env.production.example` as production template
- [x] 1.4 Update `.gitignore` to track .env templates

## Phase 2: Dockerfile Review ✅

- [x] 2.1 Review current Dockerfile for ARG/ENV consistency
  - Multi-stage build exists (base, development, build, production)
  - Production stage strips .env, .git, tests
- [x] 2.2 Ensure VERSION ARG is passed correctly for tagging
- [x] 2.3 Verify multi-stage build is optimized
- [x] 2.4 Test local build: `docker build -t api-user:test .`

## Phase 3: GitHub Actions Workflow ✅

- [x] 3.1 Create `.github/workflows/release-ghcr.yml`
- [x] 3.2 Set workflow permissions for write packages
- [x] 3.3 Add workflow_dispatch for manual triggers
- [ ] 3.4 Test workflow with workflow_dispatch (pending verification)

## Phase 4: Docker Compose ✅

- [x] 4.1 Verify docker-compose.yml uses .env.develop pattern
- [x] 4.2 docker-compose.yml already supports NODE_ENV pattern

## Phase 5: Cleanup ✅

- [x] 5.1 Delete `.github/workflows/release-docker-image.yml.disabled`
- [x] 5.2 Commit all changes
- [x] 5.3 Push to develop

## Phase 6: Verification

- [ ] 6.1 Verify workflow runs on develop push
- [ ] 6.2 Check GHCR packages for new image
- [ ] 6.3 Verify image can be pulled
- [ ] 6.4 Test workflow_dispatch manually

---

## Files Summary

| Action | File | Status |
|--------|------|--------|
| Create | `.github/workflows/release-ghcr.yml` | ✅ Done |
| Create | `.env.development` | ✅ Done |
| Create | `.env.production.example` | ✅ Done |
| Modify | `.gitignore` | ✅ Done |
| Delete | `release-docker-image.yml.disabled` | ✅ Done |

---
Created: 2026-04-15
Updated: 2026-04-16 - Testing workflow trigger
