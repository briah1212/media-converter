# Vercel Quick Start - 3 Minute Deployment

## Before You Start
- [ ] GitHub repo is public or connected to Vercel
- [ ] Backend is deployed (get URL from Railway/Render/Fly.io)
- [ ] Branch `feature/complete-frontend-ui` is pushed

## Deploy in 3 Steps

### 1. Import to Vercel (1 min)
1. Go to https://vercel.com/new
2. Import `media-converter` repository
3. **IMPORTANT**: Set Root Directory to `frontend`

### 2. Set Environment Variable (30 sec)
Add this variable:
```
NEXT_PUBLIC_API_URL = https://your-backend-url.com
```
Select all environments (Production, Preview, Development)

### 3. Deploy (1-2 min)
Click "Deploy" and wait for build to complete.

## Your URLs
- Frontend: `https://media-converter-[random].vercel.app`
- Can add custom domain in Settings → Domains

## Verify It Works
1. Open your Vercel URL
2. Upload a test image
3. Convert to WebP
4. Download result

## Troubleshooting

**Build fails?**
- Check Root Directory is set to `frontend`
- Verify `package.json` exists in frontend/

**API errors?**
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check backend CORS allows Vercel domain
- Redeploy from Deployments tab

**Need help?**
See full guide: `README_VERCEL_DEPLOY.md`

## Backend Deployment Quick Links

**Railway** (Recommended):
- URL: https://railway.app
- Free: $5/month credit
- Setup time: 5 minutes

**Render**:
- URL: https://render.com
- Free: 750 hours/month
- Auto-sleeps after 15 min

**Fly.io**:
- URL: https://fly.io
- Free: 3 VMs
- Best performance

## Next Actions
1. Test upload/download functionality
2. Add custom domain (optional)
3. Enable analytics (optional)
4. Set up error monitoring (optional)

---
**Quick Reference**: 
- Vercel Dashboard: https://vercel.com/dashboard
- Logs: Click project → "Logs" tab
- Redeploy: Deployments → three dots → "Redeploy"
