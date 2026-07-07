# Deployment Checklist

## Pre-Deployment Checklist

### Frontend (Vercel)
- [ ] All files committed to git
- [ ] `feature/complete-frontend-ui` branch pushed to GitHub
- [ ] `vercel.json` configured in project root
- [ ] `frontend/.env.example` exists
- [ ] `frontend/next.config.js` optimized for Vercel
- [ ] `package.json` has `build` and `start` scripts
- [ ] GitHub repository accessible to Vercel

### Backend (Railway/Render/Fly.io)
- [ ] Backend code committed and pushed
- [ ] `requirements.txt` up to date
- [ ] Backend hosting platform chosen
- [ ] Environment variables configured
- [ ] CORS configuration includes Vercel domain
- [ ] Backend URL is accessible and working

## Deployment Steps

### 1. Backend Deployment (Choose One)

#### Option A: Railway
- [ ] Create account at railway.app
- [ ] Create new project from GitHub repo
- [ ] Set root directory to `backend`
- [ ] Configure start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Set environment variables
- [ ] Deploy and verify health endpoint
- [ ] Copy public URL: `https://[project].railway.app`

#### Option B: Render
- [ ] Create account at render.com
- [ ] Create new Web Service
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Set build command: `pip install -r requirements.txt`
- [ ] Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Select Free tier
- [ ] Set environment variables
- [ ] Deploy and wait for first spin-up
- [ ] Copy public URL: `https://[project].onrender.com`

#### Option C: Fly.io
- [ ] Create account at fly.io
- [ ] Install Fly CLI
- [ ] Login: `fly auth login`
- [ ] Navigate to backend directory
- [ ] Run: `fly launch --name media-converter-backend`
- [ ] Configure and deploy
- [ ] Copy public URL: `https://[project].fly.dev`

### 2. Frontend Deployment (Vercel)

- [ ] Go to vercel.com/new
- [ ] Import `media-converter` repository
- [ ] Set Root Directory to `frontend` (CRITICAL!)
- [ ] Configure environment variable:
  - Name: `NEXT_PUBLIC_API_URL`
  - Value: [Your backend URL from step 1]
  - Environments: All (Production, Preview, Development)
- [ ] Click "Deploy"
- [ ] Wait for build to complete (1-3 minutes)
- [ ] Copy Vercel URL: `https://[project].vercel.app`

### 3. Update Backend CORS

- [ ] Add Vercel URL to backend CORS origins
- [ ] Update `main.py` or CORS configuration:
  ```python
  allow_origins=[
      "https://[your-project].vercel.app",
      "https://*.vercel.app",  # For preview deployments
      "http://localhost:3000"
  ]
  ```
- [ ] Redeploy backend
- [ ] Verify CORS works

## Post-Deployment Verification

### Functionality Tests
- [ ] Frontend loads without errors
- [ ] Can access conversion page
- [ ] Upload form is visible
- [ ] Can select files
- [ ] Can choose output format
- [ ] Upload succeeds (check network tab)
- [ ] Backend processes file
- [ ] Download link appears
- [ ] Downloaded file is valid
- [ ] Try different file formats
- [ ] Test error handling (invalid files)

### Performance Tests
- [ ] Page loads in < 3 seconds
- [ ] API responses in < 5 seconds
- [ ] No console errors in browser
- [ ] No 404s in Network tab
- [ ] Images load properly

### Mobile Tests
- [ ] Responsive design works
- [ ] Upload works on mobile
- [ ] Download works on mobile

## Configuration Verification

### Vercel Dashboard
- [ ] Project deployed successfully
- [ ] Environment variables set correctly
- [ ] Build logs show no errors
- [ ] Domain is accessible
- [ ] Analytics enabled (optional)

### Backend Dashboard
- [ ] Service is running
- [ ] No deployment errors
- [ ] Environment variables configured
- [ ] Logs show successful requests
- [ ] Health endpoint returns 200

## Optional Enhancements

### Custom Domain
- [ ] Purchase/own a domain
- [ ] Add domain in Vercel Settings → Domains
- [ ] Configure DNS records
- [ ] Wait for DNS propagation
- [ ] Verify SSL certificate issued
- [ ] Set as primary domain

### Analytics & Monitoring
- [ ] Enable Vercel Analytics
- [ ] Add Speed Insights
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring

### CI/CD
- [ ] Verify automatic deployments work
- [ ] Test preview deployments on PRs
- [ ] Configure deployment notifications

## Rollback Plan

If something goes wrong:

### Frontend Issues
1. Check Vercel deployment logs
2. Verify environment variables
3. Try redeploying from Deployments tab
4. Roll back to previous deployment if needed

### Backend Issues
1. Check backend logs
2. Verify backend is running
3. Check environment variables
4. Verify CORS configuration
5. Redeploy backend if needed

### Emergency Rollback
- [ ] Vercel: Deployments → Previous deployment → "Promote to Production"
- [ ] Backend: Use platform's rollback feature
- [ ] Notify users if needed

## Maintenance

### Regular Checks
- [ ] Monitor bandwidth usage (Vercel free tier: 100GB/month)
- [ ] Check backend resource usage
- [ ] Review error logs weekly
- [ ] Update dependencies monthly
- [ ] Test conversion functionality weekly

### Cost Monitoring
- [ ] Vercel bandwidth usage
- [ ] Backend compute time (Railway credit)
- [ ] Storage usage
- [ ] Set up billing alerts

## Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| Build fails | Check Root Directory = `frontend` |
| 404 errors | Verify `NEXT_PUBLIC_API_URL` env var |
| CORS errors | Add Vercel domain to backend CORS |
| Slow response | Check backend isn't sleeping (Render) |
| Upload fails | Check file size limits |
| Download fails | Verify backend storage configuration |

## Support Resources

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Fly.io Docs: https://fly.io/docs
- Next.js Docs: https://nextjs.org/docs

---

**Status**: [ ] Not Started | [ ] In Progress | [ ] Complete
**Deployed By**: _________________
**Date**: _________________
**Frontend URL**: _________________
**Backend URL**: _________________
