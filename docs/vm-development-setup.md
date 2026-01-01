# VM Development Setup Guide

This guide explains how to run the development environment on a VM and access it from your host machine or other devices on the network.

## Quick Setup

### 1. Copy the environment template

```bash
cp .env.dev.example .env.dev
```

### 2. Update .env.dev with your VM's IP address

If your VM's IP is `192.168.1.100`, update these lines in `.env.dev`:

```bash
# Change these from localhost to your VM IP
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.100:8000
NEXT_PUBLIC_FRONTEND_URL=http://192.168.1.100:3000

# Optional: Update domain name
DOMAIN_NAME=192.168.1.100
```

### 3. Start the development environment

```bash
docker compose -f compose.dev.yaml up --build
```

### 4. Access from your host machine

- Frontend: `http://192.168.1.100:3000`
- Backend API: `http://192.168.1.100:8000`
- API Docs: `http://192.168.1.100:8000/docs`

## Configuration Details

### Backend (FastAPI)

The backend is already configured to:
- Bind to `0.0.0.0:8000` (accepts connections from any IP)
- Allow CORS from all origins in development (`CORS_ORIGINS=*`)
- Handle Private Network Access headers for cross-origin requests

### Frontend (Next.js)

The frontend dev server now:
- Binds to `0.0.0.0:3000` via `next dev -H 0.0.0.0`
- Accepts connections from any hostname
- Uses `NEXT_PUBLIC_BACKEND_URL` environment variable for API calls

### Firewall Configuration

Make sure your VM firewall allows incoming connections:

```bash
# Ubuntu/Debian with ufw
sudo ufw allow 3000/tcp comment "Next.js dev"
sudo ufw allow 8000/tcp comment "FastAPI dev"

# RHEL/CentOS with firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

## Finding Your VM's IP Address

```bash
# Linux
ip addr show | grep "inet " | grep -v 127.0.0.1

# Or
hostname -I | awk '{print $1}'

# macOS
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## Troubleshooting

### Can't connect from host machine

1. **Check VM IP**: Ensure you're using the correct IP address
   ```bash
   hostname -I
   ```

2. **Check firewall**: Ensure ports 3000 and 8000 are open
   ```bash
   sudo ufw status
   ```

3. **Test connectivity**: Ping the VM from your host
   ```bash
   ping 192.168.1.100
   ```

4. **Check services are running**:
   ```bash
   docker compose -f compose.dev.yaml ps
   ```

### CORS errors

If you see CORS errors in the browser console:

1. Verify `CORS_ORIGINS=*` in `.env.dev`
2. Check that `NEXT_PUBLIC_BACKEND_URL` matches your VM IP
3. Restart the containers:
   ```bash
   docker compose -f compose.dev.yaml down
   docker compose -f compose.dev.yaml up
   ```

### Images not loading

Make sure the backend URL in `.env.dev` is correct:
```bash
NEXT_PUBLIC_BACKEND_URL=http://YOUR_VM_IP:8000
```

The frontend uses this to construct image URLs.

## Switching Between Localhost and VM

### For localhost development:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

### For VM development:
```bash
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.100:8000
NEXT_PUBLIC_FRONTEND_URL=http://192.168.1.100:3000
```

Just update `.env.dev` and restart:
```bash
docker compose -f compose.dev.yaml restart
```

## Mobile/Tablet Testing

To test on mobile devices on the same network:

1. Find your VM's IP: `hostname -I`
2. Open `http://YOUR_VM_IP:3000` on your mobile browser
3. Ensure the VM firewall allows connections from your network

## Production Deployment

For production, use the production configuration:
- Edit `.env.prod` instead
- Use proper domain names instead of IP addresses
- Run: `docker compose -f compose.prod.yaml up -d`

See the main README.md for production deployment details.
