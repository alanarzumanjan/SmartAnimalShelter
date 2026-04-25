# CI/CD Improvements

## Completed ✅

### CI Improvements
- [x] Remove `continue-on-error` from formatting checks (now mandatory)
- [x] Fix Trivy — fail on HIGH/CRITICAL vulnerabilities (`exit-code: 1`, `severity: HIGH,CRITICAL`)
- [x] Add Docker build test job (builds images without push to verify they compile)
- [x] Add path filters — skip jobs if files didn't change (backend/frontend/docker)
- [x] Add concurrency control (cancels stale runs on new push)
- [x] Add timeout limits to all jobs (5-30 min)
- [x] Replace hardcoded connection strings with secrets
- [x] Add NuGet package caching
- [x] Upload test results as artifacts

### CD Improvements
- [x] Trigger via `workflow_run` after successful CI (not just on push)
- [x] Multi-arch builds (`linux/amd64`, `linux/arm64`)
- [x] SBOM generation (SPDX JSON) for both images
- [x] Build provenance attestations (signed by GitHub)
- [x] Smart tag strategy:
  - `latest` for main/master branch
  - `dev` for dev2 branch
  - Semantic version + short SHA for all
- [x] Cleanup old untagged images (keep last 10)
- [x] Build and push Docker images to GHCR

### Tests
- [x] Update `tests/IntegrationTests.cs` — add auth flow tests (register, login, JWT)
- [x] Update `tests/UnitTests.cs` — add JWT tests with real key from env
- [x] Add email service tests in `tests/IntegrationTests.cs`
- [x] Verify tests compile and run (18 tests passing)

## Secrets Required

Add these secrets in GitHub Settings → Secrets and variables → Actions:

| Secret | Description | Example |
|---|---|---|
| `POSTGRES_CONNECTION_STRING` | Test DB connection | `Host=localhost;Port=5432;Database=shelter_test;Username=test;Password=test;` |
| `REDIS_CONNECTION_STRING` | Test Redis | `localhost:6379` |
| `MONGODB_CONNECTION_STRING` | Test MongoDB | `mongodb://localhost:27017` |
| `JWT_KEY` | Secret key for JWT (min 32 chars) | `your-32-char-secret-key-here!!!` |
| `JWT_ISSUER` | JWT issuer | `SmartAnimalShelter` |
| `JWT_AUDIENCE` | JWT audience | `SmartAnimalShelter` |
| `EMAIL_ADDRESS` | Test email | `test@example.com` |
| `EMAIL_PASSWORD` | Test email password | `testpass` |
| `EMAIL_NAME` | Email display name | `Test User` |

## CI/CD Architecture

```
Pull Request / Push
    ↓
┌─────────────────────────────────────────────┐
│  changes job — detects what files changed   │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  backend job (if backend/tests changed)     │
│  • Restore → Build → Format check           │
│  • Unit tests → Integration tests           │
│  • Upload test results                      │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  frontend job (if frontend changed)         │
│  • Install → Lint → Format check            │
│  • Type check → Component tests             │
│  • Upload test results                      │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  docker-build-test (if docker/src changed)  │
│  • Build backend image (no push)            │
│  • Build frontend image (no push)           │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  security job (after backend + frontend)    │
│  • Trivy scan backend (HIGH/CRITICAL)       │
│  • Trivy scan frontend (HIGH/CRITICAL)      │
│  • Upload SARIF results                     │
└─────────────────────────────────────────────┘
    ↓ (only on main/master/dev2 push + CI success)
┌─────────────────────────────────────────────┐
│  CD triggered via workflow_run              │
│  • Generate version + branch tag            │
│  • Build & push multi-arch images           │
│  • Generate SBOM + attestations             │
│  • Cleanup old untagged images              │
└─────────────────────────────────────────────┘
```

## Tag Strategy

| Branch | Docker Tags | Example |
|---|---|---|
| `main` / `master` | `latest`, `v1.2.3-abc1234`, `abc1234` | `ghcr.io/alanarzumanjan/smartanimalshelter/backend:latest` |
| `dev2` | `dev`, `v1.2.3-abc1234`, `abc1234` | `ghcr.io/alanarzumanjan/smartanimalshelter/backend:dev` |

## Manual Deploy (your local machine)

Production:
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Notes

- Images stored at `ghcr.io/alanarzumanjan/smartanimalshelter/{backend,frontend}`
- Multi-arch supports x86_64 servers and ARM64 (Apple Silicon, Raspberry Pi, Oracle Cloud)
- Cloudflare tunnel exposes `alantech.id.lv` when you run docker locally
- `GITHUB_TOKEN` is auto-provided by GitHub Actions for GHCR push and attestations

