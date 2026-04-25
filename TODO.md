# CI/CD Implementation TODO

## Phase 1: Test Infrastructure
- [x] Create `tests/` project (xUnit + Testcontainers)
- [x] Add `UnitTest1.cs` placeholder with example tests (PasswordHashing, JwtService)
- [x] Add `IntegrationTest1.cs` placeholder with Testcontainers (PostgreSQL)
- [x] Update `backend.slnx` to include test project
- [x] Add Vitest + Testing Library to frontend
- [x] Update `frontend/package.json` scripts and dependencies
- [x] Create example component tests

## Phase 2: CI Pipeline (`.github/workflows/ci.yml`)
- [x] Backend job: restore, build, format check, unit tests, integration tests
- [x] Frontend job: lint, prettier check, type check, component tests
- [x] Security job: Trivy scan Dockerfiles

## Phase 3: CD Pipeline (`.github/workflows/cd.yml`)
- [x] Build & push backend to GHCR
- [x] Build & push frontend to GHCR
- [x] SSH deploy with docker-compose
- [x] Health check with retry
- [x] Auto-rollback on failure

## Phase 4: Configuration Files
- [x] `.github/dependabot.yml`
- [x] `.env.example`
- [x] `backend/.env.example`
- [x] `docker-compose.prod.yml`
- [x] `scripts/rollback.sh`

## Phase 5: Documentation
- [x] `DEPLOYMENT.md`

