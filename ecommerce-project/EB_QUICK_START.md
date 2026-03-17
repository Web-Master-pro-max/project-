# AWS Elastic Beanstalk Quick Start Checklist

## Pre-Deployment (One-Time Setup)

- [ ] Install AWS EB CLI: `pip install awsebcli --upgrade --user`
- [ ] Configure AWS credentials: `aws configure`
- [ ] Create MySQL RDS instance on AWS (8.0, db.t3.micro for free tier)
- [ ] Note RDS endpoint, username, and password
- [ ] Run `eb init -p "Node.js 20 running on 64bit Amazon Linux 2" ecommerce-project`

## Deployment Steps

1. **Create Environment** (First time only)
   ```bash
   eb create ecommerce-prod --instance-type t2.small
   ```

2. **Set Database Variables**
   ```bash
   eb setenv DB_HOST=your-rds-endpoint.rds.amazonaws.com \
             DB_USER=admin \
             DB_PASSWORD=your-password \
             DB_NAME=ecommerce_prod \
             DB_PORT=3306 \
             SESSION_SECRET=your-secret \
             JWT_SECRET=your-jwt-secret
   ```

3. **Deploy Application**
   ```bash
   eb deploy
   ```

4. **Initialize Database** (First time only)
   ```bash
   eb ssh
   cd /var/app/current
   npm run seed:admin
   npm run seed
   ```

5. **Open Application**
   ```bash
   eb open
   ```

## Daily Development Commands

| Command | Purpose |
|---------|---------|
| `eb deploy` | Deploy latest changes |
| `eb status` | Check deployment status |
| `eb health` | Monitor instance health |
| `eb logs --stream` | Watch real-time logs |
| `eb open` | Open app in browser |
| `eb ssh` | SSH into instance |
| `eb setenv KEY=value` | Update environment variable |
| `eb config` | Edit environment configuration |

## Useful Shortcuts

```bash
# Quick deployment with logs
eb deploy && eb logs --stream

# View all environment variables
eb printenv

# Scale to 2 instances
eb scale 2

# Check what will be deployed
git status
```

## Environment Variables to Set

- `DB_HOST` - RDS endpoint
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `DB_PORT` - Usually 3306
- `NODE_ENV` - Set to "production"
- `SESSION_SECRET` - Random string for sessions
- `JWT_SECRET` - Random string for JWT

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Run `npm install` and commit package-lock.json |
| Database connection failed | Check RDS security group allows inbound on 3306 |
| Deploy hangs | Check `eb logs --stream` for errors |
| "Invalid status" on orders | Status should be lowercase (fixed in v1.1) |
| File uploads not working | Check upload directory permissions (configured in 04_storage.config) |
| Sessions timing out | Check SESSION_SECRET and cookie settings |

## Important Files

- `.elasticbeanstalk/config.yml` - EB configuration
- `.ebextensions/` - Application-specific settings
- `package.json` - Dependencies and start script
- `.env` - DO NOT commit (use `eb setenv` instead)

## Next Steps

1. Create AWS account (free tier available)
2. Follow "Deployment Steps" above
3. Monitor with `eb health --refresh`
4. Set up CloudWatch monitoring in AWS Console
5. Consider adding SSL certificate through AWS ACM

---
**Need help?** See ELASTIC_BEANSTALK_GUIDE.md for detailed instructions
