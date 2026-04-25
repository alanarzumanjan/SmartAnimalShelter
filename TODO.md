# TODO: CI/CD Improvements

## Completed ✅

- [x] Update `.github/workflows/ci.yml` — replace hardcoded connection strings with secrets
- [x] Update `tests/IntegrationTests.cs` — add auth flow tests (register, login, JWT)
- [x] Update `tests/UnitTests.cs` — add JWT tests with real key from env
- [x] Add email service tests in `tests/IntegrationTests.cs`
- [x] Verify tests compile and run
- [x] Add NuGet package caching in CI
- [x] Build and push Docker images to GHCR in CD
- [x] Verify pulled images work correctly

## Secrets Required for CI Tests

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

## CD Flow (No Server Deploy)

```
Push to main/master/dev2
    ↓
Build Backend Docker → Push GHCR (tags: latest, version, sha)
Build Frontend Docker → Push GHCR (tags: latest, version, sha)
    ↓
Verify: Pull images from GHCR and test they run
```

Deploy to production is done manually via `docker compose pull && up -d` on your local machine where Cloudflare tunnel is configured.

## Notes

- Images are stored at `ghcr.io/{username}/SmartAnimalShelter/backend` and `/frontend`
- Cloudflare tunnel exposes `alantech.id.lv` when you run docker locally
- `GITHUB_TOKEN` is auto-provided by GitHub Actions for GHCR push

