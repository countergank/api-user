# Docker Production Hardening Specification

## Purpose

Ensure the production Docker image contains only runtime dependencies, excluding all `devDependencies` to reduce image size and attack surface.

## Requirements

### Requirement: DOC-01 — No devDependencies in Production Image

The production Docker stage MUST NOT include any `devDependencies` in its `node_modules`.

Only packages required at runtime (listed under `dependencies` in `package.json`) SHALL be present.

#### Scenario: Production image node_modules contains only runtime deps

- GIVEN the production Docker stage is built
- WHEN inspecting `node_modules` in the final image
- THEN no package listed in `devDependencies` from `package.json` is present

#### Scenario: Runtime dependencies are available

- GIVEN the production Docker stage is built
- WHEN the application starts
- THEN all imports from `dependencies` resolve correctly

---

### Requirement: DOC-02 — Production-Only Install via npm ci

The production stage MUST install dependencies using `npm ci --omit=dev` (or equivalent production-only install) with its own fresh `package.json` + `package-lock.json` copy.

The production stage MUST NOT copy `node_modules` from the build or development stages.

#### Scenario: Fresh install in production stage

- GIVEN the Dockerfile production stage
- WHEN the image is built
- THEN `npm ci --omit=dev` is executed with `package.json` and `package-lock.json` copied into the production stage

#### Scenario: No node_modules inheritance from build stage

- GIVEN the Dockerfile
- WHEN the production stage is constructed
- THEN there is no `COPY --from=build ... node_modules` instruction

---

### Requirement: DOC-03 — Reduced Production Image Size

The final production image size SHOULD be smaller than the pre-hardening image.

#### Scenario: Image size comparison

- GIVEN a pre-hardening production image and a post-hardening production image
- WHEN both are built and their sizes compared
- THEN the post-hardening image is smaller (fewer MB)

---

### Requirement: DOC-04 — Build Resilience Without Lockfile

The Dockerfile MUST handle the case where `package-lock.json` is missing gracefully. If `npm ci` cannot run (no lockfile), the build SHOULD fail with a clear error rather than silently falling back to `npm install`.

#### Scenario: Lockfile present (normal build)

- GIVEN `package-lock.json` exists in the project root
- WHEN `docker build` runs
- THEN `npm ci --omit=dev` succeeds in the production stage

#### Scenario: Lockfile missing

- GIVEN `package-lock.json` does NOT exist
- WHEN `docker build` runs
- THEN the build fails with a clear error message indicating the missing lockfile
