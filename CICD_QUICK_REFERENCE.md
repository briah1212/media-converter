# CI/CD Quick Reference Card

## 🚀 Activation Checklist

```bash
# 1. Verify files exist
ls -la .github/workflows/

# 2. Review workflow files
cat .github/workflows/frontend-ci.yml
cat .github/workflows/backend-ci.yml
cat .github/workflows/docker-build.yml

# 3. Push to GitHub to activate (when ready)
git add .github/
git commit -m "ci: Add GitHub Actions workflows"
git push origin main

# 4. View results
# Go to: https://github.com/YOUR_USERNAME/media-converter/actions
```

## 📋 Workflow Summary

| Workflow | Trigger | Runtime | Purpose |
|----------|---------|---------|---------|
| **Frontend CI** | Push/PR to main, develop, feature/* | ~3 min | TypeScript, lint, build |
| **Backend CI** | Push/PR to main, develop, feature/* | ~4 min | pytest, lint, coverage |
| **Docker Build** | Push to main, tags v* | ~8 min | Build container images |

## 🎯 What Each Workflow Does

### Frontend CI (`frontend-ci.yml`)
```yaml
✓ Node.js 20 setup
✓ npm install (with cache)
✓ TypeScript type check
✓ ESLint
✓ Next.js production build
✓ Upload artifacts
```

### Backend CI (`backend-ci.yml`)
```yaml
✓ Python 3.11 setup
✓ Install ffmpeg, poppler-utils
✓ pip install (with cache)
✓ flake8 linting
✓ black formatting check
✓ mypy type check
✓ pytest with coverage
✓ Codecov upload (optional)
```

### Docker Build (`docker-build.yml`)
```yaml
✓ Build frontend image
✓ Build backend image
✓ Auto-tag (branch, sha, semver)
✓ GitHub Container Registry ready
⚠ Push disabled (test mode)
```

## 🔧 Common Configurations

### Enable Docker Image Push
Edit `.github/workflows/docker-build.yml`:
```yaml
# Line 63 and 123, change:
push: false
# To:
push: ${{ github.event_name != 'pull_request' }}
```

### Add More Test Environments
```yaml
# Frontend: Test multiple Node versions
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]

# Backend: Test multiple Python versions
strategy:
  matrix:
    python-version: ['3.10', '3.11', '3.12']
```

### Run Workflows Manually
Add to any workflow:
```yaml
on:
  push:
    branches: [ main ]
  workflow_dispatch:  # Enables "Run workflow" button
```

## 🔐 Required Secrets (Optional Features)

### Docker Hub (Alternative to GitHub Container Registry)
```
Settings → Secrets → Actions → New secret

DOCKERHUB_USERNAME = your_dockerhub_username
DOCKERHUB_TOKEN = dckr_pat_xxxxxxxxxxxxx
```

### Codecov (Code Coverage Reports)
```
CODECOV_TOKEN = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Deployment (Future)
```
DEPLOY_HOST = your.server.ip
DEPLOY_USER = deployment_user
DEPLOY_SSH_KEY = -----BEGIN OPENSSH PRIVATE KEY-----
```

## 📊 Status Badges

Add to main README.md:
```markdown
![Frontend CI](https://github.com/USERNAME/media-converter/actions/workflows/frontend-ci.yml/badge.svg)
![Backend CI](https://github.com/USERNAME/media-converter/actions/workflows/backend-ci.yml/badge.svg)
![Docker Build](https://github.com/USERNAME/media-converter/actions/workflows/docker-build.yml/badge.svg)
```

## 🧪 Local Testing Commands

### Before Pushing Code
```bash
# Frontend checks
cd frontend
npm ci
npx tsc --noEmit          # Type check
npm run lint              # Lint check
npm run build             # Build check

# Backend checks
cd backend
pip install -r requirements.txt
pip install flake8 black mypy pytest-cov
flake8 src                # Lint check
black --check src         # Format check
mypy src --ignore-missing-imports  # Type check
pytest tests/ -v          # Run tests

# Docker builds
docker build -f Dockerfile.frontend -t test-fe .
docker build -f Dockerfile.backend -t test-be .
```

## 🐛 Troubleshooting

### Workflow Not Running?
- Check trigger conditions (branch names, file paths)
- Verify YAML syntax: `yamllint .github/workflows/*.yml`
- Ensure workflows are in `.github/workflows/` directory

### Build Failing?
- Review logs in Actions tab
- Test locally first
- Check for environment differences
- Verify all dependencies are in package files

### Docker Build Issues?
- Check .dockerignore patterns
- Verify Dockerfile paths
- Test build locally: `docker build -f Dockerfile.frontend .`

### Permission Errors?
- Go to: Settings → Actions → General
- Set: "Read and write permissions"
- Enable: "Allow GitHub Actions to create and approve pull requests"

## 📈 Monitoring

### View Workflow Status
```
Repository → Actions tab
├── All workflows
├── Filter by workflow, branch, or status
├── Click run for detailed logs
└── Re-run failed jobs if needed
```

### Check Build Times
- Actions → Workflows → Select workflow
- View run history and duration trends
- Optimize slow steps with caching

### Coverage Reports
- Backend tests generate coverage reports
- View in workflow logs or Codecov dashboard
- Aim for >80% coverage

## 💡 Pro Tips

1. **Caching Strategy**
   - Frontend: node_modules cached by package-lock.json hash
   - Backend: pip packages cached by requirements.txt hash
   - Docker: Layer caching with GitHub Actions cache

2. **Parallel Execution**
   - All three workflows can run simultaneously
   - Matrix builds run in parallel
   - Saves time on multi-version testing

3. **Path Filters**
   - Frontend workflow only runs on frontend changes
   - Backend workflow only runs on backend changes
   - Saves CI minutes on unrelated changes

4. **Continue on Error**
   - Linting steps don't fail builds (configurable)
   - Coverage upload failures don't fail builds
   - Remove `continue-on-error: true` for strict mode

5. **Artifact Retention**
   - Build artifacts kept for 7 days
   - Download from Actions tab if needed
   - Adjust retention-days for longer storage

## 🔄 Workflow Update Process

```bash
# 1. Edit workflow files locally
nano .github/workflows/frontend-ci.yml

# 2. Validate YAML syntax
yamllint .github/workflows/*.yml

# 3. Test changes locally if possible
npm run build  # or pytest tests/

# 4. Commit and push
git add .github/workflows/
git commit -m "ci: Update workflow configuration"
git push

# 5. Monitor first run
# Check Actions tab for results
```

## 📚 Key Files

```
media-converter/
├── .github/
│   └── workflows/
│       ├── frontend-ci.yml      # Frontend tests & build
│       ├── backend-ci.yml       # Backend tests & lint
│       └── docker-build.yml     # Container image builds
├── README_CICD.md               # Comprehensive guide (12KB)
├── CICD_SETUP_SUMMARY.md        # Setup summary (8KB)
└── CICD_QUICK_REFERENCE.md      # This file
```

## 🎓 Learning Resources

- **GitHub Actions**: https://docs.github.com/actions
- **Workflow Syntax**: https://docs.github.com/actions/reference/workflow-syntax
- **Marketplace**: https://github.com/marketplace?type=actions
- **Community**: https://github.community/c/code-to-cloud/52

## ⏭️ Next Steps

1. ✅ Push workflows to GitHub
2. ⏳ Watch first workflow run
3. ⏳ Add status badges to README
4. ⏳ Configure branch protection
5. ⏳ Enable Docker image push (when ready)
6. ⏳ Add deployment automation (future)

---

**Status:** Workflows ready for activation  
**Mode:** Test-only (no automatic deployments)  
**Cost:** Free (GitHub Actions free tier)  
**Created:** 2026-07-07
