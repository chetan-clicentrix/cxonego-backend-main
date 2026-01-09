# CI/CD Pipeline Documentation

## Overview

This document describes the optimized CI/CD pipeline for the CxOneGo Backend application. The pipeline is designed to build code on GitHub Actions and deploy only the compiled build artifacts to your production server.

## Key Features

✅ **Production Branch Only** - Deploys only when code is pushed to the `production` branch  
✅ **Build on GitHub** - TypeScript compilation happens on GitHub Actions, not on your server  
✅ **Minimal Deployment** - Only necessary files are transferred (build/, node_modules/, package.json, ecosystem.config.js)  
✅ **PM2 Cluster Mode** - Uses all available CPU cores for better performance  
✅ **Zero Downtime** - Graceful reload ensures no downtime during deployments  
✅ **Health Checks** - Automatic verification after deployment  
✅ **Optimized Caching** - Faster builds with dependency caching  

---

## Pipeline Workflow

### 1. **Trigger**
- Push to `production` branch
- Manual trigger via GitHub Actions UI

### 2. **Build Phase (GitHub Actions)**
1. Checkout code
2. Setup Node.js 18
3. Cache dependencies
4. Install dependencies
5. Build TypeScript project
6. Create deployment package
7. Install production dependencies only

### 3. **Deploy Phase**
1. Transfer files to server via rsync
2. Restart application with PM2
3. Verify deployment health

---

## Directory Structure

### On GitHub Actions Runner:
```
.
├── build/                    # Compiled TypeScript
├── deploy-package/          # Created during build
│   ├── build/              # Compiled code
│   ├── node_modules/       # Production dependencies only
│   ├── package.json
│   ├── package-lock.json
│   └── ecosystem.config.js
```

### On Production Server:
```
/root/cxonego/cxonego-backend-main/
├── build/                   # Compiled JavaScript
├── node_modules/           # Production dependencies
├── logs/                   # PM2 logs (auto-created)
├── package.json
├── package-lock.json
├── ecosystem.config.js
└── .env                    # Your environment variables (not deployed)
```

---

## Required GitHub Secrets

Configure these secrets in your GitHub repository:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `HOST` | Your server IP address or domain | `123.45.67.89` |
| `SSH` | Private SSH key for root user | `-----BEGIN RSA PRIVATE KEY-----...` |

### Setting Up Secrets:
1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add `HOST` and `SSH` secrets

---

## PM2 Configuration

### Cluster Mode
The application runs in **cluster mode** with `instances: "max"`, which:
- Uses all available CPU cores
- Provides automatic load balancing
- Increases fault tolerance
- Improves performance under load

### Key PM2 Features:
- **Graceful Reload**: Zero-downtime deployments
- **Auto Restart**: Automatic restart on crashes
- **Memory Limit**: Restart if memory exceeds 1GB
- **Log Rotation**: Organized logging with timestamps
- **Health Monitoring**: Tracks uptime and restarts

### PM2 Commands on Server:

```bash
# View application status
pm2 list

# View logs
pm2 logs cxonego-backend-main

# View detailed info
pm2 describe cxonego-backend-main

# Monitor in real-time
pm2 monit

# Restart application
pm2 restart cxonego-backend-main

# Stop application
pm2 stop cxonego-backend-main

# View PM2 startup script
pm2 startup

# Save current PM2 process list
pm2 save
```

---

## Deployment Process

### Automatic Deployment:

1. **Merge/Push to Production Branch**:
   ```bash
   git checkout production
   git merge main
   git push origin production
   ```

2. **GitHub Actions automatically**:
   - Builds the TypeScript code
   - Installs production dependencies
   - Deploys to `/root/cxonego/cxonego-backend-main`
   - Restarts PM2 with zero downtime

### Manual Deployment:

1. Go to **Actions** tab in GitHub
2. Select **Optimized CI/CD Pipeline - Production Deployment**
3. Click **Run workflow**
4. Select `production` branch
5. Click **Run workflow**

---

## Server Setup (One-Time)

### 1. Install Node.js and PM2:
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Setup PM2 to start on system boot
pm2 startup
pm2 save
```

### 2. Create Project Directory:
```bash
mkdir -p /root/cxonego/cxonego-backend-main
cd /root/cxonego/cxonego-backend-main
```

### 3. Create .env File:
```bash
nano /root/cxonego/cxonego-backend-main/.env
```

Add your environment variables:
```env
NODE_ENV=production
PORT=3000
DATABASE_HOST=your-db-host
DATABASE_USER=your-db-user
DATABASE_PASSWORD=your-db-password
# ... other environment variables
```

### 4. Create Logs Directory:
```bash
mkdir -p /root/cxonego/cxonego-backend-main/logs
```

### 5. Install PM2 Log Rotation (Optional but Recommended):
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Optimization Features

### 1. **Build Optimization**
- Builds on GitHub Actions (faster, more powerful)
- Caches dependencies between builds
- Only production dependencies deployed

### 2. **Transfer Optimization**
- rsync with compression (`-z` flag)
- Excludes unnecessary files (.git, .env, logs)
- Delta transfer (only changed files)

### 3. **Runtime Optimization**
- Cluster mode for multi-core utilization
- Memory limits prevent memory leaks
- Graceful shutdown/restart
- Exponential backoff for restart delays

### 4. **Monitoring & Logging**
- Timestamped logs
- Separate error and output logs
- Log rotation to prevent disk space issues
- Health checks after deployment

---

## Troubleshooting

### Deployment Fails

**Check GitHub Actions logs**:
1. Go to **Actions** tab
2. Click on the failed workflow
3. Review the step that failed

**Common issues**:
- SSH key not configured correctly
- Server not accessible
- Insufficient disk space on server

### Application Not Starting

**Check PM2 logs**:
```bash
pm2 logs cxonego-backend-main --lines 100
```

**Check PM2 status**:
```bash
pm2 describe cxonego-backend-main
```

**Common issues**:
- Missing .env file
- Database connection issues
- Port already in use
- Missing dependencies

### High Memory Usage

**Check memory usage**:
```bash
pm2 monit
```

**Adjust memory limit** in `ecosystem.config.js`:
```javascript
max_memory_restart: "2G", // Increase to 2GB
```

### Logs Growing Too Large

**Install log rotation**:
```bash
pm2 install pm2-logrotate
```

**Configure rotation**:
```bash
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
```

---

## Performance Monitoring

### PM2 Plus (Optional)
For advanced monitoring, consider PM2 Plus:

```bash
pm2 link <secret_key> <public_key>
```

Features:
- Real-time monitoring
- Exception tracking
- Custom metrics
- Alerts and notifications

---

## Rollback Strategy

If a deployment fails:

### 1. **Quick Rollback**:
```bash
# On server
cd /root/cxonego/cxonego-backend-main
pm2 restart cxonego-backend-main
```

### 2. **Revert to Previous Version**:
```bash
# On local machine
git revert HEAD
git push origin production
```

### 3. **Manual Rollback**:
Keep a backup of the previous build:
```bash
# Before deployment
cp -r /root/cxonego/cxonego-backend-main /root/cxonego/cxonego-backend-main.backup

# To rollback
rm -rf /root/cxonego/cxonego-backend-main
mv /root/cxonego/cxonego-backend-main.backup /root/cxonego/cxonego-backend-main
pm2 restart cxonego-backend-main
```

---

## Best Practices

1. **Always test on staging** before pushing to production
2. **Monitor logs** after deployment
3. **Keep .env secure** - never commit to git
4. **Regular backups** of database and .env file
5. **Update dependencies** regularly
6. **Monitor server resources** (CPU, memory, disk)
7. **Set up alerts** for application downtime
8. **Document environment variables** in .env.example

---

## Security Considerations

1. **SSH Key**: Keep your SSH private key secure
2. **Environment Variables**: Never expose in logs or code
3. **Server Access**: Limit SSH access to specific IPs if possible
4. **Dependencies**: Regularly update to patch vulnerabilities
5. **Logs**: Don't log sensitive information
6. **Firewall**: Configure firewall rules appropriately

---

## Next Steps

1. ✅ Update GitHub secrets (HOST, SSH)
2. ✅ Create production branch
3. ✅ Setup server environment (.env file)
4. ✅ Test deployment
5. ✅ Monitor first deployment
6. ✅ Set up PM2 log rotation
7. ✅ Configure monitoring/alerts

---

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Check PM2 logs on server
3. Review this documentation
4. Check PM2 documentation: https://pm2.keymetrics.io/

---

**Last Updated**: 2026-01-09
**Version**: 1.0.0
