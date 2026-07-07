# Self-Hosted Production Deployment Guide

This guide covers deploying the Media Converter application to your own infrastructure (VPS, dedicated server, on-premises).

For cloud platform deployments (Railway, Vercel, etc.), see [DEPLOYMENT_CLOUD.md](./DEPLOYMENT_CLOUD.md).

## Table of Contents

- [Prerequisites](#prerequisites)
- [System Requirements](#system-requirements)
- [Node.js Version Upgrade](#nodejs-version-upgrade)
- [Production Environment Setup](#production-environment-setup)
- [Docker Production Configuration](#docker-production-configuration)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Monitoring and Logging](#monitoring-and-logging)
- [Backup Strategy](#backup-strategy)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Production Checklist](#production-checklist)

## Prerequisites

- Linux server (Ubuntu 20.04+ or Debian 11+ recommended)
- Root or sudo access
- Domain name with DNS configured
- At least 2GB RAM, 2 CPU cores, 20GB disk space
- Docker and Docker Compose installed
- Node.js 18+ (if running without Docker)
- FFmpeg installed on the host system

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 2GB
- **Disk**: 20GB SSD
- **Network**: 100 Mbps

### Recommended Requirements
- **CPU**: 4+ cores (for parallel video processing)
- **RAM**: 4-8GB
- **Disk**: 50GB+ SSD (depends on upload volume)
- **Network**: 1 Gbps

### Software Dependencies
\`\`\`bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential

# Install FFmpeg (required for media conversion)
sudo apt install -y ffmpeg

# Verify FFmpeg installation
ffmpeg -version
\`\`\`

## Node.js Version Upgrade

The project requires Node.js 18 or higher. If you're running Node.js 16:

### Using Node Version Manager (nvm)
\`\`\`bash
# Install nvm if not already installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Verify version
node --version  # Should show v18.x.x
\`\`\`

### Using NodeSource Repository (Ubuntu/Debian)
\`\`\`bash
# Remove old Node.js
sudo apt remove nodejs -y

# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js 18
sudo apt install -y nodejs

# Verify version
node --version  # Should show v18.x.x
\`\`\`

## Production Environment Setup

### 1. Clone the Repository
\`\`\`bash
cd /var/www
sudo git clone https://github.com/yourusername/media-converter.git
cd media-converter
\`\`\`

### 2. Create Production Environment File
\`\`\`bash
cp .env.production.example .env.production
\`\`\`

Edit \`.env.production\` with your production values:
\`\`\`bash
# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
BACKEND_WORKERS=4
BACKEND_RELOAD=false

# Frontend Configuration
VITE_API_URL=https://yourdomain.com/api

# Security
SECRET_KEY=your-secret-key-here-min-32-chars
CORS_ORIGINS=https://yourdomain.com

# File Upload
MAX_UPLOAD_SIZE=524288000  # 500MB in bytes

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/media-converter/app.log
\`\`\`

### 3. Generate Secret Key
\`\`\`bash
# Generate a secure random secret key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
\`\`\`

## Docker Production Configuration

### 1. Install Docker and Docker Compose
\`\`\`bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (logout/login required)
sudo usermod -aG docker \$USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
\`\`\`

### 2. Use Production Docker Compose File
\`\`\`bash
# Copy production compose file
cp docker-compose.prod.yml docker-compose.yml

# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
\`\`\`

### 3. Docker Health Checks
The production configuration includes health checks:
\`\`\`bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
\`\`\`

## Reverse Proxy Setup

### Option 1: Nginx (Recommended)

#### Install Nginx
\`\`\`bash
sudo apt install -y nginx
\`\`\`

#### Configure Nginx
\`\`\`bash
# Copy example configuration
sudo cp nginx.conf.example /etc/nginx/sites-available/media-converter

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/media-converter /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
\`\`\`

#### Nginx Configuration Details
- Frontend served from \`/\` (port 5173)
- Backend API proxied to \`/api/\` (port 8000)
- WebSocket support enabled
- Rate limiting: 30 requests/minute per IP
- Security headers included
- Gzip compression enabled

### Option 2: Caddy

#### Install Caddy
\`\`\`bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
\`\`\`

#### Configure Caddy
Create \`/etc/caddy/Caddyfile\`:
\`\`\`caddy
yourdomain.com {
    # Frontend
    reverse_proxy localhost:5173

    # Backend API
    handle_path /api/* {
        reverse_proxy localhost:8000
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
    }

    # Gzip compression
    encode gzip

    # Logs
    log {
        output file /var/log/caddy/access.log
        format json
    }
}
\`\`\`

\`\`\`bash
# Restart Caddy
sudo systemctl restart caddy
sudo systemctl enable caddy
\`\`\`

## SSL/TLS Configuration

### Let's Encrypt with Certbot (for Nginx)
\`\`\`bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured by default
# Test renewal
sudo certbot renew --dry-run
\`\`\`

### Let's Encrypt with Caddy
Caddy handles SSL automatically! Just use your domain in the Caddyfile and Caddy will:
- Automatically obtain certificates
- Auto-renew before expiration
- Redirect HTTP to HTTPS

## Monitoring and Logging

### 1. Application Logs
\`\`\`bash
# Create log directory
sudo mkdir -p /var/log/media-converter
sudo chown -R \$USER:\$USER /var/log/media-converter

# View application logs
tail -f /var/log/media-converter/app.log

# View Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
\`\`\`

### 2. System Monitoring

#### Install htop
\`\`\`bash
sudo apt install -y htop
htop
\`\`\`

#### Disk Usage Monitoring
\`\`\`bash
# Check disk usage
df -h

# Monitor upload directory
du -sh /path/to/uploads
\`\`\`

### 3. Log Rotation
Create \`/etc/logrotate.d/media-converter\`:
\`\`\`
/var/log/media-converter/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}
\`\`\`

### 4. Optional: Monitoring Stack

Install Prometheus + Grafana for advanced monitoring:
\`\`\`bash
# This is optional and requires additional setup
# See: https://prometheus.io/docs/guides/node-exporter/
\`\`\`

## Backup Strategy

### 1. Backup Script
Create \`/usr/local/bin/backup-media-converter.sh\`:
\`\`\`bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/media-converter"
APP_DIR="/var/www/media-converter"
RETENTION_DAYS=7
DATE=\$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "\$BACKUP_DIR"

# Backup application files
tar -czf "\$BACKUP_DIR/app_\$DATE.tar.gz" \\
    -C "\$APP_DIR" \\
    --exclude='node_modules' \\
    --exclude='.git' \\
    --exclude='frontend/dist' \\
    .

# Backup uploaded files (if stored locally)
if [ -d "\$APP_DIR/uploads" ]; then
    tar -czf "\$BACKUP_DIR/uploads_\$DATE.tar.gz" \\
        -C "\$APP_DIR" \\
        uploads
fi

# Backup configuration files
tar -czf "\$BACKUP_DIR/config_\$DATE.tar.gz" \\
    -C "\$APP_DIR" \\
    .env.production \\
    docker-compose.yml

# Remove old backups
find "\$BACKUP_DIR" -name "*.tar.gz" -mtime +\$RETENTION_DAYS -delete

# Log backup completion
echo "\$(date): Backup completed successfully" >> /var/log/media-converter/backup.log
\`\`\`

### 2. Make Script Executable
\`\`\`bash
sudo chmod +x /usr/local/bin/backup-media-converter.sh
\`\`\`

### 3. Schedule Automatic Backups
\`\`\`bash
# Add to crontab
sudo crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /usr/local/bin/backup-media-converter.sh
\`\`\`

### 4. Test Backup
\`\`\`bash
sudo /usr/local/bin/backup-media-converter.sh
ls -lh /var/backups/media-converter/
\`\`\`

## Security Best Practices

### 1. Firewall Configuration (UFW)
\`\`\`bash
# Install UFW
sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if using non-standard)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
\`\`\`

### 2. CORS Hardening
In \`.env.production\`, set strict CORS origins:
\`\`\`bash
CORS_ORIGINS=https://yourdomain.com
\`\`\`

For multiple domains:
\`\`\`bash
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
\`\`\`

### 3. Rate Limiting
Already configured in \`nginx.conf.example\`:
- 30 requests per minute per IP address
- Burst allowance of 5 requests

Adjust in Nginx configuration if needed:
\`\`\`nginx
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=30r/m;
limit_req zone=api_limit burst=5 nodelay;
\`\`\`

### 4. File Upload Security
- Maximum file size enforced: 500MB (configurable)
- File type validation on backend
- Temporary file cleanup
- Virus scanning recommended (optional)

### 5. Environment Variables Security
\`\`\`bash
# Restrict permissions on .env.production
chmod 600 .env.production

# Never commit .env.production to git
echo ".env.production" >> .gitignore
\`\`\`

### 6. Regular Security Updates
\`\`\`bash
# Set up automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
\`\`\`

### 7. SSH Hardening
\`\`\`bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# - PermitRootLogin no
# - PasswordAuthentication no (use SSH keys)
# - Port 2222 (change default port)

# Restart SSH
sudo systemctl restart sshd
\`\`\`

## Troubleshooting

### Service Not Starting

#### Check Docker containers
\`\`\`bash
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
\`\`\`

#### Check port availability
\`\`\`bash
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :5173
\`\`\`

#### Check Nginx
\`\`\`bash
sudo nginx -t
sudo systemctl status nginx
sudo journalctl -u nginx -n 50
\`\`\`

### FFmpeg Not Found
\`\`\`bash
# Verify FFmpeg is installed
which ffmpeg
ffmpeg -version

# Install if missing
sudo apt install -y ffmpeg
\`\`\`

### Disk Space Issues
\`\`\`bash
# Check disk usage
df -h

# Find large files
sudo du -ah /var/www/media-converter | sort -rh | head -n 20

# Clean up Docker
docker system prune -a --volumes
\`\`\`

### Memory Issues
\`\`\`bash
# Check memory usage
free -h

# Check container resources
docker stats

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
\`\`\`

### CORS Errors
\`\`\`bash
# Check CORS_ORIGINS in .env.production
# Check Nginx proxy headers
# Verify frontend VITE_API_URL matches domain
\`\`\`

### SSL Certificate Issues
\`\`\`bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
\`\`\`

## Production Checklist

Before going live, verify:

### Environment
- [ ] Node.js 18+ installed
- [ ] FFmpeg installed and working
- [ ] Docker and Docker Compose installed
- [ ] Domain DNS configured correctly

### Configuration
- [ ] \`.env.production\` created with production values
- [ ] SECRET_KEY generated and set (min 32 characters)
- [ ] CORS_ORIGINS set to production domain
- [ ] VITE_API_URL set to production API endpoint
- [ ] LOG_LEVEL set to INFO or WARNING

### Security
- [ ] Firewall (UFW) configured and enabled
- [ ] SSH hardened (key-based auth, non-standard port)
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting configured
- [ ] File upload limits set
- [ ] \`.env.production\` permissions set to 600

### Services
- [ ] Docker containers running and healthy
- [ ] Nginx/Caddy configured and running
- [ ] HTTP redirects to HTTPS
- [ ] Backend API accessible at \`/api/\`
- [ ] Frontend accessible at \`/\`
- [ ] WebSocket connections working

### Monitoring
- [ ] Log directory created
- [ ] Log rotation configured
- [ ] Backup script created and scheduled
- [ ] Disk space monitoring set up

### Testing
- [ ] Upload a test file
- [ ] Convert to different format
- [ ] Download converted file
- [ ] Test from different browsers
- [ ] Test from mobile devices
- [ ] Verify CORS headers
- [ ] Test rate limiting

### Documentation
- [ ] Document custom configuration
- [ ] Document backup/restore procedures
- [ ] Document monitoring procedures
- [ ] Document incident response plan

## Production Maintenance

### Weekly Tasks
- Check disk space: \`df -h\`
- Review logs: \`tail -f /var/log/media-converter/app.log\`
- Check Docker containers: \`docker-compose ps\`
- Review backup status: \`ls -lh /var/backups/media-converter/\`

### Monthly Tasks
- Update system packages: \`sudo apt update && sudo apt upgrade\`
- Review security updates
- Test backup restoration
- Review and rotate logs

### Quarterly Tasks
- Review and update dependencies
- Security audit
- Performance optimization
- Capacity planning

## Support

For issues, questions, or contributions:
- GitHub Issues: [https://github.com/yourusername/media-converter/issues](https://github.com/yourusername/media-converter/issues)
- Documentation: [README.md](./README.md)

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
