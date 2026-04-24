# Smart Animal Shelter — Deployment & CI/CD Guide

## 1. GitHub Secrets Required

Add these secrets in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `SSH_HOST` | Your server IP or domain |
| `SSH_USER` | SSH username (e.g., `deploy`) |
| `SSH_PRIVATE_KEY` | Private key for SSH access |
| `ENV_FILE_BASE64` | Production `.env` file encoded as base64 |

To generate `ENV_FILE_BASE64`:
```bash
cat .env | base64 -w 0
```

## 2. CI Pipeline

**Trigger:** Pull Request to `main`/`master`

| Job | Steps |
|-----|-------|
| **Backend** | Restore → Build → `dotnet format` check → Unit tests → Integration tests (Testcontainers) |
| **Frontend** | `npm ci` → ESLint → Prettier check → `tsc --noEmit` → Vitest component tests |
| **Security** | Trivy vulnerability scan for Dockerfiles |

## 3. CD Pipeline

**Trigger:** Push to `master`

| Job | Steps |
|-----|-------|
| **Version** | Generates semantic version from git tags + short SHA |
| **Build Backend** | Build & push `backend` image to GHCR (`latest` + version tags) |
| **Build Frontend** | Build & push `frontend` image to GHCR (`latest` + version tags) |
| **Deploy** | SSH to server → update `.env` → `docker-compose up -d --pull always` → health check |

### Auto-Rollback
If the `/health` endpoint does not return `200 OK` within ~2.5 minutes, the pipeline automatically rolls back to the previous running containers.

## 4. Local Testing

### Backend tests
```bash
cd backend
dotnet test ../backend.Tests/backend.Tests.csproj
```

### Frontend tests
```bash
cd frontend
npm run test
```

## 5. Manual Rollback

On the server:
```bash
./scripts/rollback.sh backup-<short-sha>
```

Or without arguments to use the `backup` tag:
```bash
./scripts/rollback.sh
```

## 6. Database Migrations

EF Core migrations are applied **automatically** on backend startup (`Program.cs`). No manual action required during deployment.

## 7. Monitoring

- Backend health: `GET http://your-server:5000/health`
- Frontend health: `GET http://your-server/health` (nginx)
- Docker health checks are enabled for all services.

