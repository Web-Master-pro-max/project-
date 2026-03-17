# AWS Elastic Beanstalk Deployment Guide

## Overview
This guide explains how to deploy the ShopHub e-commerce platform to AWS Elastic Beanstalk.

## Prerequisites
1. **AWS Account** - with appropriate permissions
2. **AWS EB CLI** - installed and configured
3. **Git** - for version control
4. **Node.js** - locally installed (v20+)
5. **AWS Credentials** - configured on your machine

## Installation & Setup

### 1. Install Elastic Beanstalk CLI

#### Windows (PowerShell):
```powershell
pip install awsebcli --upgrade --user
```

#### macOS/Linux:
```bash
pip install awsebcli --upgrade
```

Verify installation:
```bash
eb --version
```

### 2. Configure AWS Credentials

If not already configured:
```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-east-1`)
- Default output format: `json`

### 3. Initialize Elastic Beanstalk

In the project root directory:
```bash
eb init -p "Node.js 20 running on 64bit Amazon Linux 2" ecommerce-project
```

### 4. Set Up Database (RDS MySQL)

#### Option A: Create RDS Instance First (Recommended)
```bash
# AWS Console → RDS → Create Database
# - Engine: MySQL 8.0
# - Instance: db.t3.micro (free tier eligible)
# - Storage: 20 GB
# - Multi-AZ: No (for dev/test)
# - Publicly accessible: Yes (for testing)
```

#### Option B: Let Elastic Beanstalk Create It
Current configuration uses external RDS. Ensure your DB is running before deployment.

### 5. Create Elastic Beanstalk Environment

#### For Production:
```bash
eb create ecommerce-prod --instance-type t2.small --envvars NODE_ENV=production,PORT=3000
```

#### For Development:
```bash
eb create ecommerce-dev --instance-type t2.micro --envvars NODE_ENV=development,PORT=3000
```

### 6. Set Environment Variables

After environment creation, add database credentials:
```bash
eb setenv DB_HOST=your-rds-endpoint.rds.amazonaws.com \
           DB_USER=admin \
           DB_PASSWORD=your-secure-password \
           DB_NAME=ecommerce_prod \
           DB_PORT=3306 \
           SESSION_SECRET=your-random-secret-key \
           JWT_SECRET=your-jwt-secret-key
```

Or through AWS Console:
- EB Dashboard → Configuration → Environment Properties → Add variables

### 7. Prepare .env File for Deployment

Create `.env.production`:
```
NODE_ENV=production
PORT=3000
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-password
DB_NAME=ecommerce_prod
DB_PORT=3306
SESSION_SECRET=your-random-session-secret
JWT_SECRET=your-jwt-secret
```

**Important**: Do NOT commit `.env` files to Git. Use EB environment variables instead.

### 8. Deploy to Elastic Beanstalk

#### First Deployment:
```bash
eb deploy ecommerce-prod
```

#### Subsequent Deployments:
```bash
eb deploy
```

Watch deployment logs:
```bash
eb logs
```

Real-time logs:
```bash
eb logs --stream
```

### 9. Verify Deployment

Get application URL:
```bash
eb open
```

This opens your application in the default browser.

Check environment health:
```bash
eb health
```

## Configuration Files Explained

### `.elasticbeanstalk/config.yml`
- Main Elastic Beanstalk configuration
- Environment and branch mappings
- Platform selection

### `.ebextensions/` Directory
- **01_node.config**: Node.js runtime settings
- **02_environment.config**: Autoscaling and deployment policies
- **03_https.config**: Load balancer configuration
- **04_storage.config**: Upload directory setup
- **05_database.config**: Database connection notes

## Common EB Commands

```bash
# Environment Management
eb create <env-name>          # Create new environment
eb terminate <env-name>       # Delete environment
eb list                       # List all environments
eb use ecommerce-prod         # Switch active environment

# Deployment & Status
eb deploy                     # Deploy current branch
eb deploy --staged            # Deploy without committing
eb status                     # Check EB status
eb health                     # Monitor environment health
eb logs                       # View deployment logs

# Configuration
eb setenv KEY=value           # Set environment variables
eb printenv                   # Print environment variables
eb scale 3                    # Scale to 3 instances
eb open                       # Open app in browser

# SSH Access
eb ssh                        # SSH into instance
eb init                       # Initialize/reinitialize

# Cleanup
eb terminate <env-name>       # Delete environment
```

## Troubleshooting

### Deployment Fails with "Cannot find module"
- **Cause**: Dependencies not installed
- **Fix**: `npm install` and commit package-lock.json before deployment

### "Invalid status" Error on Order Update
- **Cause**: Status format mismatch (uppercase vs lowercase)
- **Fix**: Already fixed in code - uses lowercase status values

### Database Connection Error
- **Cause**: Invalid credentials or RDS not accessible
- **Fix**: 
  ```bash
  eb setenv DB_HOST=correct-endpoint DB_USER=user DB_PASSWORD=pass
  ```

### File Upload Issues
- **Cause**: Permissions on upload directories
- **Fix**: Upload directories created in `.ebextensions/04_storage.config`

### Session Timeout in Production
- **Cause**: Sticky sessions not configured
- **Fix**: Already configured in `03_https.config` with LB cookie duration

## Database Migration

Before first deployment, initialize database:

```bash
# SSH into instance
eb ssh

# In the instance, run:
cd /var/app/current
npm run seed:admin     # Create admin user
npm run seed           # Seed products
```

Or run database setup:
```bash
eb ssh
cd /var/app/current
node resetDatabase.js
```

## SSL/TLS Certificate Setup

To enable HTTPS:

1. Use AWS Certificate Manager (ACM)
2. Request free SSL certificate
3. In EB Console: Configuration → Load Balancer → Add HTTPS listener
4. Attach ACM certificate

## Monitoring & Logging

### CloudWatch Logs
- EB automatically uploads logs to CloudWatch
- View in AWS Console → CloudWatch → Logs

### Application Monitoring
```bash
eb health --refresh        # Real-time health monitoring
eb logs --all              # Download all logs
```

## Auto-Scaling

Current settings (in `.ebextensions/02_environment.config`):
- **Min Instances**: 2
- **Max Instances**: 6
- **Scale Trigger**: CPU > 70% (default)

Modify in EB Console or configuration files.

## Cost Optimization

For development/testing:
```bash
# Use smaller instance type
eb scale 1              # Single instance
eb config               # Edit config → change t2.small to t2.micro
```

## Rollback

If deployment fails or has issues:
```bash
eb abort                # Abort in-progress deployment
eb swap --destination_name old-env-name  # Swap to previous version
```

## Cleanup & Termination

```bash
# Terminate environment
eb terminate ecommerce-prod

# Terminate and keep RDS
# (Manually delete RDS in AWS Console if needed)
```

## Additional Resources

- [AWS EB Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [Node.js on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-nodejs.html)
- [EB CLI Reference](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html)
