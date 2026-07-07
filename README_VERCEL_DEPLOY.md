# Vercel Deployment Guide for Media Converter Frontend

This guide walks you through deploying the media-converter Next.js frontend to Vercel's free tier.

## 📋 Prerequisites

- GitHub account (for repository integration)
- Vercel account (free tier) - Sign up at [vercel.com](https://vercel.com)
- Backend deployed and accessible (Railway, Render, or Fly.io)
- Git repository pushed to GitHub

---

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Push to GitHub

```bash
# Navigate to project root
cd /home/brian/brian/media-converter

# Ensure you're on the correct branch
git checkout feature/complete-frontend-ui

# Push to GitHub (if not already done)
git push origin feature/complete-frontend-ui
```

### Step 2: Import Project to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click**: "Add New" → "Project"
3. **Import Git Repository**:
   - Select your GitHub account
   - Find `media-converter` repository
   - Click "Import"

### Step 3: Configure Project Settings

In the import screen, configure these settings:

**Framework Preset**: Next.js (should auto-detect)

**Root Directory**: `frontend` (IMPORTANT!)
- Click "Edit" next to Root Directory
- Enter: `frontend`
- This tells Vercel where your Next.js app lives

**Build & Development Settings**:
- Build Command: `npm run build` (default, auto-detected)
- Output Directory: `.next` (default, auto-detected)
- Install Command: `npm install` (default, auto-detected)

**Environment Variables**:
Click "Add" and enter:
- **Name**: `NEXT_PUBLIC_API_URL`
- **Value**: `https://your-backend-url.com` (see Backend Options below)
- **Environments**: Select "Production", "Preview", "Development"

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 1-3 minutes for build to complete
3. Your app will be live at: `https://your-project-name.vercel.app`

---

## 🔧 Backend Hosting Options

You need to deploy the backend separately. Choose one:

### Option 1: Railway (Recommended for Free Tier)

**Free Tier**:
- $5/month credit (enough for small apps)
- No auto-sleep
- Fast performance

**Deploy Steps**:
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `media-converter` repository
4. Configure:
   - Root Directory: `backend`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Set environment variables in Railway dashboard
6. Deploy and copy the public URL

### Option 2: Render

**Free Tier**:
- 750 hours/month
- Auto-sleeps after 15 min inactivity (cold start: ~30s)

**Deploy Steps**:
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Select "Free" plan
6. Deploy and copy URL

### Option 3: Fly.io

**Free Tier**:
- 3 shared-cpu VMs
- Better performance than Render
- No auto-sleep

**Deploy Steps**:
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. From backend directory, run: `fly launch`
4. Deploy: `fly deploy`

---

## ⚙️ Environment Variables Setup

### In Vercel Dashboard

1. Go to your project in Vercel
2. Click **Settings** → **Environment Variables**
3. Add variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-backend-url.com`
   - Environments: Production, Preview, Development

**Important**: Changes require a new deployment to take effect.

---

## 🌐 Custom Domain Configuration

### Add Custom Domain

1. In Vercel Dashboard, go to your project
2. Click **Settings** → **Domains**
3. Click **Add**
4. Enter your domain
5. Follow DNS configuration instructions
6. Wait for DNS propagation

---

## 💰 Cost Breakdown & Free Tier Limits

### Vercel Free Tier (Hobby)

**Included**:
- ✅ 100 GB bandwidth per month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS/SSL
- ✅ Edge Network (CDN)
- ✅ 100 serverless function executions per day
- ✅ 10 second max function duration

**Limits**:
- ❌ 1 concurrent build at a time
- ❌ No team collaboration features

**When to Upgrade** (Pro: $20/month):
- Need more than 100 GB bandwidth
- Need team collaboration

### Backend Hosting Costs

| Platform | Free Tier | Best For |
|----------|-----------|----------|
| **Railway** | $5/month credit | Always-on apps |
| **Render** | 750 hrs/month | Low-traffic apps |
| **Fly.io** | 3 VMs, 3GB storage | Performance |

---

## 🔄 Continuous Deployment

Vercel automatically deploys:

### Production Deployments
- **Trigger**: Push to `main` or `master` branch
- **URL**: Your production domain

### Preview Deployments
- **Trigger**: Push to any other branch or PR
- **URL**: Unique preview URL
- **Automatic**: Every commit gets its own preview URL

---

## 🐛 Troubleshooting

### Build Fails: "Module not found"

**Solution**: Ensure `package.json` and `package-lock.json` are committed

### API Calls Return 404/CORS Errors

**Solution**: Verify `NEXT_PUBLIC_API_URL` environment variable in Vercel Dashboard

### "Root Directory not found"

**Solution**: 
1. Go to **Settings** → **General** → **Root Directory**
2. Set to: `frontend`
3. Save and redeploy

### Slow Cold Starts (Backend)

**Cause**: Render free tier auto-sleeps after 15 min

**Solutions**:
- Use Railway or Fly.io (no auto-sleep)
- Upgrade Render to paid tier

---

## 🎯 Next Steps

1. ✅ **Deploy Frontend**: Follow Quick Deployment steps above
2. ✅ **Deploy Backend**: Choose Railway, Render, or Fly.io
3. ✅ **Configure Environment Variables**: Set `NEXT_PUBLIC_API_URL`
4. ✅ **Test Deployment**: Upload a file and verify conversion works
5. ⬜ **Custom Domain** (Optional)
6. ⬜ **Analytics** (Optional)

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js 15 Deployment](https://nextjs.org/docs/deployment)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Fly.io Docs](https://fly.io/docs)

---

**Last Updated**: July 7, 2026
**Next.js Version**: 15.1.7
