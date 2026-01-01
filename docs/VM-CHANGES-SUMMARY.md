# VM Development - Changes Summary

## What Was Changed

### 1. Frontend Configuration (`services/frontend/package.json`)
```json
"scripts": {
  "dev": "next dev -H 0.0.0.0",  // Changed from "next dev"
}
```
- Next.js dev server now binds to `0.0.0.0` instead of `127.0.0.1`
- Accepts connections from any IP address

### 2. Next.js Image Configuration (`services/frontend/next.config.js`)
```javascript
images: {
  remotePatterns: [
    { protocol: 'http', hostname: '**' }, // Allow any hostname in dev
  ],
}
```
- Changed from `domains` array to `remotePatterns`
- Allows images from any hostname (useful for VM IPs)

### 3. Docker Compose Configuration (`compose.dev.yaml`)
```yaml
environment:
  NEXT_PUBLIC_BACKEND_URL: ${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8000}
```
- Uses environment variable instead of hardcoded `http://localhost:8000`
- Falls back to localhost if not set

### 4. Environment File (`.env.dev`)
```bash
# New variables added
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=*

# Updated variable
DATABASE_URL=postgresql://bloguser:blogpass@postgres:5432/blogdb  # Fixed container name
```

### 5. Backend Configuration (`services/backend/app/main.py`)
- Already configured correctly:
  - Binds to `0.0.0.0:8000` ✓
  - CORS allows `*` in development ✓
  - Handles Private Network Access headers ✓

## New Files Created

1. **`.env.dev.example`** - Template for environment variables
2. **`docs/vm-development-setup.md`** - Comprehensive VM setup guide
3. **`docs/QUICK-START-VM.md`** - Quick reference card
4. **`scripts/setup-vm-dev.sh`** - Automated setup script

## How It Works

### Before (localhost only)
```
Browser → http://localhost:3000 → Next.js on 127.0.0.1
       ↓
       → http://localhost:8000 → FastAPI on 127.0.0.1
```

### After (VM accessible)
```
Browser → http://192.168.1.100:3000 → Next.js on 0.0.0.0:3000
       ↓
       → http://192.168.1.100:8000 → FastAPI on 0.0.0.0:8000
```

## Usage

### Option 1: Automated Setup (Recommended)
```bash
./scripts/setup-vm-dev.sh
docker compose -f compose.dev.yaml up --build
```

### Option 2: Manual Configuration
```bash
# Edit .env.dev
NEXT_PUBLIC_BACKEND_URL=http://YOUR_VM_IP:8000
NEXT_PUBLIC_FRONTEND_URL=http://YOUR_VM_IP:3000

# Start
docker compose -f compose.dev.yaml up --build
```

### Option 3: Keep Using Localhost
No changes needed - still works with localhost by default!

## Backward Compatibility

✅ **100% backward compatible**
- If you don't change `.env.dev`, everything works as before with localhost
- The fallback to `http://localhost:8000` is still in place
- No breaking changes to existing workflows

## Security Considerations

### Development
- CORS set to `*` (allow all origins)
- Firewall should be configured to restrict access if needed
- Use only on trusted networks

### Production
- Production config (`.env.prod`) unchanged
- Still uses proper domain names and HTTPS
- CORS properly configured for production domain

## Testing

### Test Local Access
```bash
curl http://localhost:3000
curl http://localhost:8000/docs
```

### Test VM Access (from another machine)
```bash
curl http://192.168.1.100:3000
curl http://192.168.1.100:8000/docs
```

### Test from Mobile
Open mobile browser: `http://YOUR_VM_IP:3000`

## Troubleshooting

### Issue: Can't connect from host machine
**Solution:**
1. Check firewall: `sudo ufw allow 3000/tcp && sudo ufw allow 8000/tcp`
2. Verify VM IP: `hostname -I`
3. Test ping: `ping YOUR_VM_IP`

### Issue: CORS errors in browser
**Solution:**
1. Verify `.env.dev` has `CORS_ORIGINS=*`
2. Check `NEXT_PUBLIC_BACKEND_URL` matches your VM IP
3. Restart containers: `docker compose -f compose.dev.yaml restart`

### Issue: Images not loading
**Solution:**
Verify in `.env.dev`:
```bash
NEXT_PUBLIC_BACKEND_URL=http://YOUR_VM_IP:8000
```

### Issue: Container name errors
**Solution:**
The old `.env.dev` used `${POSTGRES_CONTAINER_NAME}` in `DATABASE_URL`, but this doesn't expand correctly in Docker Compose. Fixed to use `postgres` (the service name).

## Performance Impact

- **None** - Binding to `0.0.0.0` vs `127.0.0.1` has no performance difference
- Network latency depends on your local network, not the code changes

## What Didn't Change

- Backend code (already properly configured)
- Frontend API client logic (already uses environment variables)
- Production configuration
- Database schema or migrations
- Docker images or build process
- Authentication or security features

## Next Steps

1. Test the setup: `./scripts/setup-vm-dev.sh`
2. Start development: `docker compose -f compose.dev.yaml up --build`
3. Access from browser: `http://YOUR_VM_IP:3000`
4. Mobile testing: Same URL on mobile device
5. Switch back to localhost anytime by re-running the script

## Documentation

- **Quick Start**: [docs/QUICK-START-VM.md](QUICK-START-VM.md)
- **Detailed Guide**: [docs/vm-development-setup.md](vm-development-setup.md)
- **Main README**: Updated with VM setup section

## Support

If you encounter issues:
1. Check [docs/vm-development-setup.md](vm-development-setup.md) troubleshooting section
2. Verify firewall settings
3. Ensure Docker containers are running: `docker compose ps`
4. Check logs: `docker compose -f compose.dev.yaml logs`
