# Specs: docker-images-github

## Capability: docker-ghcr-publish

### Description
Build and push Docker images to GitHub Container Registry on branch merges.

### Requirement
On merge to `develop` or `main`, build and push Docker image to GHCR.

### Scenarios

#### Scenario 1: Develop Branch Merge
**Given** code is merged to `develop` branch  
**When** workflow runs  
**Then** image is built and pushed with tags:
- `ghcr.io/countergank/api-user:develop-{version}`
- `ghcr.io/countergank/api-user:sha-{sha}`

#### Scenario 2: Main Branch Merge
**Given** code is merged to `main` branch  
**When** workflow runs  
**Then** image is built and pushed with tags:
- `ghcr.io/countergank/api-user:latest`
- `ghcr.io/countergank/api-user:v{version}`
- `ghcr.io/countergank/api-user:sha-{sha}`

#### Scenario 3: Manual Trigger
**Given** user triggers workflow_dispatch  
**When** workflow runs  
**Then** image is built and pushed with standard tags

### Acceptance Criteria
- [x] Image builds successfully from Dockerfile
- [x] Image pushed to `ghcr.io/countergank/api-user` with correct tags
- [x] No external secrets required (uses GITHUB_TOKEN)
- [x] Workflow runs only on develop/main merges
- [x] Version extracted from package.json

---

## Capability: docker-env-templates

### Description
Environment variable templates for development and production.

### Requirement
Provide clear environment templates for different deployment scenarios.

### Scenarios

#### Scenario 1: Local Development
**Given** developer clones repo  
**When** developer copies `.env.development` to `.env`  
**And** runs `docker compose up`  
**Then** application starts with correct development configuration

#### Scenario 2: Production Deployment
**Given** ops team deploys to production  
**When** they copy `.env.production.example` to `.env`  
**And** fill in real values  
**Then** application runs with production configuration

### Acceptance Criteria
- [x] `.env.development` works with docker-compose.yml
- [x] `.env.production.example` contains all required variables as template
- [x] `.env.example` remains as reference documentation
- [x] No real secrets in any .env file

---

## Capability: docker-local-dev

### Description
Local development with docker-compose.

### Requirement
Developers can run the application locally using docker-compose.

### Scenarios

#### Scenario 1: First Run
**Given** developer has docker and docker-compose installed  
**When** developer runs `docker compose up`  
**Then** API is accessible on localhost:3000  
**And** MongoDB is accessible on localhost:27017

#### Scenario 2: Code Changes
**Given** developer modifies code while containers are running  
**When** code is changed  
**Then** application automatically reloads (volumes mounted)

### Acceptance Criteria
- [x] `docker compose up` starts API + MongoDB successfully
- [x] API accessible on localhost:3000
- [x] MongoDB accessible on localhost:27017
- [x] .env.development values used correctly

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Build time | < 5 minutes |
| Image size | < 500MB |
| Security | No secrets in image |
| Reproducibility | SHA tag for every build |

---

## Environment Variables Reference

All from `.env.example`:

| Variable | Description | Required For |
|----------|-------------|--------------|
| NODE_ENV | Environment mode | Runtime |
| VERSION | App version | Build (auto) |
| HOST | Server host | Runtime |
| PORT | Server port | Runtime |
| DATABASE_USER | MongoDB user | Runtime |
| DATABASE_PASSWORD | MongoDB password | Runtime |
| DATABASE_HOST | MongoDB host | Runtime |
| DATABASE_PORT | MongoDB port | Runtime |
| DATABASE_NAME | Database name | Runtime |
| ENCRYPTION_PASSWORD | Encryption key | Runtime |

---
Created: 2026-04-15
