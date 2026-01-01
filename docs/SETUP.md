# Development Setup Guide

## Quick Start

### Local Development (Localhost)
```bash
# Start all services
docker compose -f compose.dev.yaml up --build

# Access at:
# - Frontend: http://localhost:3001
# - Backend API: http://localhost:8001
```

### VM Development (Access from Network)
```bash
# 1. Update .env.dev with your VM IP
HOST=YOUR_VM_IP  # e.g., 192.168.1.100

# 2. Start services
docker compose -f compose.dev.yaml up --build

# 3. Access from any device on your network:
# - Frontend: http://YOUR_VM_IP:3001
# - Backend API: http://YOUR_VM_IP:8001
```

## Environment Configuration

Both `.env.dev` and `.env.prod` use a **single source of truth** approach:

### Development (.env.dev)
```bash
# Change only this line:
HOST=localhost  # or your VM IP

# Ports
FRONTEND_PORT=3001
BACKEND_PORT=8001

# Everything else derives automatically
FRONTEND_URL=http://${HOST}:${FRONTEND_PORT}
NEXT_PUBLIC_BACKEND_URL=http://${HOST}:${BACKEND_PORT}
```

### Production (.env.prod)
```bash
# Change only this line:
DOMAIN=n0tv1cky.com

# Ports
FRONTEND_PORT=3000
BACKEND_PORT=8000

# Everything else derives automatically
FRONTEND_URL=https://${DOMAIN}
NEXT_PUBLIC_BACKEND_URL=https://${DOMAIN}/api
```

## Find Your VM IP
```bash
hostname -I | awk '{print $1}'
```

## Firewall Setup (If Needed)
```bash
sudo ufw allow 3001/tcp
sudo ufw allow 8001/tcp
```

## What's Different in VM Mode?

### Backend (FastAPI)
- Binds to `0.0.0.0:8000` (accepts all connections)
- CORS configured from `CORS_ORIGINS` env variable

### Frontend (Next.js)
- Binds to `0.0.0.0:3000` via `next dev -H 0.0.0.0`
- Reads `NEXT_PUBLIC_BACKEND_URL` from environment
- Image optimization configured for VM access

## Docker Commands

```bash
# View logs
docker compose -f compose.dev.yaml logs -f

# Restart specific service
docker compose -f compose.dev.yaml restart frontend

# Stop all services
docker compose -f compose.dev.yaml down

# Remove volumes (clean slate)
docker compose -f compose.dev.yaml down -v
```

## Troubleshooting

### Can't access from other devices
1. Check firewall: `sudo ufw status`
2. Verify HOST in `.env.dev` matches your VM IP
3. Ensure ports 3001 and 8001 are open

### Frontend can't reach backend
1. Check `NEXT_PUBLIC_BACKEND_URL` in `.env.dev`
2. Verify backend is running: `docker compose -f compose.dev.yaml ps`
3. Test backend directly: `curl http://YOUR_VM_IP:8001/api/blogs`

### Database connection issues
1. Ensure `.env.dev` has correct `DATABASE_URL`
2. Check postgres container: `docker compose -f compose.dev.yaml logs postgres`
3. Recreate database: `docker compose -f compose.dev.yaml down -v && docker compose -f compose.dev.yaml up`
