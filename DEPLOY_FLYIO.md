# Fly.io Deployment Guide - Media Converter Backend

This guide provides comprehensive instructions for deploying the Media Converter FastAPI backend to Fly.io, a platform-as-a-service (PaaS) that runs your applications close to your users on servers around the world.

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Account Setup and Authentication](#account-setup-and-authentication)
4. [Initial Project Setup](#initial-project-setup)
5. [Dockerfile Deployment](#dockerfile-deployment)
6. [Fly.toml Configuration](#flytoml-configuration)
7. [Environment Variables](#environment-variables)
8. [Volume Mounts for Media Persistence](#volume-mounts-for-media-persistence)
9. [Health Check Configuration](#health-check-configuration)
10. [Deployment](#deployment)
11. [Free Tier Details](#free-tier-details)
12. [Scaling Options](#scaling-options)
13. [Multi-Region Deployment](#multi-region-deployment)
14. [Custom Domain and SSL Certificates](#custom-domain-and-ssl-certificates)
15. [Monitoring and Logging](#monitoring-and-logging)
16. [Troubleshooting](#troubleshooting)
17. [Cost Estimation](#cost-estimation)

---

## Introduction

Fly.io is an excellent choice for hosting the Media Converter FastAPI backend because:

- **Global CDN**: Deploy your app close to users with automatic edge routing
- **Docker-native**: Uses your existing `Dockerfile.backend` without modifications
- **Persistent Storage**: Supports volume mounts for media file storage
- **Auto-scaling**: Scale horizontally and vertically based on demand
- **Health Checks**: Built-in health monitoring and automatic restarts
- **Free Tier**: Generous free tier suitable for development and small projects
- **Zero-Downtime Deploys**: Rolling deployments with automatic health checks

---

## Prerequisites

### Install flyctl CLI

The `flyctl` command-line tool is required to interact with Fly.io.

**macOS (Homebrew):**
```bash
brew install flyctl
```

**Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

**Verify Installation:**
```bash
flyctl version
```

---

## Account Setup and Authentication

### Create a Fly.io Account

1. Visit [https://fly.io/app/sign-up](https://fly.io/app/sign-up)
2. Sign up using GitHub, Google, or email
3. Verify your email address
4. Add a credit card (required even for free tier, but you won't be charged unless you exceed limits)

### Authenticate CLI

```bash
flyctl auth login
```

This will open a browser window for authentication. Once complete, your CLI is authenticated.

### Verify Authentication

```bash
flyctl auth whoami
```

---

## Initial Project Setup

Navigate to your project directory:

```bash
cd /home/brian/brian/media-converter
```

### Launch the Application

Initialize your Fly.io app:

```bash
flyctl launch --no-deploy
```

This command will:
- Detect your `Dockerfile.backend`
- Prompt you for an app name (or auto-generate one)
- Ask you to choose a region
- Create a `fly.toml` configuration file
- **NOT** deploy yet (we need to configure first)

**Recommended Responses:**
- **App name**: `media-converter-backend` (or your preferred name)
- **Region**: Choose closest to your users (e.g., `sjc` for San Jose, `iad` for Virginia, `fra` for Frankfurt)
- **Set up PostgreSQL**: No (unless you need it for your app)
- **Set up Redis**: No (unless you need it for your app)
- **Deploy now**: No

---

## Dockerfile Deployment

Fly.io will automatically use your existing `Dockerfile.backend`. Ensure it's properly configured:

### Verify Dockerfile.backend

Your Dockerfile should:
- Use Python 3.11 Alpine base image
- Install FFmpeg and poppler-utils
- Expose port 8000
- Include health check instructions
- Set up Uvicorn to run FastAPI

**Example Dockerfile.backend structure:**
```dockerfile
FROM python:3.11-alpine

# Install FFmpeg and poppler-utils
RUN apk add --no-cache ffmpeg poppler-utils

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . /app
WORKDIR /app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Specify Dockerfile in fly.toml

If your Dockerfile is named `Dockerfile.backend`, update `fly.toml`:

```toml
[build]
  dockerfile = "Dockerfile.backend"
```

---

## Fly.toml Configuration

Create or modify `fly.toml` with the following comprehensive configuration:

```toml
# Application name (must be globally unique)
app = "media-converter-backend"

# Primary region (choose closest to your users)
primary_region = "sjc"

# Kill signal and timeout
kill_signal = "SIGINT"
kill_timeout = "5s"

# Build configuration
[build]
  dockerfile = "Dockerfile.backend"

# Environment variables (non-secret)
[env]
  PORT = "8000"
  PYTHONUNBUFFERED = "1"

# HTTP service configuration
[[services]]
  protocol = "tcp"
  internal_port = 8000
  processes = ["app"]

  # HTTP checks
  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  # TCP checks for connection
  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20

  # Health check configuration
  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "10s"

  [[services.http_checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "get"
    path = "/health"
    protocol = "http"
    tls_skip_verify = false
    [services.http_checks.headers]

# Volume mounts for media persistence
[mounts]
  source = "media_storage"
  destination = "/app/media"
  initial_size = "3GB"

# VM resources
[vm]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

# Restart policy
[restart]
  policy = "on-failure"
  max_retries = 3

# Metrics
[metrics]
  port = 9091
  path = "/metrics"

# Process groups (optional - for background workers)
[processes]
  app = "uvicorn main:app --host 0.0.0.0 --port 8000"

# Deploy configuration
[deploy]
  release_command = "python -c 'print(\"Pre-deployment checks passed\")'"
  strategy = "rolling"

# Deployment scaling
[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1

# Auto-stop configuration (for free tier optimization)
[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
```

---

## Environment Variables

Your application requires 20+ environment variables from `.env.production.example`. Set these as secrets in Fly.io.

### Setting Secrets

Secrets are encrypted environment variables. Set them individually:

```bash
# Database configuration (if using PostgreSQL)
flyctl secrets set DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# JWT and authentication
flyctl secrets set SECRET_KEY="your-secret-key-here"
flyctl secrets set JWT_SECRET="your-jwt-secret-here"
flyctl secrets set JWT_ALGORITHM="HS256"

# API keys
flyctl secrets set OPENAI_API_KEY="your-openai-key"
flyctl secrets set STORAGE_API_KEY="your-storage-key"

# Storage configuration
flyctl secrets set STORAGE_BUCKET="media-files"
flyctl secrets set STORAGE_REGION="us-east-1"

# Email configuration
flyctl secrets set SMTP_HOST="smtp.gmail.com"
flyctl secrets set SMTP_PORT="587"
flyctl secrets set SMTP_USER="your-email@gmail.com"
flyctl secrets set SMTP_PASSWORD="your-app-password"

# Application configuration
flyctl secrets set ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com"
flyctl secrets set MAX_FILE_SIZE="104857600"
flyctl secrets set UPLOAD_DIR="/app/media/uploads"
flyctl secrets set OUTPUT_DIR="/app/media/outputs"

# Redis (if using)
flyctl secrets set REDIS_URL="redis://host:6379"

# Other environment-specific variables
flyctl secrets set ENVIRONMENT="production"
flyctl secrets set LOG_LEVEL="info"
```

### Batch Import from .env File

Create a script to import all secrets at once:

```bash
#!/bin/bash
# import-secrets.sh

while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z $key ]] && continue
  
  # Remove quotes from value
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  
  # Set secret
  echo "Setting secret: $key"
  flyctl secrets set "$key=$value"
done < .env.production.example
```

Make it executable and run:

```bash
chmod +x import-secrets.sh
./import-secrets.sh
```

### List All Secrets

```bash
flyctl secrets list
```

### Unset a Secret

```bash
flyctl secrets unset SECRET_NAME
```

---

## Volume Mounts for Media Persistence

Fly.io VMs are ephemeral - data is lost on restart unless stored in persistent volumes. Create a volume for media file storage.

### Create a Volume

```bash
flyctl volumes create media_storage --region sjc --size 3
```

**Parameters:**
- `media_storage`: Volume name (must match `[mounts]` in fly.toml)
- `--region sjc`: Same region as your primary app
- `--size 3`: Size in GB (3GB is the free tier limit)

### Verify Volume

```bash
flyctl volumes list
```

### Volume Configuration in fly.toml

Already included in the configuration above:

```toml
[mounts]
  source = "media_storage"
  destination = "/app/media"
  initial_size = "3GB"
```

This mounts the volume at `/app/media` inside the container.

### Important Volume Considerations

1. **Single VM Limitation**: Volumes can only be attached to one VM at a time
2. **Regional Constraint**: Volume must be in the same region as the VM
3. **Backup Strategy**: Implement regular backups (Fly.io volumes have snapshots)
4. **Multi-Region**: Create volumes in each region for multi-region deployments

### Create Volume Snapshots

```bash
flyctl volumes snapshots list media_storage
flyctl volumes snapshots create media_storage
```

### Restore from Snapshot

```bash
flyctl volumes create media_storage_restored --snapshot-id <snapshot-id>
```

---

## Health Check Configuration

Health checks ensure your application is running correctly and enable automatic restarts.

### Application Health Endpoint

Ensure your FastAPI app has a health endpoint:

```python
# main.py or routes/health.py
from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
async def health_check():
    """
    Health check endpoint for Fly.io monitoring
    """
    return {
        "status": "healthy",
        "service": "media-converter-backend",
        "version": "1.0.0"
    }

@app.get("/ready")
async def readiness_check():
    """
    Readiness check - ensure all dependencies are available
    """
    # Check database connection, storage, etc.
    try:
        # Perform dependency checks
        return {"status": "ready"}
    except Exception as e:
        return {"status": "not ready", "error": str(e)}, 503
```

### Health Check in fly.toml

Already configured in the fly.toml above:

```toml
[[services.http_checks]]
  interval = "30s"
  timeout = "5s"
  grace_period = "10s"
  method = "get"
  path = "/health"
  protocol = "http"
```

**Parameters:**
- `interval`: How often to check (every 30 seconds)
- `timeout`: Maximum time to wait for response (5 seconds)
- `grace_period`: Time to wait before starting checks (10 seconds for app startup)
- `path`: Your health endpoint (`/health`)

### TCP Health Checks

For basic connection testing:

```toml
[[services.tcp_checks]]
  interval = "15s"
  timeout = "2s"
  grace_period = "10s"
```

### View Health Check Status

```bash
flyctl status
flyctl checks list
```

---

## Deployment

Now that everything is configured, deploy your application!

### First Deployment

```bash
flyctl deploy
```

This will:
1. Build your Docker image from `Dockerfile.backend`
2. Push the image to Fly.io's registry
3. Create VMs in your specified region(s)
4. Mount persistent volumes
5. Inject environment variables and secrets
6. Run health checks
7. Route traffic to healthy instances

### Monitor Deployment

Watch the deployment in real-time:

```bash
flyctl deploy --verbose
```

### Check Deployment Status

```bash
flyctl status
```

Output will show:
- App name and region
- Number of running instances
- Health check status
- Public URL

### Access Your Application

```bash
flyctl open
```

This opens your app's URL in a browser: `https://media-converter-backend.fly.dev`

### Manual Deploy from Specific Branch

```bash
git checkout production
flyctl deploy --strategy rolling
```

---

## Free Tier Details

Fly.io offers a generous free tier suitable for development and small production apps.

### Free Tier Allowances (as of 2026)

**Compute Resources:**
- **3 shared-cpu-1x VMs** (256MB RAM each)
- Up to 2,340 hours/month of runtime (97.5 days)
- Shared CPU (not dedicated)

**Storage:**
- **3GB total persistent volume storage**
- Can be split across multiple volumes
- Snapshots included

**Bandwidth:**
- **160GB outbound bandwidth per month**
- Inbound bandwidth is free
- Overages: $0.02/GB

**Additional Free Services:**
- Custom domains and automatic SSL certificates
- DDoS protection
- Global Anycast network
- Basic metrics and logging (7 days retention)

### Free Tier Best Practices

1. **Auto-stop/start**: Enable in fly.toml to stop VMs when idle
   ```toml
   [http_service]
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0
   ```

2. **Single region**: Use one region for development
3. **Volume optimization**: Use 3GB efficiently, implement file cleanup
4. **Bandwidth monitoring**: Track usage with `flyctl metrics`

### Check Current Usage

```bash
flyctl dashboard
```

Visit: `https://fly.io/dashboard/<your-org>/usage`

---

## Scaling Options

Fly.io supports both horizontal (more VMs) and vertical (bigger VMs) scaling.

### Horizontal Scaling (More Instances)

Scale the number of VMs:

```bash
# Scale to 3 instances
flyctl scale count 3

# Scale per region
flyctl scale count 2 --region sjc
flyctl scale count 1 --region fra
```

### Vertical Scaling (Bigger VMs)

Increase CPU and memory:

```bash
# Scale to dedicated CPU with 1GB RAM
flyctl scale vm dedicated-cpu-1x

# Scale to shared CPU with 512MB RAM
flyctl scale vm shared-cpu-1x --memory 512

# Available VM sizes:
# - shared-cpu-1x: 1 shared vCPU, 256MB-2GB RAM
# - dedicated-cpu-1x: 1 dedicated vCPU, 2GB RAM
# - dedicated-cpu-2x: 2 dedicated vCPUs, 4GB RAM
# - dedicated-cpu-4x: 4 dedicated vCPUs, 8GB RAM
# - dedicated-cpu-8x: 8 dedicated vCPUs, 16GB RAM
```

### Auto-scaling

Fly.io can automatically scale based on:
- CPU usage
- Memory usage
- Request count
- Custom metrics

Configure auto-scaling:

```bash
flyctl autoscale set min=1 max=10
```

Update fly.toml:

```toml
[autoscaling]
  min_count = 1
  max_count = 10

[[autoscaling.rules]]
  type = "metric"
  metric = "cpu"
  threshold = 80
  action = "scale_up"

[[autoscaling.rules]]
  type = "metric"
  metric = "cpu"
  threshold = 20
  action = "scale_down"
```

### View Current Scale

```bash
flyctl scale show
```

---

## Multi-Region Deployment

Deploy your app to multiple regions for lower latency and high availability.

### Add Regions

```bash
# Add Frankfurt region
flyctl regions add fra

# Add Tokyo region
flyctl regions add nrt

# List all regions
flyctl regions list
```

### Create Volumes in Each Region

**Important**: Each region needs its own volume for media persistence.

```bash
# Create volume in Frankfurt
flyctl volumes create media_storage --region fra --size 3

# Create volume in Tokyo
flyctl volumes create media_storage --region nrt --size 3
```

### Deploy to All Regions

```bash
flyctl deploy
```

Fly.io will create instances in all configured regions.

### Region-Specific Configuration

```toml
# fly.toml

[regions]
  sjc = "San Jose, CA (US)"
  fra = "Frankfurt, Germany"
  nrt = "Tokyo, Japan"

# Backup regions (fallback if primary is down)
[regions.backup]
  iad = "Ashburn, VA (US)"
```

### Traffic Routing

Fly.io automatically routes users to the nearest region using:
- **Anycast IP**: Single IP that routes to closest datacenter
- **DNS-based**: Geographic DNS resolution
- **Fly-Replay**: Header-based routing between regions

### Data Synchronization

**Challenge**: Volumes are region-specific and don't auto-sync.

**Solutions**:
1. **Object Storage**: Use S3/R2/GCS for shared media files
2. **Database Replication**: Use Fly Postgres with read replicas
3. **Custom Sync**: Implement inter-region file synchronization
4. **LiteFS**: Use Fly's distributed SQLite (for database)

---

## Custom Domain and SSL Certificates

Use your own domain instead of `*.fly.dev`.

### Add Custom Domain

```bash
flyctl certs create yourdomain.com
flyctl certs create www.yourdomain.com
```

### Get DNS Configuration

```bash
flyctl certs show yourdomain.com
```

Output will show required DNS records:
```
Hostname: yourdomain.com
DNS Provider: Configure CNAME or A/AAAA records
Certificate Status: Awaiting DNS configuration

Required DNS Records:
  A     yourdomain.com     -> 66.241.124.XX
  AAAA  yourdomain.com     -> 2a09:8280:1::XX
```

### Update DNS Provider

Add the following records to your DNS provider (Cloudflare, Namecheap, etc.):

**Option 1: A/AAAA Records (Apex Domain)**
```
Type    Name    Value
A       @       66.241.124.XX
AAAA    @       2a09:8280:1::XX
A       www     66.241.124.XX
AAAA    www     2a09:8280:1::XX
```

**Option 2: CNAME (Subdomain)**
```
Type     Name    Value
CNAME    www     media-converter-backend.fly.dev
```

### Verify Certificate

Wait 5-10 minutes for DNS propagation, then:

```bash
flyctl certs check yourdomain.com
```

Once verified:
```
Hostname: yourdomain.com
Status: Ready
Issued: Yes
```

### SSL Configuration

Fly.io automatically provisions and renews Let's Encrypt SSL certificates. No configuration needed!

### Force HTTPS

Already configured in fly.toml:

```toml
[[services.ports]]
  port = 80
  handlers = ["http"]
  force_https = true  # Redirects HTTP to HTTPS
```

---

## Monitoring and Logging

Track your application's health, performance, and errors.

### Real-time Logs

```bash
# View live logs
flyctl logs

# Follow logs (like tail -f)
flyctl logs -f

# Filter by instance
flyctl logs --instance <instance-id>

# Show last 100 lines
flyctl logs --lines 100
```

### Application Metrics

```bash
# View metrics dashboard
flyctl dashboard metrics

# CPU and memory usage
flyctl metrics

# Request rates
flyctl metrics requests
```

### Grafana Dashboard

Fly.io provides free Grafana dashboards:

```bash
flyctl dashboard grafana
```

This opens Grafana with pre-configured dashboards for:
- Request rates and latency
- CPU and memory usage
- Network bandwidth
- Error rates
- Health check status

### Custom Metrics

Export Prometheus metrics from your FastAPI app:

```python
# main.py
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import Response

# Define metrics
request_count = Counter('http_requests_total', 'Total HTTP requests')
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration')

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type="text/plain")
```

Update fly.toml:

```toml
[metrics]
  port = 9091
  path = "/metrics"
```

### Alerts and Notifications

Set up alerts via Fly.io dashboard:
1. Go to `https://fly.io/dashboard/<app-name>/monitoring`
2. Create alert rules for:
   - High CPU/memory usage
   - Failed health checks
   - High error rates
   - Volume storage limits

### Structured Logging

Use structured JSON logs for better parsing:

```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
        })

# Configure logger
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logging.root.addHandler(handler)
logging.root.setLevel(logging.INFO)
```

---

## Troubleshooting

Common issues and solutions.

### App Won't Start

**Check logs:**
```bash
flyctl logs
```

**Common causes:**
- Missing environment variables
- Port mismatch (ensure `internal_port = 8000`)
- Dockerfile errors
- Missing dependencies

**Solution:**
```bash
# Verify secrets
flyctl secrets list

# Check app status
flyctl status

# Restart app
flyctl apps restart
```

### Health Checks Failing

**Verify health endpoint:**
```bash
flyctl ssh console
curl http://localhost:8000/health
```

**Check logs for errors:**
```bash
flyctl logs | grep health
```

**Adjust grace period:**
```toml
[[services.http_checks]]
  grace_period = "30s"  # Increase if app starts slowly
```

### Volume Mount Issues

**Verify volume exists:**
```bash
flyctl volumes list
```

**Check volume attachment:**
```bash
flyctl status --verbose
```

**Access volume:**
```bash
flyctl ssh console
ls -la /app/media
```

### Out of Memory (OOM)

**Increase memory:**
```bash
flyctl scale vm shared-cpu-1x --memory 512
```

**Check memory usage:**
```bash
flyctl ssh console
free -m
```

**Optimize application:**
- Reduce worker processes
- Implement file streaming
- Add memory limits to FFmpeg

### Slow Performance

**Check metrics:**
```bash
flyctl metrics
```

**Add more instances:**
```bash
flyctl scale count 2
```

**Upgrade to dedicated CPU:**
```bash
flyctl scale vm dedicated-cpu-1x
```

### Connection Timeouts

**Increase timeout in fly.toml:**
```toml
[services.concurrency]
  hard_limit = 50
  soft_limit = 40

[[services.tcp_checks]]
  timeout = "5s"
```

### Deployment Failures

**Verbose deploy:**
```bash
flyctl deploy --verbose
```

**Test Docker build locally:**
```bash
docker build -f Dockerfile.backend -t media-converter-test .
docker run -p 8000:8000 media-converter-test
```

**Force rebuild:**
```bash
flyctl deploy --no-cache
```

### SSL Certificate Issues

**Check certificate status:**
```bash
flyctl certs show yourdomain.com
```

**Remove and re-add:**
```bash
flyctl certs delete yourdomain.com
flyctl certs create yourdomain.com
```

### SSH Access for Debugging

```bash
# Open SSH console
flyctl ssh console

# Execute single command
flyctl ssh console -C "python --version"

# SFTP access
flyctl ssh sftp shell
```

### Get Support

```bash
# Community forum
https://community.fly.io

# Documentation
https://fly.io/docs

# Status page
https://status.fly.io

# Contact support
flyctl support
```

---

## Cost Estimation

Understanding costs beyond the free tier.

### Free Tier Summary (2026 Pricing)

- **Compute**: 3 shared-cpu-1x VMs (256MB RAM) - FREE
- **Storage**: 3GB persistent volumes - FREE
- **Bandwidth**: 160GB/month - FREE
- **Certificates**: Unlimited SSL certificates - FREE

### Paid Tier Pricing

**Compute (per VM per month):**
- `shared-cpu-1x` (256MB): **$1.94/month** (included: 2,340 hours)
- `shared-cpu-1x` (512MB): **$3.88/month**
- `shared-cpu-1x` (1GB): **$7.76/month**
- `dedicated-cpu-1x` (2GB): **$29.00/month**
- `dedicated-cpu-2x` (4GB): **$58.00/month**
- `dedicated-cpu-4x` (8GB): **$116.00/month**

**Storage:**
- Persistent volumes: **$0.15/GB/month**
- Example: 10GB volume = **$1.50/month**

**Bandwidth:**
- First 160GB/month: FREE
- Additional: **$0.02/GB**
- Example: 500GB/month = FREE (160GB) + $6.80 (340GB) = **$6.80/month**

**IPv4 Addresses:**
- Shared IPv4: FREE
- Dedicated IPv4: **$2.00/month** (optional)

### Example Cost Scenarios

**Scenario 1: Small Production (1 region)**
- 1x shared-cpu-1x (512MB): $3.88
- 10GB storage: $1.50
- 200GB bandwidth: $0.80
- **Total: $6.18/month**

**Scenario 2: Medium Production (3 regions)**
- 3x shared-cpu-1x (1GB): $23.28
- 30GB storage (10GB × 3): $4.50
- 500GB bandwidth: $6.80
- **Total: $34.58/month**

**Scenario 3: High Performance (1 region)**
- 2x dedicated-cpu-1x (2GB): $58.00
- 50GB storage: $7.50
- 1TB bandwidth: $16.80
- **Total: $82.30/month**

**Scenario 4: Development (Free Tier)**
- 1x shared-cpu-1x (256MB): FREE
- 3GB storage: FREE
- 100GB bandwidth: FREE
- **Total: $0/month**

### Cost Optimization Tips

1. **Use auto-stop/start**: Reduce compute hours when idle
2. **Single region for dev**: Use multi-region only for production
3. **Volume cleanup**: Implement automated media file deletion
4. **CDN integration**: Serve static assets from CDN (Cloudflare R2)
5. **Monitoring**: Set up billing alerts in dashboard
6. **Shared CPU**: Use shared VMs unless you need consistent performance
7. **Request optimization**: Cache responses to reduce bandwidth

### Monitor Costs

```bash
# View current usage and costs
flyctl dashboard

# Set up billing alerts
# Go to: https://fly.io/dashboard/<org>/billing
```

### Billing Cycle

- Billed monthly
- Prorated for partial months
- Credit card charged automatically
- Usage visible in real-time dashboard

---

## Additional Resources

- **Official Documentation**: [https://fly.io/docs](https://fly.io/docs)
- **FastAPI on Fly.io**: [https://fly.io/docs/languages-and-frameworks/python/](https://fly.io/docs/languages-and-frameworks/python/)
- **Pricing Details**: [https://fly.io/docs/about/pricing/](https://fly.io/docs/about/pricing/)
- **Community Forum**: [https://community.fly.io](https://community.fly.io)
- **Status Page**: [https://status.fly.io](https://status.fly.io)

---

## Quick Reference Commands

```bash
# Authentication
flyctl auth login
flyctl auth whoami

# Deployment
flyctl launch                    # Initialize app
flyctl deploy                    # Deploy app
flyctl deploy --verbose          # Deploy with detailed logs

# Secrets
flyctl secrets set KEY=VALUE     # Set secret
flyctl secrets list              # List secrets
flyctl secrets unset KEY         # Remove secret

# Volumes
flyctl volumes create NAME --region REGION --size SIZE
flyctl volumes list
flyctl volumes snapshots create NAME

# Scaling
flyctl scale count N             # Horizontal scaling
flyctl scale vm TYPE             # Vertical scaling
flyctl scale vm TYPE --memory MB # Scale memory

# Monitoring
flyctl logs                      # View logs
flyctl logs -f                   # Follow logs
flyctl status                    # App status
flyctl metrics                   # Metrics

# Domains
flyctl certs create DOMAIN       # Add domain
flyctl certs show DOMAIN         # Check certificate
flyctl certs list                # List all domains

# Regions
flyctl regions add REGION        # Add region
flyctl regions list              # List regions

# Troubleshooting
flyctl ssh console               # SSH into VM
flyctl apps restart              # Restart app
flyctl doctor                    # Check configuration

# Cleanup
flyctl apps destroy APP_NAME     # Delete app (careful!)
```

---

## Conclusion

You now have a comprehensive guide to deploying your Media Converter FastAPI backend on Fly.io. The platform provides excellent performance, global reach, and a generous free tier perfect for development and small production deployments.

Key advantages:
- **Docker-native**: Use your existing Dockerfile.backend
- **Global deployment**: Multi-region support with Anycast routing
- **Persistent storage**: Volume mounts for media files
- **Automatic SSL**: Free certificates with auto-renewal
- **Developer-friendly**: Simple CLI and great documentation
- **Cost-effective**: Generous free tier and predictable pricing

Start with the free tier for development, then scale up as your needs grow. Happy deploying!
