# Deployment Guide

## Creating GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named "media-converter"
3. Leave it empty (no README, .gitignore, or license)

## Pushing Code to GitHub

From your server, run these commands:

```bash
cd /home/brian/brian/media-converter

# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/media-converter.git

# Push all commits
git branch -M main
git push -u origin main
```

## Deploying Backend

### Option 1: Railway (Recommended)

1. Go to https://railway.app
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your media-converter repository
4. Railway will detect Dockerfile.backend automatically
5. Set environment variables if needed
6. Deploy!

### Option 2: DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App" > "GitHub"
3. Select media-converter repository
4. Configure:
   - Type: Web Service
   - Dockerfile Path: Dockerfile.backend
   - HTTP Port: 8000
5. Click "Next" and deploy

### Option 3: Render

1. Go to https://render.com
2. Click "New +" > "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Build Command: (leave empty for Dockerfile)
   - Docker Command: (auto-detected from Dockerfile)
5. Deploy

## Deploying Frontend to Vercel

1. Go to https://vercel.com
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: frontend
   - Build Command: npm run build
   - Output Directory: (leave default)
5. Add Environment Variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: Your backend URL (e.g., https://your-backend.railway.app)
6. Click "Deploy"

## Environment Variables

### Backend
- No environment variables required for basic functionality
- Optional: Configure download directories

### Frontend
- `NEXT_PUBLIC_API_URL`: URL of your backend API (required)

## Testing Deployment

1. Test backend health:
```bash
curl https://your-backend-url.com/health
```

2. Test API status:
```bash
curl https://your-backend-url.com/api/v1/status
```

3. Visit your frontend URL and test each tool:
   - YouTube to MP4
   - YouTube to MP3
   - MP4 to MP3

## Custom Domain (Optional)

### Vercel
1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS as instructed

### Railway/DigitalOcean/Render
1. Go to your service settings
2. Add custom domain
3. Update DNS records

## Monitoring

### Backend Logs
- Railway: Dashboard > Logs
- DigitalOcean: App > Runtime Logs
- Render: Dashboard > Logs

### Frontend Logs
- Vercel: Project > Logs

## Troubleshooting

### CORS Errors
If you see CORS errors, update backend CORS settings in `backend/src/main.py`:
```python
allow_origins=["https://your-frontend-domain.com"]
```

### File Size Limits
Most platforms have file size limits. For large files:
- Increase timeout settings
- Consider using cloud storage (S3, Cloudinary)
- Implement chunked uploads

### Rate Limiting
YouTube may rate limit downloads. Consider:
- Implementing queuing system
- Adding delays between requests
- Using proxy rotation

## Maintenance

### Updating Dependencies
```bash
# Backend
cd backend
pip install --upgrade yt-dlp fastapi uvicorn

# Frontend
cd frontend
npm update
```

### Database (Future Enhancement)
Consider adding a database for:
- User accounts
- Download history
- Usage analytics

Use:
- PostgreSQL (Railway provides free tier)
- MongoDB Atlas (free tier available)
- Supabase (open-source alternative)
