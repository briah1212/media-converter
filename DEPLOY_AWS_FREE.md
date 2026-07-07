# AWS Free Tier Deployment Guide for Media Converter

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [EC2 t2.micro Setup](#ec2-t2micro-setup)
5. [Docker and Docker Compose Installation](#docker-and-docker-compose-installation)
6. [Project Deployment](#project-deployment)
7. [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)
8. [S3 Bucket for Media Storage](#s3-bucket-for-media-storage)
9. [CloudFront CDN Setup](#cloudfront-cdn-setup)
10. [SSL Certificates with Let's Encrypt](#ssl-certificates-with-lets-encrypt)
11. [Environment Variables Configuration](#environment-variables-configuration)
12. [Free Tier Limits and Monitoring](#free-tier-limits-and-monitoring)
13. [Auto-Scaling Options](#auto-scaling-options)
14. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
15. [Cost Estimation After Free Tier](#cost-estimation-after-free-tier)

---

## Introduction

This guide walks you through deploying the Media Converter full-stack application on AWS using the Free Tier. The project consists of:

- **Frontend**: Next.js application (port 3000)
- **Backend**: FastAPI application (port 8000)
- **Infrastructure**: Docker containers orchestrated with docker-compose
- **Storage**: AWS S3 for media files
- **CDN**: CloudFront for fast content delivery
- **Web Server**: Nginx reverse proxy

### AWS Free Tier Benefits (First 12 Months)
- **EC2**: 750 hours/month of t2.micro instances
- **S3**: 5GB of standard storage, 20,000 GET requests, 2,000 PUT requests
- **CloudFront**: 50GB data transfer out, 2,000,000 HTTP/HTTPS requests
- **Data Transfer**: 1GB/month out to internet from all services combined (beyond service-specific allowances)

---

## Architecture Overview

```
Internet
    |
    v
CloudFront CDN (for media files)
    |
    v
[Route 53 DNS] (optional, $0.50/month per hosted zone)
    |
    v
EC2 t2.micro Instance (Ubuntu 22.04 LTS)
    |
    +-- Nginx (Reverse Proxy) :80, :443
         |
         +-- Next.js Frontend Container :3000
         +-- FastAPI Backend Container :8000
              |
              v
         S3 Bucket (Media Storage)
```

**Components:**
- **EC2 t2.micro**: 1 vCPU, 1GB RAM (750 hours/month free)
- **Elastic IP**: Static public IP (free when attached to running instance)
- **S3**: Object storage for uploaded media files
- **CloudFront**: CDN for fast global media delivery
- **Security Groups**: Firewall rules for EC2 instance
- **IAM**: User credentials for S3 access

---

## Prerequisites

### 1. AWS Account
- Sign up at https://aws.amazon.com/free/
- Credit card required (won't be charged within free tier limits)
- Email verification and phone verification required

### 2. AWS CLI Installation

**On your local machine (macOS/Linux):**
```bash
# macOS with Homebrew
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

### 3. AWS CLI Configuration
```bash
aws configure
# AWS Access Key ID: [Your access key]
# AWS Secret Access Key: [Your secret key]
# Default region name: us-east-1
# Default output format: json
```

**Get your access keys:**
1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click "Users" → Your username → "Security credentials"
3. Click "Create access key" → "Command Line Interface (CLI)"
4. Save the Access Key ID and Secret Access Key

### 4. Local Tools
- SSH client (OpenSSH)
- Git
- Text editor

---

## EC2 t2.micro Setup

### Step 1: Create EC2 Key Pair

**Using AWS CLI:**
```bash
# Create key pair and save to file
aws ec2 create-key-pair \
    --key-name media-converter-key \
    --query 'KeyMaterial' \
    --output text > ~/.ssh/media-converter-key.pem

# Set proper permissions
chmod 400 ~/.ssh/media-converter-key.pem
```

**Using AWS Console:**
1. Go to EC2 Console: https://console.aws.amazon.com/ec2/
2. Navigate to "Network & Security" → "Key Pairs"
3. Click "Create key pair"
4. Name: `media-converter-key`
5. Key pair type: RSA
6. Private key format: .pem
7. Click "Create key pair" (downloads automatically)
8. Move to ~/.ssh/ and set permissions: `chmod 400 ~/.ssh/media-converter-key.pem`

### Step 2: Create Security Group

**Using AWS CLI:**
```bash
# Create security group
aws ec2 create-security-group \
    --group-name media-converter-sg \
    --description "Security group for Media Converter application"

# Get the security group ID (save this)
SG_ID=$(aws ec2 describe-security-groups \
    --group-names media-converter-sg \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "Security Group ID: $SG_ID"

# Add inbound rules
# SSH (port 22)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

# HTTP (port 80)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# HTTPS (port 443)
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0
```

**Using AWS Console:**
1. EC2 Console → "Network & Security" → "Security Groups"
2. Click "Create security group"
3. Security group name: `media-converter-sg`
4. Description: `Security group for Media Converter application`
5. Add inbound rules:
   - Type: SSH, Port: 22, Source: 0.0.0.0/0 (or your IP for better security)
   - Type: HTTP, Port: 80, Source: 0.0.0.0/0
   - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
6. Click "Create security group"

### Step 3: Launch EC2 Instance

**Using AWS CLI:**
```bash
# Get Ubuntu 22.04 LTS AMI ID for your region
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text)

echo "Using AMI: $AMI_ID"

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type t2.micro \
    --key-name media-converter-key \
    --security-groups media-converter-sg \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=media-converter}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "Instance ID: $INSTANCE_ID"

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "Public IP: $PUBLIC_IP"
```

**Using AWS Console:**
1. EC2 Console → "Instances" → "Launch instances"
2. **Name**: `media-converter`
3. **Application and OS Images**: Ubuntu Server 22.04 LTS (64-bit x86)
4. **Instance type**: t2.micro (Free tier eligible)
5. **Key pair**: Select `media-converter-key`
6. **Network settings**:
   - Select existing security group: `media-converter-sg`
7. **Configure storage**: 30 GB gp3 (Free tier: 30GB available)
8. Click "Launch instance"
9. Wait for instance state to be "Running"
10. Note the Public IPv4 address

### Step 4: Allocate and Associate Elastic IP

**Why Elastic IP?** Prevents IP address changes when instance stops/starts.

**Using AWS CLI:**
```bash
# Allocate Elastic IP
ALLOCATION_ID=$(aws ec2 allocate-address \
    --query 'AllocationId' \
    --output text)

# Get the Elastic IP
ELASTIC_IP=$(aws ec2 describe-addresses \
    --allocation-ids $ALLOCATION_ID \
    --query 'Addresses[0].PublicIp' \
    --output text)

echo "Elastic IP: $ELASTIC_IP"

# Associate with instance
aws ec2 associate-address \
    --instance-id $INSTANCE_ID \
    --allocation-id $ALLOCATION_ID

echo "Elastic IP associated with instance"
```

**Using AWS Console:**
1. EC2 Console → "Network & Security" → "Elastic IPs"
2. Click "Allocate Elastic IP address"
3. Click "Allocate"
4. Select the allocated IP → "Actions" → "Associate Elastic IP address"
5. Select your instance: `media-converter`
6. Click "Associate"

**Note:** Elastic IP is free when attached to a running instance. If instance is stopped, you're charged $0.005/hour (~$3.60/month).

### Step 5: Connect to EC2 Instance

```bash
# SSH into instance
ssh -i ~/.ssh/media-converter-key.pem ubuntu@YOUR_ELASTIC_IP

# If you get "Connection refused", wait a minute for instance to fully boot
```

### Step 6: Initial Server Setup

Once connected to EC2, run the following setup script:

```bash
#!/bin/bash
# save as: setup-server.sh

set -e

echo "=== Media Converter Server Setup ==="

# Update system packages
echo "Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install essential tools
echo "Installing essential tools..."
sudo apt install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install and configure UFW firewall
echo "Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Set timezone
echo "Setting timezone..."
sudo timedatectl set-timezone America/New_York  # Change as needed

# Increase file limits for media processing
echo "Configuring system limits..."
sudo tee -a /etc/security/limits.conf > /dev/null <<EOL
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOL

# Configure swap (important for 1GB RAM instance)
echo "Setting up swap file..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize swap usage
sudo sysctl vm.swappiness=10
sudo sysctl vm.vfs_cache_pressure=50
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf

echo "=== Server setup complete! ==="
```

**Run the script:**
```bash
# Create and run setup script
nano setup-server.sh
# Paste the above script content
chmod +x setup-server.sh
./setup-server.sh
```

---

## Docker and Docker Compose Installation

### Automated Installation Script

```bash
#!/bin/bash
# save as: install-docker.sh

set -e

echo "=== Installing Docker and Docker Compose ==="

# Remove old versions
echo "Removing old Docker versions..."
sudo apt remove -y docker docker-engine docker.io containerd runc || true

# Add Docker's official GPG key
echo "Adding Docker GPG key..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "Adding Docker repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
echo "Installing Docker Engine..."
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
echo "Adding user to docker group..."
sudo usermod -aG docker $USER

# Enable Docker service
echo "Enabling Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

# Verify installation
echo "Verifying Docker installation..."
docker --version
docker compose version

echo "=== Docker installation complete! ==="
echo "NOTE: Log out and log back in for group changes to take effect"
echo "Or run: newgrp docker"
```

**Run the script:**
```bash
nano install-docker.sh
# Paste the above script content
chmod +x install-docker.sh
./install-docker.sh

# Apply group changes
newgrp docker

# Test Docker
docker run hello-world
```

---

## Project Deployment

### Step 1: Clone Repository

```bash
# Create project directory
mkdir -p ~/apps
cd ~/apps

# Clone your repository (replace with your repo URL)
git clone https://github.com/yourusername/media-converter.git
cd media-converter

# If private repo, set up SSH key or use personal access token
# For HTTPS with token:
# git clone https://YOUR_GITHUB_TOKEN@github.com/yourusername/media-converter.git
```

### Step 2: Create Production Environment File

```bash
# Create .env.production file
nano .env.production
```

**Environment variables template:**
```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Backend API
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=https://yourdomain.com

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
S3_BUCKET_NAME=media-converter-storage
S3_ENDPOINT_URL=https://s3.us-east-1.amazonaws.com

# CloudFront
CLOUDFRONT_DISTRIBUTION_ID=YOUR_DISTRIBUTION_ID
CLOUDFRONT_DOMAIN=YOUR_CLOUDFRONT_DOMAIN.cloudfront.net

# Database (if applicable)
DATABASE_URL=postgresql://user:password@localhost:5432/mediaconverter

# Redis (if applicable)
REDIS_URL=redis://localhost:6379/0

# Security
SECRET_KEY=YOUR_SECURE_RANDOM_SECRET_KEY
JWT_SECRET=YOUR_JWT_SECRET_KEY
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600

# File Upload Limits
MAX_UPLOAD_SIZE=104857600  # 100MB in bytes
ALLOWED_EXTENSIONS=mp4,avi,mov,mkv,flv,wmv,webm,mp3,wav,flac,aac,ogg

# Processing
MAX_CONCURRENT_JOBS=2  # Conservative for t2.micro
TEMP_DIR=/tmp/media-converter

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/media-converter/app.log

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

**Generate secure secret keys:**
```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate JWT_SECRET
openssl rand -base64 32
```

### Step 3: Review docker-compose.prod.yml

```bash
# Check your docker-compose.prod.yml
cat docker-compose.prod.yml
```

**Example docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: media-converter-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: media-converter-backend
    ports:
      - "8000:8000"
    environment:
      - BACKEND_HOST=${BACKEND_HOST}
      - BACKEND_PORT=${BACKEND_PORT}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - S3_BUCKET_NAME=${S3_BUCKET_NAME}
      - SECRET_KEY=${SECRET_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      - CORS_ORIGINS=${CORS_ORIGINS}
      - MAX_UPLOAD_SIZE=${MAX_UPLOAD_SIZE}
      - MAX_CONCURRENT_JOBS=${MAX_CONCURRENT_JOBS}
    volumes:
      - /tmp/media-converter:/tmp/media-converter
      - ./logs:/var/log/media-converter
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Step 4: Build and Run Containers

```bash
#!/bin/bash
# save as: deploy.sh

set -e

echo "=== Deploying Media Converter Application ==="

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo "Error: .env.production file not found!"
    exit 1
fi

# Create necessary directories
echo "Creating directories..."
sudo mkdir -p /tmp/media-converter
sudo mkdir -p ./logs
sudo chown -R $USER:$USER ./logs

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Stop existing containers
echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down || true

# Remove old images (optional, saves space)
echo "Removing old images..."
docker image prune -f

# Build and start containers
echo "Building and starting containers..."
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 10

# Check container status
echo "Checking container status..."
docker compose -f docker-compose.prod.yml ps

# Show logs
echo "Recent logs:"
docker compose -f docker-compose.prod.yml logs --tail=50

echo "=== Deployment complete! ==="
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8000"
```

**Run deployment:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### Step 5: Verify Deployment

```bash
# Check running containers
docker ps

# Check frontend logs
docker logs media-converter-frontend

# Check backend logs
docker logs media-converter-backend

# Test backend API
curl http://localhost:8000/health
curl http://localhost:8000/docs  # FastAPI Swagger UI

# Test frontend
curl http://localhost:3000
```

---

## Nginx Reverse Proxy Setup

### Step 1: Install Nginx

```bash
sudo apt update
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### Step 2: Configure Nginx

```bash
# Remove default configuration
sudo rm /etc/nginx/sites-enabled/default

# Create new configuration
sudo nano /etc/nginx/sites-available/media-converter
```

**Nginx configuration (before SSL):**
```nginx
# /etc/nginx/sites-available/media-converter

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

# Upstream definitions
upstream frontend {
    server localhost:3000;
}

upstream backend {
    server localhost:8000;
}

# HTTP Server (will redirect to HTTPS after SSL setup)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Client upload size limit
    client_max_body_size 100M;
    client_body_buffer_size 128k;

    # Timeouts for large file uploads
    client_body_timeout 300s;
    client_header_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # Logging
    access_log /var/log/nginx/media-converter-access.log;
    error_log /var/log/nginx/media-converter-error.log;

    # Backend API
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Buffering for large responses
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 24 4k;
        proxy_busy_buffers_size 8k;
        proxy_max_temp_file_size 2048m;
        proxy_temp_file_write_size 32k;
    }

    # Backend docs (FastAPI Swagger)
    location /docs {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload endpoint with stricter rate limiting
    location /api/upload {
        limit_req zone=upload_limit burst=5 nodelay;
        
        proxy_pass http://backend/api/upload;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # No buffering for uploads
        proxy_request_buffering off;
    }

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Next.js specific
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**Enable the configuration:**
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/media-converter /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 3: Configure Firewall

```bash
# Allow Nginx through firewall
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

### Step 4: Test Nginx Proxy

```bash
# Test with Elastic IP
curl http://YOUR_ELASTIC_IP

# Test API endpoint
curl http://YOUR_ELASTIC_IP/api/health

# Check Nginx logs
sudo tail -f /var/log/nginx/media-converter-access.log
sudo tail -f /var/log/nginx/media-converter-error.log
```

---

## S3 Bucket for Media Storage

### Step 1: Create S3 Bucket

**Using AWS CLI:**
```bash
# Set bucket name (must be globally unique)
BUCKET_NAME="media-converter-storage-$(date +%s)"
REGION="us-east-1"

echo "Creating bucket: $BUCKET_NAME"

# Create bucket
aws s3 mb s3://$BUCKET_NAME --region $REGION

# Enable versioning (optional, for backup)
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled

# Configure lifecycle policy (delete old files after 90 days)
cat > lifecycle-policy.json <<EOL
{
    "Rules": [
        {
            "Id": "DeleteOldFiles",
            "Status": "Enabled",
            "Prefix": "temp/",
            "Expiration": {
                "Days": 7
            }
        },
        {
            "Id": "TransitionToIA",
            "Status": "Enabled",
            "Prefix": "archive/",
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER_IR"
                }
            ]
        }
    ]
}
EOL

aws s3api put-bucket-lifecycle-configuration \
    --bucket $BUCKET_NAME \
    --lifecycle-configuration file://lifecycle-policy.json

echo "Bucket created: $BUCKET_NAME"
```

**Using AWS Console:**
1. Go to S3 Console: https://s3.console.aws.amazon.com/s3/
2. Click "Create bucket"
3. **Bucket name**: `media-converter-storage-YOUR_UNIQUE_ID` (must be globally unique)
4. **AWS Region**: us-east-1 (or your preferred region)
5. **Object Ownership**: ACLs disabled (recommended)
6. **Block Public Access**: Keep all settings checked (public access blocked)
7. **Bucket Versioning**: Enable (optional, for backup)
8. **Default encryption**: Enable with SSE-S3
9. Click "Create bucket"

### Step 2: Configure CORS

```bash
# Create CORS configuration
cat > cors-config.json <<EOL
{
    "CORSRules": [
        {
            "AllowedOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
            "MaxAgeSeconds": 3600
        }
    ]
}
EOL

# Apply CORS configuration
aws s3api put-bucket-cors \
    --bucket $BUCKET_NAME \
    --cors-configuration file://cors-config.json

echo "CORS configured"
```

**Using AWS Console:**
1. Select your bucket → "Permissions" tab
2. Scroll to "Cross-origin resource sharing (CORS)"
3. Click "Edit"
4. Paste CORS configuration (JSON above)
5. Click "Save changes"

### Step 3: Create IAM User for S3 Access

**Using AWS CLI:**
```bash
# Create IAM user
aws iam create-user --user-name media-converter-s3-user

# Create policy document
cat > s3-policy.json <<EOL
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetObjectAcl",
                "s3:PutObjectAcl"
            ],
            "Resource": [
                "arn:aws:s3:::$BUCKET_NAME",
                "arn:aws:s3:::$BUCKET_NAME/*"
            ]
        }
    ]
}
EOL

# Create policy
POLICY_ARN=$(aws iam create-policy \
    --policy-name MediaConverterS3Policy \
    --policy-document file://s3-policy.json \
    --query 'Policy.Arn' \
    --output text)

# Attach policy to user
aws iam attach-user-policy \
    --user-name media-converter-s3-user \
    --policy-arn $POLICY_ARN

# Create access key
aws iam create-access-key --user-name media-converter-s3-user

# Save the AccessKeyId and SecretAccessKey from output
```

**Using AWS Console:**
1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click "Users" → "Create user"
3. **User name**: `media-converter-s3-user`
4. Click "Next"
5. Select "Attach policies directly"
6. Click "Create policy" → "JSON" tab
7. Paste the policy from `s3-policy.json` above (replace $BUCKET_NAME)
8. Click "Next" → Name: `MediaConverterS3Policy` → "Create policy"
9. Back to user creation, refresh policies, select `MediaConverterS3Policy`
10. Click "Create user"
11. Select the user → "Security credentials" → "Create access key"
12. Select "Application running outside AWS" → "Create access key"
13. **Save the Access Key ID and Secret Access Key** (shown only once!)

### Step 4: Update Environment Variables

```bash
# Add to .env.production
nano ~/apps/media-converter/.env.production
```

Add:
```bash
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY
AWS_REGION=us-east-1
S3_BUCKET_NAME=media-converter-storage-YOUR_ID
```

### Step 5: Test S3 Integration

```bash
# Test upload from EC2 instance
echo "Test file" > test.txt

aws s3 cp test.txt s3://$BUCKET_NAME/test.txt

# Verify upload
aws s3 ls s3://$BUCKET_NAME/

# Download test
aws s3 cp s3://$BUCKET_NAME/test.txt test-download.txt

# Cleanup
rm test.txt test-download.txt
aws s3 rm s3://$BUCKET_NAME/test.txt
```

---

## CloudFront CDN Setup

### Step 1: Create CloudFront Distribution

**Using AWS CLI:**
```bash
# Create distribution configuration
cat > cloudfront-config.json <<EOL
{
    "CallerReference": "$(date +%s)",
    "Comment": "Media Converter CDN",
    "Enabled": true,
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3.$REGION.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                },
                "ConnectionAttempts": 3,
                "ConnectionTimeout": 10
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
            "Quantity": 7,
            "Items": ["HEAD", "DELETE", "POST", "GET", "OPTIONS", "PUT", "PATCH"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["HEAD", "GET"]
            }
        },
        "Compress": true,
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000
    },
    "PriceClass": "PriceClass_100"
}
EOL

# Create distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

**Using AWS Console:**
1. Go to CloudFront Console: https://console.aws.amazon.com/cloudfront/
2. Click "Create distribution"
3. **Origin domain**: Select your S3 bucket from dropdown
4. **Origin access**: "Origin access control settings (recommended)"
5. Click "Create control setting"
   - Name: `media-converter-oac`
   - Sign requests: Yes (recommended)
   - Click "Create"
6. **Origin path**: Leave empty
7. **Enable Origin Shield**: No (costs extra)
8. **Default cache behavior**:
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - **Cache policy**: CachingOptimized
   - **Compress objects automatically**: Yes
9. **Price class**: Use only North America and Europe (cheapest)
10. **Alternate domain names (CNAMEs)**: `cdn.yourdomain.com` (optional)
11. **Custom SSL certificate**: Request certificate (if using custom domain)
12. Click "Create distribution"

**Note:** Distribution takes 15-20 minutes to deploy.

### Step 2: Update S3 Bucket Policy for CloudFront

After creating OAC (Origin Access Control), CloudFront will show you a bucket policy. Apply it:

```bash
# Get the policy from CloudFront console and apply
cat > bucket-policy.json <<EOL
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
                }
            }
        }
    ]
}
EOL

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file://bucket-policy.json
```

**Using AWS Console:**
1. Copy the policy shown in CloudFront console
2. Go to S3 → Your bucket → "Permissions" → "Bucket policy"
3. Paste and save

### Step 3: Configure Custom Domain (Optional)

**If using custom domain like cdn.yourdomain.com:**

1. **Request SSL Certificate in ACM (us-east-1 region required for CloudFront)**:
```bash
aws acm request-certificate \
    --domain-name cdn.yourdomain.com \
    --validation-method DNS \
    --region us-east-1
```

2. **Add DNS validation records** (shown in ACM console)

3. **Update CloudFront distribution** with custom domain and certificate

4. **Add CNAME record** in your DNS:
   - Type: CNAME
   - Name: cdn
   - Value: d1234567890.cloudfront.net (your CloudFront domain)

### Step 4: Update Application Configuration

```bash
# Add to .env.production
nano ~/apps/media-converter/.env.production
```

Add:
```bash
CLOUDFRONT_DISTRIBUTION_ID=E1XXXXXXXXXXXX
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net  # or cdn.yourdomain.com
```

### Step 5: Test CloudFront

```bash
# Upload test file
echo "CloudFront test" > cf-test.txt
aws s3 cp cf-test.txt s3://$BUCKET_NAME/cf-test.txt --acl public-read

# Access via CloudFront (after distribution is deployed)
curl https://d1234567890.cloudfront.net/cf-test.txt

# Check cache status
curl -I https://d1234567890.cloudfront.net/cf-test.txt | grep X-Cache
# X-Cache: Hit from cloudfront (cached)
# X-Cache: Miss from cloudfront (not cached yet)
```

---

## SSL Certificates with Let's Encrypt

### Step 1: Install Certbot

```bash
# Install Certbot with Nginx plugin
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### Step 2: Configure DNS

Before running Certbot, ensure your domain points to your Elastic IP:

1. Go to your domain registrar (GoDaddy, Namecheap, etc.)
2. Add DNS A record:
   - Type: A
   - Name: @ (root domain)
   - Value: YOUR_ELASTIC_IP
   - TTL: 3600
3. Add DNS A record for www:
   - Type: A
   - Name: www
   - Value: YOUR_ELASTIC_IP
   - TTL: 3600
4. Wait for DNS propagation (5-30 minutes)

**Verify DNS:**
```bash
# Check DNS propagation
nslookup yourdomain.com
dig yourdomain.com

# Test HTTP access
curl http://yourdomain.com
```

### Step 3: Obtain SSL Certificate

```bash
# Stop Nginx temporarily (if needed)
sudo systemctl stop nginx

# Request certificate (standalone mode first time)
sudo certbot certonly --standalone \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --non-interactive \
    --agree-tos \
    --email your-email@example.com

# Or use Nginx plugin (if Nginx is running)
sudo certbot --nginx \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --non-interactive \
    --agree-tos \
    --email your-email@example.com
```

**Certificates will be saved to:**
- Certificate: `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/yourdomain.com/privkey.pem`

### Step 4: Update Nginx Configuration for HTTPS

```bash
sudo nano /etc/nginx/sites-available/media-converter
```

**Updated Nginx configuration with SSL:**
```nginx
# /etc/nginx/sites-available/media-converter

# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=2r/s;

# Upstream definitions
upstream frontend {
    server localhost:3000;
}

upstream backend {
    server localhost:8000;
}

# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;

    # SSL settings (Mozilla Intermediate configuration)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; media-src 'self' https: blob:; object-src 'none'; frame-ancestors 'self';" always;

    # Client upload size limit
    client_max_body_size 100M;
    client_body_buffer_size 128k;

    # Timeouts
    client_body_timeout 300s;
    client_header_timeout 300s;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    send_timeout 300s;

    # Logging
    access_log /var/log/nginx/media-converter-access.log;
    error_log /var/log/nginx/media-converter-error.log;

    # Backend API
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 24 4k;
        proxy_busy_buffers_size 8k;
        proxy_max_temp_file_size 2048m;
        proxy_temp_file_write_size 32k;
    }

    # Backend docs
    location /docs {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload endpoint
    location /api/upload {
        limit_req zone=upload_limit burst=5 nodelay;
        
        proxy_pass http://backend/api/upload;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_request_buffering off;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**Apply configuration:**
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 5: Set Up Auto-Renewal

Certbot automatically installs a systemd timer for renewal. Verify:

```bash
# Check renewal timer
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run

# Manual renewal (if needed)
sudo certbot renew
```

**Create renewal hook (optional):**
```bash
# Reload Nginx after renewal
sudo nano /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

```bash
#!/bin/bash
systemctl reload nginx
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh
```

### Step 6: Test HTTPS

```bash
# Test HTTPS
curl https://yourdomain.com

# Test SSL with detailed info
curl -vI https://yourdomain.com

# Check SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Test SSL rating (external tool)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

---

## Environment Variables Configuration

### Comprehensive Environment Setup

```bash
# Edit environment file
nano ~/apps/media-converter/.env.production
```

**Complete .env.production template:**

```bash
# ============================================
# APPLICATION SETTINGS
# ============================================
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# ============================================
# BACKEND API SETTINGS
# ============================================
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ============================================
# AWS S3 CONFIGURATION
# ============================================
AWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF
AWS_SECRET_ACCESS_KEY=abcdefghijklmnopqrstuvwxyz1234567890ABCD
AWS_REGION=us-east-1
S3_BUCKET_NAME=media-converter-storage-1234567890
S3_ENDPOINT_URL=https://s3.us-east-1.amazonaws.com
S3_USE_SSL=true
S3_VERIFY=true

# ============================================
# CLOUDFRONT CDN
# ============================================
CLOUDFRONT_DISTRIBUTION_ID=E1XXXXXXXXXXXX
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=APKA1234567890ABCDEF  # For signed URLs (optional)
CLOUDFRONT_PRIVATE_KEY_PATH=/path/to/private-key.pem  # For signed URLs (optional)

# ============================================
# DATABASE (if applicable)
# ============================================
DATABASE_URL=postgresql://mediauser:securepassword@localhost:5432/mediaconverter
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10

# ============================================
# REDIS (if applicable)
# ============================================
REDIS_URL=redis://localhost:6379/0
REDIS_MAX_CONNECTIONS=10

# ============================================
# SECURITY
# ============================================
SECRET_KEY=4f8a3e9b2c7d1f6e8a9b4c5d2e7f3a8b9c1d4e6f7a8b3c9d2e5f8a7b4c6d9e3f
JWT_SECRET=aGVsbG93b3JsZHRoaXNpc2FzZWNyZXRrZXlmb3Jqd3R0b2tlbnM=
JWT_ALGORITHM=HS256
JWT_EXPIRATION=3600  # 1 hour
JWT_REFRESH_EXPIRATION=604800  # 7 days
BCRYPT_ROUNDS=12

# ============================================
# FILE UPLOAD SETTINGS
# ============================================
MAX_UPLOAD_SIZE=104857600  # 100MB in bytes
MAX_UPLOAD_SIZE_MB=100
ALLOWED_VIDEO_EXTENSIONS=mp4,avi,mov,mkv,flv,wmv,webm,mpeg,mpg,m4v
ALLOWED_AUDIO_EXTENSIONS=mp3,wav,flac,aac,ogg,m4a,wma
ALLOWED_IMAGE_EXTENSIONS=jpg,jpeg,png,gif,bmp,webp,svg
UPLOAD_CHUNK_SIZE=1048576  # 1MB

# ============================================
# MEDIA PROCESSING
# ============================================
MAX_CONCURRENT_JOBS=2  # Conservative for t2.micro
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
TEMP_DIR=/tmp/media-converter
PROCESSING_TIMEOUT=3600  # 1 hour
VIDEO_QUALITY_PRESET=medium  # ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
VIDEO_CODEC=libx264
AUDIO_CODEC=aac
OUTPUT_FORMAT=mp4

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
LOG_FILE=/var/log/media-converter/app.log
LOG_MAX_BYTES=10485760  # 10MB
LOG_BACKUP_COUNT=5
LOG_FORMAT=%(asctime)s - %(name)s - %(levelname)s - %(message)s

# ============================================
# EMAIL NOTIFICATIONS (optional)
# ============================================
SMTP_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Media Converter

# ============================================
# RATE LIMITING
# ============================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
UPLOAD_RATE_LIMIT_PER_HOUR=100

# ============================================
# MONITORING & ANALYTICS
# ============================================
SENTRY_DSN=  # Optional: Sentry error tracking
SENTRY_ENVIRONMENT=production
ANALYTICS_ENABLED=false
GOOGLE_ANALYTICS_ID=  # Optional

# ============================================
# FEATURE FLAGS
# ============================================
ENABLE_USER_REGISTRATION=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_PASSWORD_RESET=true
ENABLE_FILE_SHARING=true
ENABLE_BATCH_PROCESSING=false
ENABLE_API_DOCS=true  # /docs endpoint

# ============================================
# CACHE SETTINGS
# ============================================
CACHE_ENABLED=true
CACHE_TTL=3600  # 1 hour
CACHE_MAX_SIZE=1000

# ============================================
# WEBHOOK SETTINGS (optional)
# ============================================
WEBHOOK_ENABLED=false
WEBHOOK_URL=https://your-webhook-url.com/callback
WEBHOOK_SECRET=your-webhook-secret

# ============================================
# MISCELLANEOUS
# ============================================
TIMEZONE=America/New_York
LANGUAGE=en
ITEMS_PER_PAGE=20
MAX_PAGES=100
SESSION_TIMEOUT=1800  # 30 minutes
DEBUG=false
```

### Secure Environment File

```bash
# Set proper permissions
chmod 600 ~/apps/media-converter/.env.production

# Prevent git from tracking it
echo ".env.production" >> ~/apps/media-converter/.gitignore
```

### Environment Variable Validation Script

```bash
#!/bin/bash
# save as: validate-env.sh

set -e

echo "=== Validating Environment Variables ==="

ENV_FILE="$HOME/apps/media-converter/.env.production"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found!"
    exit 1
fi

# Required variables
REQUIRED_VARS=(
    "NODE_ENV"
    "NEXT_PUBLIC_API_URL"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "S3_BUCKET_NAME"
    "SECRET_KEY"
    "JWT_SECRET"
)

# Check each required variable
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" "$ENV_FILE"; then
        echo "Error: $var is not set in $ENV_FILE"
        exit 1
    fi
    
    # Check if value is not empty
    value=$(grep "^$var=" "$ENV_FILE" | cut -d'=' -f2-)
    if [ -z "$value" ]; then
        echo "Error: $var is set but empty in $ENV_FILE"
        exit 1
    fi
    
    echo "✓ $var is set"
done

echo "=== All required environment variables are set ==="
```

**Run validation:**
```bash
chmod +x validate-env.sh
./validate-env.sh
```

---

## Free Tier Limits and Monitoring

### AWS Free Tier Limits

**EC2:**
- 750 hours/month of t2.micro instances (Linux)
- 30 GB of EBS storage (General Purpose SSD)
- 2 million IOs
- 1 GB of snapshots

**S3:**
- 5 GB of standard storage
- 20,000 GET requests
- 2,000 PUT requests

**CloudFront:**
- 50 GB data transfer out
- 2,000,000 HTTP/HTTPS requests

**Data Transfer:**
- 1 GB/month out to internet (across all services)
- 15 GB out to other AWS regions (combined)

### Monitoring Free Tier Usage

#### Using AWS Billing Console

```bash
# Access billing dashboard
# https://console.aws.amazon.com/billing/home#/freetier
```

1. Go to AWS Console → Billing Dashboard
2. Click "Free Tier" in left menu
3. View current month usage and forecasts
4. Set up alerts (see below)

#### Set Up Billing Alerts

```bash
# Enable billing alerts (one-time setup)
aws ce put-cost-category-definition \
    --name "Free Tier Alerts" \
    --effective-start "2026-01-01" \
    --rule-version "CostCategoryExpression.v1"

# Create SNS topic for alerts
aws sns create-topic --name billing-alerts --region us-east-1

# Subscribe email to topic
aws sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:billing-alerts \
    --protocol email \
    --notification-endpoint your-email@example.com \
    --region us-east-1

# Confirm subscription via email
```

**Create CloudWatch billing alarm:**

```bash
# Create alarm for $10 threshold
aws cloudwatch put-metric-alarm \
    --alarm-name billing-alert-10 \
    --alarm-description "Alert when AWS charges exceed $10" \
    --metric-name EstimatedCharges \
    --namespace AWS/Billing \
    --statistic Maximum \
    --period 21600 \
    --evaluation-periods 1 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=Currency,Value=USD \
    --alarm-actions arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:billing-alerts \
    --region us-east-1
```

**Using AWS Console:**
1. CloudWatch Console → Alarms → Create alarm
2. Select metric: Billing → Total Estimated Charge
3. Conditions: Greater than $10
4. Configure SNS topic
5. Name: `billing-alert-10`
6. Create alarm

### Resource Monitoring Script

```bash
#!/bin/bash
# save as: monitor-resources.sh

set -e

echo "=== AWS Free Tier Resource Monitor ==="
echo ""

# EC2 Hours
echo "--- EC2 Usage ---"
START_DATE=$(date -u -d "$(date +%Y-%m-01)" +%Y-%m-%dT00:00:00Z)
END_DATE=$(date -u +%Y-%m-%dT23:59:59Z)

INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=media-converter" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text)

if [ "$INSTANCE_ID" != "None" ]; then
    LAUNCH_TIME=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].LaunchTime' \
        --output text)
    
    echo "Instance ID: $INSTANCE_ID"
    echo "Launch Time: $LAUNCH_TIME"
    
    # Calculate uptime (approximate)
    UPTIME=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/EC2 \
        --metric-name CPUUtilization \
        --dimensions Name=InstanceId,Value=$INSTANCE_ID \
        --start-time $START_DATE \
        --end-time $END_DATE \
        --period 3600 \
        --statistics SampleCount \
        --query 'Datapoints | length(@)' \
        --output text)
    
    echo "Approximate hours this month: $UPTIME / 750 (free tier)"
else
    echo "No running instance found"
fi

echo ""

# S3 Storage
echo "--- S3 Usage ---"
BUCKET_NAME=$(grep S3_BUCKET_NAME ~/.env.production 2>/dev/null | cut -d'=' -f2 || echo "")
if [ -n "$BUCKET_NAME" ]; then
    BUCKET_SIZE=$(aws s3 ls s3://$BUCKET_NAME --recursive --summarize | grep "Total Size" | awk '{print $3}')
    BUCKET_SIZE_GB=$(echo "scale=2; $BUCKET_SIZE / 1073741824" | bc)
    
    echo "Bucket: $BUCKET_NAME"
    echo "Size: $BUCKET_SIZE_GB GB / 5 GB (free tier)"
else
    echo "S3 bucket not configured"
fi

echo ""

# CloudFront
echo "--- CloudFront Usage ---"
DISTRIBUTION_ID=$(grep CLOUDFRONT_DISTRIBUTION_ID ~/.env.production 2>/dev/null | cut -d'=' -f2 || echo "")
if [ -n "$DISTRIBUTION_ID" ]; then
    echo "Distribution ID: $DISTRIBUTION_ID"
    echo "Manual check required: https://console.aws.amazon.com/cloudfront/"
else
    echo "CloudFront not configured"
fi

echo ""
echo "=== For detailed usage, check AWS Console ==="
echo "Free Tier Dashboard: https://console.aws.amazon.com/billing/home#/freetier"
```

**Run monitoring:**
```bash
chmod +x monitor-resources.sh
./monitor-resources.sh
```

### Application-Level Monitoring

**Install monitoring tools:**
```bash
# Install htop for system monitoring
sudo apt install -y htop

# Install docker stats for container monitoring
# (already included with Docker)

# Monitor system resources
htop

# Monitor Docker containers
docker stats

# Monitor disk usage
df -h

# Monitor S3 usage
aws s3 ls s3://YOUR_BUCKET --recursive --human-readable --summarize
```

**Create monitoring dashboard script:**
```bash
#!/bin/bash
# save as: dashboard.sh

watch -n 5 '
echo "=== Media Converter Dashboard ==="
echo ""
echo "--- System Resources ---"
free -h | grep -E "Mem|Swap"
echo ""
df -h | grep -E "/$|/tmp"
echo ""
echo "--- Docker Containers ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "--- Recent Logs ---"
docker logs media-converter-backend --tail 5 2>&1
echo ""
echo "--- Nginx Status ---"
systemctl status nginx | grep -E "Active|Memory|CPU"
'
```

**Run dashboard:**
```bash
chmod +x dashboard.sh
./dashboard.sh
```

---

## Auto-Scaling Options

### Note on Free Tier
Auto-scaling is **beyond the free tier** as it requires:
- Multiple EC2 instances (only 750 hours/month free = 1 instance)
- Application Load Balancer ($16+/month)
- CloudWatch detailed monitoring ($0.30/metric/month)

This section is for **future scaling** when you outgrow free tier.

### Architecture for Auto-Scaling

```
Internet
    |
    v
Application Load Balancer (ALB)
    |
    +-- Target Group
         |
         +-- EC2 Instance 1 (Auto Scaling Group)
         +-- EC2 Instance 2 (Auto Scaling Group)
         +-- EC2 Instance 3 (Auto Scaling Group)
              |
              v
         Shared Resources:
         - S3 (media storage)
         - RDS (database)
         - ElastiCache (Redis)
```

### Setting Up Auto-Scaling (Post-Free Tier)

#### 1. Create Launch Template

```bash
# Create launch template
aws ec2 create-launch-template \
    --launch-template-name media-converter-template \
    --version-description "v1" \
    --launch-template-data '{
        "ImageId": "ami-0c55b159cbfafe1f0",
        "InstanceType": "t3.small",
        "KeyName": "media-converter-key",
        "SecurityGroupIds": ["sg-xxxxx"],
        "UserData": "'"$(base64 -w0 user-data.sh)"'",
        "TagSpecifications": [{
            "ResourceType": "instance",
            "Tags": [{"Key":"Name","Value":"media-converter-asg"}]
        }]
    }'
```

#### 2. Create Auto Scaling Group

```bash
# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name media-converter-asg \
    --launch-template LaunchTemplateName=media-converter-template,Version='$Latest' \
    --min-size 1 \
    --max-size 5 \
    --desired-capacity 2 \
    --availability-zones us-east-1a us-east-1b \
    --target-group-arns arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/media-converter-tg/xxxxx \
    --health-check-type ELB \
    --health-check-grace-period 300
```

#### 3. Configure Scaling Policies

```bash
# Scale up when CPU > 70%
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name media-converter-asg \
    --policy-name scale-up \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "ASGAverageCPUUtilization"
        },
        "TargetValue": 70.0
    }'

# Scale based on request count
aws autoscaling put-scaling-policy \
    --auto-scaling-group-name media-converter-asg \
    --policy-name scale-requests \
    --policy-type TargetTrackingScaling \
    --target-tracking-configuration '{
        "PredefinedMetricSpecification": {
            "PredefinedMetricType": "ALBRequestCountPerTarget",
            "ResourceLabel": "app/media-converter-alb/xxxxx/targetgroup/media-converter-tg/xxxxx"
        },
        "TargetValue": 1000.0
    }'
```

### Cost Estimation for Auto-Scaling

**Minimum (2 instances):**
- 2x t3.small: $30/month
- ALB: $16/month
- RDS db.t3.micro: $13/month
- ElastiCache t3.micro: $12/month
- **Total: ~$71/month**

**Under load (5 instances):**
- 5x t3.small: $75/month
- ALB: $16/month + data processing
- RDS db.t3.small: $26/month
- ElastiCache t3.small: $24/month
- **Total: ~$141+/month**

---

## Backup and Disaster Recovery

### S3 Versioning and Lifecycle

Already configured in S3 setup. Verify:

```bash
# Check versioning status
aws s3api get-bucket-versioning --bucket $BUCKET_NAME

# List object versions
aws s3api list-object-versions --bucket $BUCKET_NAME --prefix "uploads/"
```

### EC2 Snapshots

#### Automated EBS Snapshot Script

```bash
#!/bin/bash
# save as: backup-ebs.sh

set -e

echo "=== Creating EBS Snapshot ==="

INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=media-converter" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text)

if [ "$INSTANCE_ID" = "None" ]; then
    echo "Error: No running instance found"
    exit 1
fi

VOLUME_ID=$(aws ec2 describe-volumes \
    --filters "Name=attachment.instance-id,Values=$INSTANCE_ID" \
    --query 'Volumes[0].VolumeId' \
    --output text)

echo "Instance ID: $INSTANCE_ID"
echo "Volume ID: $VOLUME_ID"

# Create snapshot
SNAPSHOT_ID=$(aws ec2 create-snapshot \
    --volume-id $VOLUME_ID \
    --description "Media Converter backup - $(date +%Y-%m-%d)" \
    --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=media-converter-backup-$(date +%Y%m%d)},{Key=Type,Value=automated}]" \
    --query 'SnapshotId' \
    --output text)

echo "Snapshot created: $SNAPSHOT_ID"

# Delete snapshots older than 7 days
echo "Cleaning up old snapshots..."
OLD_SNAPSHOTS=$(aws ec2 describe-snapshots \
    --owner-ids self \
    --filters "Name=tag:Type,Values=automated" \
    --query "Snapshots[?StartTime<='$(date -u -d '7 days ago' +%Y-%m-%d)'].SnapshotId" \
    --output text)

for snapshot in $OLD_SNAPSHOTS; do
    echo "Deleting old snapshot: $snapshot"
    aws ec2 delete-snapshot --snapshot-id $snapshot
done

echo "=== Backup complete ==="
```

**Schedule with cron:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/backup-ebs.sh >> /var/log/backup.log 2>&1
```

### Application Data Backup

```bash
#!/bin/bash
# save as: backup-app-data.sh

set -e

echo "=== Backing up application data ==="

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="media-converter-backup-$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Backup application files
echo "Backing up application files..."
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    -C /home/ubuntu/apps \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    media-converter/

# Backup environment file (encrypted)
echo "Backing up environment file..."
gpg --symmetric --cipher-algo AES256 \
    -o $BACKUP_DIR/env-$DATE.gpg \
    /home/ubuntu/apps/media-converter/.env.production

# Upload to S3
echo "Uploading to S3..."
aws s3 cp $BACKUP_DIR/$BACKUP_FILE s3://$BUCKET_NAME/backups/
aws s3 cp $BACKUP_DIR/env-$DATE.gpg s3://$BUCKET_NAME/backups/

# Delete local backups older than 3 days
echo "Cleaning up old local backups..."
find $BACKUP_DIR -name "media-converter-backup-*.tar.gz" -mtime +3 -delete
find $BACKUP_DIR -name "env-*.gpg" -mtime +3 -delete

echo "=== Backup complete ==="
echo "Backup file: $BACKUP_FILE"
```

**Schedule with cron:**
```bash
# Add to crontab
0 3 * * * /home/ubuntu/backup-app-data.sh >> /var/log/backup.log 2>&1
```

### Disaster Recovery Plan

#### Recovery Procedure

**1. From EBS Snapshot:**
```bash
# Create new volume from snapshot
NEW_VOLUME_ID=$(aws ec2 create-volume \
    --snapshot-id snap-xxxxx \
    --availability-zone us-east-1a \
    --volume-type gp3 \
    --query 'VolumeId' \
    --output text)

# Launch new instance with this volume
# Or attach to existing instance
aws ec2 attach-volume \
    --volume-id $NEW_VOLUME_ID \
    --instance-id i-xxxxx \
    --device /dev/sdf
```

**2. From Application Backup:**
```bash
# Download from S3
aws s3 cp s3://$BUCKET_NAME/backups/media-converter-backup-YYYYMMDD.tar.gz .

# Extract
tar -xzf media-converter-backup-YYYYMMDD.tar.gz -C ~/apps/

# Restore environment file
aws s3 cp s3://$BUCKET_NAME/backups/env-YYYYMMDD.gpg .
gpg -d env-YYYYMMDD.gpg > ~/apps/media-converter/.env.production

# Redeploy
cd ~/apps/media-converter
./deploy.sh
```

**3. Database Recovery (if using RDS):**
```bash
# Restore from automated snapshot
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier media-converter-db-restored \
    --db-snapshot-identifier rds:media-converter-db-YYYY-MM-DD-HH-MM

# Update connection string in .env.production
```

### Multi-Region Backup (Optional)

```bash
# Copy S3 bucket to another region
aws s3 sync s3://$BUCKET_NAME s3://$BUCKET_NAME-backup-eu --region eu-west-1

# Copy EBS snapshots to another region
aws ec2 copy-snapshot \
    --source-region us-east-1 \
    --source-snapshot-id snap-xxxxx \
    --destination-region eu-west-1 \
    --description "DR backup"
```

---

## Cost Estimation After Free Tier

### Monthly Cost Breakdown (After 12 Months)

#### Baseline Configuration (Single t2.micro)

**Compute:**
- EC2 t2.micro (1 vCPU, 1GB RAM): $8.50/month (730 hours × $0.0116/hour)
- Elastic IP (if instance stopped): $3.60/month (720 hours × $0.005/hour)

**Storage:**
- EBS 30GB gp3: $2.40/month (30GB × $0.08/GB)
- EBS Snapshots 30GB: $1.50/month (30GB × $0.05/GB)

**S3:**
- Storage first 50GB: $1.15/month (50GB × $0.023/GB)
- PUT requests: $0.05/month (10,000 × $0.005/1000)
- GET requests: $0.04/month (100,000 × $0.0004/1000)

**CloudFront:**
- Data transfer out 100GB: $8.50/month (100GB × $0.085/GB)
- Requests 1M: $0.075/month (1M × $0.0075/10000)

**Data Transfer:**
- EC2 to internet 10GB: $0.90/month (10GB × $0.09/GB)

**Total Baseline: ~$26.65/month**

---

#### Small-Medium Usage (10,000 conversions/month)

**Compute:**
- EC2 t3.small (2 vCPU, 2GB RAM): $15.18/month
- EBS 50GB gp3: $4.00/month

**Storage:**
- S3 storage 100GB: $2.30/month
- S3 requests: $0.50/month

**CloudFront:**
- Data transfer 200GB: $17.00/month
- Requests 2M: $0.15/month

**Data Transfer:**
- EC2 to internet 20GB: $1.80/month

**Total Small-Medium: ~$40.93/month**

---

#### High Usage (50,000 conversions/month)

**Compute:**
- EC2 t3.medium (2 vCPU, 4GB RAM): $30.37/month
- EBS 100GB gp3: $8.00/month

**Storage:**
- S3 storage 500GB: $11.50/month
- S3 requests: $2.50/month

**CloudFront:**
- Data transfer 1TB: $85.00/month
- Requests 10M: $0.75/month

**Data Transfer:**
- EC2 to internet 50GB: $4.50/month

**Database (RDS):**
- db.t3.small: $26.28/month

**Cache (ElastiCache):**
- cache.t3.micro: $12.41/month

**Total High Usage: ~$181.31/month**

---

### Cost Optimization Tips

#### 1. Use Spot Instances (up to 90% savings)
```bash
# Launch spot instance instead of on-demand
aws ec2 request-spot-instances \
    --spot-price "0.0035" \
    --instance-count 1 \
    --type "one-time" \
    --launch-specification '{...}'
```

**Savings:** $8.50 → $2.55/month (70% off)

#### 2. S3 Intelligent-Tiering
```bash
# Enable intelligent tiering
aws s3api put-bucket-intelligent-tiering-configuration \
    --bucket $BUCKET_NAME \
    --id intelligent-tiering \
    --intelligent-tiering-configuration '{
        "Id": "intelligent-tiering",
        "Status": "Enabled",
        "Tierings": [
            {"Days": 90, "AccessTier": "ARCHIVE_ACCESS"},
            {"Days": 180, "AccessTier": "DEEP_ARCHIVE_ACCESS"}
        ]
    }'
```

**Savings:** $0.023/GB → $0.0125/GB for infrequent access (45% off)

#### 3. CloudFront with S3 Transfer Acceleration
- Use CloudFront for all static assets
- Reduce direct S3 requests

**Savings:** Reduce S3 data transfer costs by 90%

#### 4. Reserved Instances (1-3 year commitment)
```bash
# Purchase reserved instance (1 year, no upfront)
aws ec2 purchase-reserved-instances-offering \
    --reserved-instances-offering-id xxxxx \
    --instance-count 1
```

**Savings:** t3.small $15.18 → $9.86/month (35% off)

#### 5. Delete Unused Resources
```bash
# Delete unused snapshots
aws ec2 describe-snapshots --owner-ids self --query 'Snapshots[?StartTime<=`2025-01-01`].SnapshotId' --output text | xargs -n1 aws ec2 delete-snapshot --snapshot-id

# Delete old S3 objects
aws s3 rm s3://$BUCKET_NAME/temp/ --recursive

# Delete unused Elastic IPs
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].AllocationId' --output text | xargs -n1 aws ec2 release-address --allocation-id
```

#### 6. Compress Data
```bash
# Enable S3 compression
# Use CloudFront compression
# Compress logs before storing
```

**Savings:** Reduce storage costs by 50-70%

#### 7. Use AWS Free Services
- CloudWatch (10 custom metrics free)
- Lambda (1M free requests/month)
- SNS (1M free publishes/month)
- SES (62,000 free emails/month when sending from EC2)

---

### Cost Monitoring and Alerts

#### Set Up Cost Explorer

```bash
# Enable Cost Explorer (one-time, free)
aws ce get-cost-and-usage \
    --time-period Start=2026-01-01,End=2026-01-31 \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=SERVICE
```

#### Create Budget

```bash
# Create monthly budget
aws budgets create-budget \
    --account-id YOUR_ACCOUNT_ID \
    --budget '{
        "BudgetName": "Monthly AWS Budget",
        "BudgetLimit": {
            "Amount": "50",
            "Unit": "USD"
        },
        "TimeUnit": "MONTHLY",
        "BudgetType": "COST"
    }' \
    --notifications-with-subscribers '[
        {
            "Notification": {
                "NotificationType": "ACTUAL",
                "ComparisonOperator": "GREATER_THAN",
                "Threshold": 80,
                "ThresholdType": "PERCENTAGE"
            },
            "Subscribers": [{
                "SubscriptionType": "EMAIL",
                "Address": "your-email@example.com"
            }]
        }
    ]'
```

#### Monthly Cost Report Script

```bash
#!/bin/bash
# save as: cost-report.sh

MONTH=$(date +%Y-%m)
START_DATE=$(date +%Y-%m-01)
END_DATE=$(date +%Y-%m-%d)

echo "=== AWS Cost Report for $MONTH ==="

aws ce get-cost-and-usage \
    --time-period Start=$START_DATE,End=$END_DATE \
    --granularity MONTHLY \
    --metrics BlendedCost UnblendedCost UsageQuantity \
    --group-by Type=SERVICE \
    --output table

echo ""
echo "=== Top 5 Services by Cost ==="

aws ce get-cost-and-usage \
    --time-period Start=$START_DATE,End=$END_DATE \
    --granularity MONTHLY \
    --metrics BlendedCost \
    --group-by Type=SERVICE \
    --query 'ResultsByTime[0].Groups | sort_by(@, &Metrics.BlendedCost.Amount) | reverse(@) | [0:5]' \
    --output table
```

---

## Quick Reference Commands

### Deployment Commands

```bash
# Full deployment
cd ~/apps/media-converter && git pull && ./deploy.sh

# View logs
docker logs -f media-converter-frontend
docker logs -f media-converter-backend

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Start services
docker compose -f docker-compose.prod.yml up -d
```

### Maintenance Commands

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Clean Docker
docker system prune -a --volumes

# Renew SSL
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx

# Check disk space
df -h

# Check memory
free -h

# Check running processes
htop
```

### Troubleshooting Commands

```bash
# Check container status
docker ps -a

# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t

# Check open ports
sudo netstat -tulpn | grep LISTEN

# Check firewall
sudo ufw status

# Test S3 connection
aws s3 ls s3://$BUCKET_NAME/

# Test API
curl https://yourdomain.com/api/health

# Check SSL certificate
sudo certbot certificates
```

---

## Conclusion

This comprehensive guide covers deploying your Media Converter application on AWS Free Tier with:

✅ **Free resources**: EC2 t2.micro (750 hrs), S3 (5GB), CloudFront (50GB)  
✅ **Production-ready**: Docker, Nginx, SSL, monitoring  
✅ **Scalable**: Auto-scaling options when ready  
✅ **Reliable**: Backups, disaster recovery  
✅ **Cost-effective**: ~$0/month (first year), ~$27/month after

### Next Steps

1. ✅ Complete EC2 setup and SSH access
2. ✅ Install Docker and deploy application
3. ✅ Configure Nginx and obtain SSL certificate
4. ✅ Set up S3 bucket and integrate with backend
5. ✅ Configure CloudFront CDN
6. ✅ Set up monitoring and alerts
7. ✅ Configure automated backups
8. Test thoroughly with real media files
9. Monitor usage and costs
10. Optimize as needed

### Support and Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **AWS Free Tier**: https://aws.amazon.com/free/
- **AWS Support**: https://console.aws.amazon.com/support/
- **Docker Documentation**: https://docs.docker.com/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/

### Troubleshooting

If you encounter issues:

1. Check logs: `docker logs`, `nginx error.log`
2. Verify environment variables
3. Test network connectivity
4. Review AWS service quotas
5. Check AWS service health: https://status.aws.amazon.com/

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Author**: Media Converter Team  
**AWS Pricing**: As of 2026 (subject to change)

