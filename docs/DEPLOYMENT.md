# Production Deployment Guide

## Prerequisites
- Ubuntu/Debian server with Docker installed
- Domain name pointing to your server
- SSL certificates (Let's Encrypt recommended)

## Deployment Steps

### 1. Configure Environment
Edit `.env.prod` and set your domain:
```bash
DOMAIN=yourdomain.com
ADMIN_PASSWORD=your_secure_password_here
ADMIN_TOKEN=your_secure_token_here
JWT_SECRET=your_jwt_secret_here
```

### 2. Start Services
```bash
docker compose -f compose.prod.yaml up -d
```

### 3. Verify Deployment
```bash
# Check all containers are running
docker compose -f compose.prod.yaml ps

# View logs
docker compose -f compose.prod.yaml logs -f
```

## Nginx Reverse Proxy Setup

### Host Installation (Ubuntu)

1. Run the setup script:
```bash
sudo services/nginx/setup-host-nginx.sh --domain yourdomain.com --cert
```

This will:
- Install nginx
- Deploy HTTP-only config
- Request SSL certificates via Certbot
- Enable HTTPS config
- Set up automatic renewal

2. Manage nginx:
```bash
# Check status
sudo services/nginx/hostctl.sh status

# Reload config
sudo services/nginx/hostctl.sh reload

# View logs
sudo services/nginx/hostctl.sh logs
```

### Manual Nginx Setup

If you prefer manual configuration:

1. Copy nginx config:
```bash
sudo cp services/nginx/conf.d/default.conf /etc/nginx/sites-available/blog
sudo ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/
```

2. Request SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. Reload nginx:
```bash
sudo systemctl reload nginx
```

## SSL Certificate Renewal

Automated renewal is set up via systemd timer:
```bash
# Check renewal status
systemctl status certbot-renew.timer

# Test renewal
sudo certbot renew --dry-run
```

## Monitoring

### View Logs
```bash
# All services
docker compose -f compose.prod.yaml logs -f

# Specific service
docker compose -f compose.prod.yaml logs -f backend
```

### Check Health
```bash
# Backend health
curl https://yourdomain.com/api/health

# Frontend
curl https://yourdomain.com
```

## Backups

### Database Backup
```bash
# Create backup
docker compose -f compose.prod.yaml exec postgres pg_dump -U produser blogdb > backup_$(date +%Y%m%d).sql

# Restore backup
docker compose -f compose.prod.yaml exec -T postgres psql -U produser blogdb < backup.sql
```

### Markdown Files
Markdown files in `./blogs` are version-controlled via git:
```bash
# Commit changes
git add blogs/
git commit -m "Backup blogs"
git push
```

## Updating

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f compose.prod.yaml up -d --build
```

### Update Dependencies
```bash
# Backend
docker compose -f compose.prod.yaml exec backend pip install -r requirements.txt

# Frontend
docker compose -f compose.prod.yaml exec frontend npm install
```

## Security Checklist

- [ ] Strong `ADMIN_PASSWORD` set in `.env.prod`
- [ ] `JWT_SECRET` is randomly generated and kept secret
- [ ] `CORS_ORIGINS` is restricted to your domain only
- [ ] SSL certificates are valid and auto-renewing
- [ ] Database password is strong and unique
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] Regular backups scheduled
- [ ] Git repository with blogs is private or properly secured

## Troubleshooting

### 502 Bad Gateway
- Check backend is running: `docker compose -f compose.prod.yaml ps`
- Check nginx config: `sudo nginx -t`
- View backend logs: `docker compose -f compose.prod.yaml logs backend`

### SSL Certificate Issues
- Verify domain points to server: `dig yourdomain.com`
- Check certificate expiry: `sudo certbot certificates`
- Renew manually: `sudo certbot renew`

### Database Connection Errors
- Check postgres container: `docker compose -f compose.prod.yaml logs postgres`
- Verify `DATABASE_URL` in `.env.prod`
- Check database exists: `docker compose -f compose.prod.yaml exec postgres psql -U produser -l`
