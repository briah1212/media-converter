# CI/CD Setup Guide

This document explains the GitHub Actions workflows configured for the media-converter project and how to set them up.

## 📋 Overview

The project uses three main GitHub Actions workflows:

1. **Frontend CI** - Tests and builds the Next.js frontend
2. **Backend CI** - Tests the FastAPI backend with pytest
3. **Docker Build** - Builds Docker images for both services

## 🔄 Workflows

### 1. Frontend CI (`frontend-ci.yml`)

**Triggers:**
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests to `main` or `develop`
- Only when frontend files change

**Jobs:**
- ✅ Node.js 20 environment setup
- ✅ Dependency caching (npm)
- ✅ Install dependencies (`npm ci`)
- ✅ TypeScript type checking (`tsc --noEmit`)
- ✅ Linting (`npm run lint`)
- ✅ Production build (`npm run build`)
- ✅ Run tests (if configured)
- ✅ Upload build artifacts

**Cache Strategy:**
- Caches `node_modules` based on `package-lock.json` hash
- Significantly speeds up subsequent runs

### 2. Backend CI (`backend-ci.yml`)

**Triggers:**
- Push to `main`, `develop`, or `feature/**` branches
- Pull requests to `main` or `develop`
- Only when backend files change

**Jobs:**
- ✅ Python 3.11 environment setup
- ✅ Install system dependencies (ffmpeg, poppler-utils)
- ✅ Dependency caching (pip)
- ✅ Install Python packages
- ✅ Code quality checks:
  - flake8 (syntax errors and style)
  - black (formatting)
  - mypy (type checking)
- ✅ Run pytest with coverage
- ✅ Upload coverage to Codecov (optional)

**System Dependencies:**
The workflow installs required system packages for media conversion:
- `ffmpeg` - Audio/video processing
- `poppler-utils` - PDF processing

### 3. Docker Build (`docker-build.yml`)

**Triggers:**
- Push to `main` branch
- Git tags starting with `v*` (e.g., v1.0.0)
- Pull requests to `main` (build only, no push)

**Jobs:**
- ✅ Build frontend Docker image
- ✅ Build backend Docker image
- ✅ Tag images automatically:
  - Branch name (e.g., `main`, `develop`)
  - PR number (e.g., `pr-123`)
  - Semantic version (e.g., `v1.0.0`, `1.0`, `1`)
  - Git SHA (e.g., `main-abc1234`)
  - `latest` for default branch
- ✅ Docker layer caching
- ⚠️ Image push is **disabled by default** (see setup below)

**Container Registry Options:**
- GitHub Container Registry (ghcr.io) - Default, configured
- Docker Hub - Commented out, ready to enable

## 🚀 Setup Instructions

### Step 1: Enable GitHub Actions

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Under "Actions permissions", select:
   - ✅ Allow all actions and reusable workflows
4. Under "Workflow permissions", select:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### Step 2: Configure Secrets (Optional)

#### For Docker Hub (if not using GitHub Container Registry):

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:
   - `DOCKERHUB_USERNAME` - Your Docker Hub username
   - `DOCKERHUB_TOKEN` - Docker Hub access token (create at https://hub.docker.com/settings/security)

#### For Codecov (optional coverage reports):

1. Sign up at https://codecov.io/
2. Connect your GitHub repository
3. Get the upload token from Codecov dashboard
4. Add secret:
   - `CODECOV_TOKEN` - Your Codecov upload token

### Step 3: Enable Docker Image Push (Optional)

The Docker workflow is configured to **build only** by default. To enable pushing:

1. Choose your container registry:
   - **GitHub Container Registry** (recommended, free)
   - **Docker Hub** (requires account)

2. Edit `.github/workflows/docker-build.yml`:

   **For GitHub Container Registry:**
   - Already configured! Just uncomment the push sections:
   ```yaml
   # Change this line (around line 63 and 123):
   push: false
   # To:
   push: ${{ github.event_name != 'pull_request' }}
   ```

   **For Docker Hub:**
   - Uncomment the Docker Hub login sections
   - Comment out the GitHub Container Registry login sections
   - Update the `REGISTRY` env variable to `docker.io`
   - Add Docker Hub secrets (see Step 2)

### Step 4: Update Repository Settings

1. Enable **Branch Protection** for `main`:
   - Settings → Branches → Add rule
   - Branch name pattern: `main`
   - ✅ Require status checks before merging
   - Select required checks:
     - `frontend-tests`
     - `backend-tests`
     - `build-frontend` (if pushing images)
     - `build-backend` (if pushing images)

## 📊 Status Badges

Add these badges to your main README.md:

```markdown
[![Frontend CI](https://github.com/YOUR_USERNAME/media-converter/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/media-converter/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/YOUR_USERNAME/media-converter/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/media-converter/actions/workflows/backend-ci.yml)
[![Docker Build](https://github.com/YOUR_USERNAME/media-converter/actions/workflows/docker-build.yml/badge.svg)](https://github.com/YOUR_USERNAME/media-converter/actions/workflows/docker-build.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/media-converter/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/media-converter)
```

Replace `YOUR_USERNAME` with your actual GitHub username or organization name.

## 🔧 Workflow Customization

### Adding More Node.js Versions

Edit `frontend-ci.yml`:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

### Adding More Python Versions

Edit `backend-ci.yml`:
```yaml
strategy:
  matrix:
    python-version: ['3.10', '3.11', '3.12']
```

### Strict Linting

Remove `continue-on-error: true` from lint steps to fail builds on linting errors.

### Integration Tests

Add environment services to workflows:
```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - 6379:6379
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
    ports:
      - 5432:5432
```

## 🎯 Usage

### Automatic Triggers

Workflows run automatically on:
- Every push to tracked branches
- Every pull request
- Git tag pushes (Docker workflow)

### Manual Triggers

Run workflows manually from GitHub UI:
1. Go to **Actions** tab
2. Select the workflow
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

### Local Testing

Test your changes locally before pushing:

**Frontend:**
```bash
cd frontend
npm ci
npx tsc --noEmit
npm run lint
npm run build
npm test
```

**Backend:**
```bash
cd backend
pip install -r requirements.txt
pip install flake8 black mypy pytest-cov
flake8 src
black --check src
mypy src --ignore-missing-imports
pytest tests/ -v --cov=src
```

**Docker:**
```bash
# Build frontend
docker build -f Dockerfile.frontend -t media-converter-frontend .

# Build backend
docker build -f Dockerfile.backend -t media-converter-backend .

# Test containers
docker-compose up
```

## 🚢 Deployment Automation (Future)

The current workflows focus on **testing and building**. To add deployment:

### Option 1: Deploy to VPS (DigitalOcean, Linode, etc.)

Add deployment step to `docker-build.yml`:
```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.DEPLOY_HOST }}
    username: ${{ secrets.DEPLOY_USER }}
    key: ${{ secrets.DEPLOY_SSH_KEY }}
    script: |
      cd /opt/media-converter
      git pull
      docker-compose pull
      docker-compose up -d
```

Required secrets:
- `DEPLOY_HOST` - Server IP address
- `DEPLOY_USER` - SSH username
- `DEPLOY_SSH_KEY` - SSH private key

### Option 2: Deploy to Cloud Providers

**AWS ECS:**
```yaml
- name: Deploy to Amazon ECS
  uses: aws-actions/amazon-ecs-deploy-task-definition@v1
  with:
    task-definition: task-definition.json
    service: media-converter-service
    cluster: production-cluster
```

**Google Cloud Run:**
```yaml
- name: Deploy to Cloud Run
  uses: google-github-actions/deploy-cloudrun@v2
  with:
    service: media-converter
    image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

**Azure Container Instances:**
```yaml
- name: Deploy to Azure
  uses: azure/container-instances-deploy@v1
  with:
    resource-group: media-converter-rg
    name: media-converter-instance
    image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### Option 3: Deploy to Kubernetes

```yaml
- name: Deploy to Kubernetes
  run: |
    kubectl set image deployment/frontend frontend=${{ env.FRONTEND_IMAGE }}:${{ github.sha }}
    kubectl set image deployment/backend backend=${{ env.BACKEND_IMAGE }}:${{ github.sha }}
    kubectl rollout status deployment/frontend
    kubectl rollout status deployment/backend
```

## 💡 Best Practices

1. **Branch Strategy:**
   - `main` - Production-ready code
   - `develop` - Integration branch
   - `feature/*` - Feature branches
   - Use PRs for all changes to `main`

2. **Commit Messages:**
   - Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
   - Triggers automated changelog generation

3. **Testing:**
   - Write tests before pushing
   - Aim for >80% code coverage
   - Mock external services

4. **Security:**
   - Never commit secrets to repository
   - Use GitHub Secrets for sensitive data
   - Rotate access tokens regularly
   - Review dependency updates (Dependabot)

5. **Performance:**
   - Use caching aggressively
   - Run jobs in parallel when possible
   - Only trigger workflows on relevant file changes

## 📈 Monitoring

### GitHub Actions Dashboard

Monitor workflow runs:
1. Go to **Actions** tab
2. View run history, logs, and artifacts
3. Re-run failed jobs if needed

### Notifications

Configure notifications:
1. Settings → Notifications
2. Enable workflow run notifications
3. Choose email or mobile push

### Metrics

Track CI/CD metrics:
- Build success rate
- Average build time
- Test coverage trends
- Deployment frequency

## 🐛 Troubleshooting

### Frontend Build Fails

**Issue:** TypeScript errors
```bash
Solution: Run `npx tsc --noEmit` locally and fix type errors
```

**Issue:** Out of memory during build
```yaml
Solution: Add to workflow:
env:
  NODE_OPTIONS: --max_old_space_size=4096
```

### Backend Tests Fail

**Issue:** Import errors
```yaml
Solution: Ensure PYTHONPATH is set correctly:
env:
  PYTHONPATH: ${{ github.workspace }}/backend
```

**Issue:** Missing system dependencies
```yaml
Solution: Add to workflow:
- run: sudo apt-get install -y <package-name>
```

### Docker Build Fails

**Issue:** Context size too large
```
Solution: Add more patterns to .dockerignore
```

**Issue:** Authentication failed
```
Solution: Check registry credentials and permissions
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Node.js Action](https://github.com/actions/setup-node)
- [Python Action](https://github.com/actions/setup-python)
- [Codecov Action](https://github.com/codecov/codecov-action)

## 🤝 Contributing

When contributing:
1. Create a feature branch
2. Ensure all CI checks pass
3. Add tests for new features
4. Update documentation
5. Submit a pull request

---

**Status:** Workflows configured for test-only (no auto-deploy)
**Last Updated:** 2026-07-07
