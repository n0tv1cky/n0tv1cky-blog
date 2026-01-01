# Quick Reference: VM Development Setup

## TL;DR

```bash
# 1. Run the setup script
./scripts/setup-vm-dev.sh

# 2. Start development
docker compose -f compose.dev.yaml up --build

# 3. Access from any device on your network
# http://YOUR_VM_IP:3000
```

## Manual Configuration (Alternative)

Edit `.env.dev` and change these two lines:

```bash
NEXT_PUBLIC_BACKEND_URL=http://YOUR_VM_IP:8000
NEXT_PUBLIC_FRONTEND_URL=http://YOUR_VM_IP:3000
```

Replace `YOUR_VM_IP` with your actual VM IP address.

## Find Your VM IP

```bash
hostname -I | awk '{print $1}'
```

## Firewall Setup (If Needed)

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp
```

## What Changed?

### Backend (FastAPI)
- Already binds to `0.0.0.0:8000` (accepts all connections)
- CORS allows all origins in dev mode

### Frontend (Next.js)
- Now binds to `0.0.0.0:3000` via `next dev -H 0.0.0.0`
- Reads `NEXT_PUBLIC_BACKEND_URL` from environment

### Configuration
- `compose.dev.yaml` uses environment variables
- `.env.dev` controls the URLs
- Images accept any hostname in dev mode

## Switching Back to Localhost

```bash
# Edit .env.dev
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Restart
docker compose -f compose.dev.yaml restart
```

## Testing from Mobile

1. Find VM IP: `hostname -I`
2. Open mobile browser
3. Navigate to: `http://VM_IP:3000`
4. Ensure VM firewall allows connections

## Troubleshooting

### Can't connect from host

1. Check VM IP: `hostname -I`
2. Test ping: `ping YOUR_VM_IP`
3. Check firewall: `sudo ufw status`
4. Verify containers: `docker compose -f compose.dev.yaml ps`

### CORS errors

1. Check `.env.dev` has `CORS_ORIGINS=*`
2. Verify `NEXT_PUBLIC_BACKEND_URL` is correct
3. Restart containers

### Images not loading

Verify backend URL in `.env.dev`:
```bash
NEXT_PUBLIC_BACKEND_URL=http://YOUR_VM_IP:8000
```

## More Details

See [docs/vm-development-setup.md](vm-development-setup.md) for comprehensive documentation.
