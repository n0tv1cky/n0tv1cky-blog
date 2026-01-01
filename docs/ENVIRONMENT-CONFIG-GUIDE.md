# Environment Configuration Guide

## Overview

Both `.env.dev` and `.env.prod` now use a **single source of truth** approach. Change one variable, and all URLs update automatically.

## Structure Comparison

### Development (.env.dev)
```bash
# SINGLE SOURCE OF TRUTH - Change only this line
HOST=localhost          # or 192.168.1.100 for VM

# Everything else derives automatically:
FRONTEND_URL=http://${HOST}:3000
NEXT_PUBLIC_BACKEND_URL=http://${HOST}:8000
NEXT_PUBLIC_FRONTEND_URL=http://${HOST}:3000
DOMAIN_NAME=${HOST}:3000
CORS_ORIGINS=*
```

### Production (.env.prod)
```bash
# SINGLE SOURCE OF TRUTH - Change only this line
DOMAIN=n0tv1cky.com     # or yourdomain.com

# Everything else derives automatically:
FRONTEND_URL=https://${DOMAIN}
NEXT_PUBLIC_FRONTEND_URL=https://${DOMAIN}
DOMAIN_NAME=${DOMAIN}
CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
```

## Quick Configuration

### Development

**Option 1: Automated (Recommended)**
```bash
./scripts/setup-vm-dev.sh
```

**Option 2: Manual**
Edit `.env.dev` and change ONE line:
```bash
# For localhost
HOST=localhost

# For VM at 192.168.1.100
HOST=192.168.1.100

# For custom hostname
HOST=my-dev-server.local
```

### Production

Edit `.env.prod` and change ONE line:
```bash
# For n0tv1cky.com
DOMAIN=n0tv1cky.com

# For different domain
DOMAIN=yourdomain.com
```

## How It Works

### Variable Propagation

**Development:**
```
HOST=192.168.1.100
    ↓
PROTOCOL=http
    ↓
FRONTEND_PORT=3000
BACKEND_PORT=8000
    ↓
FRONTEND_URL=${PROTOCOL}://${HOST}:${FRONTEND_PORT}
    → http://192.168.1.100:3000
    ↓
NEXT_PUBLIC_BACKEND_URL=${PROTOCOL}://${HOST}:${BACKEND_PORT}
    → http://192.168.1.100:8000
    ↓
NEXT_PUBLIC_FRONTEND_URL=${PROTOCOL}://${HOST}:${FRONTEND_PORT}
    → http://192.168.1.100:3000
    ↓
DOMAIN_NAME=${HOST}:${FRONTEND_PORT}
    → 192.168.1.100:3000
```

**Production:**
```
DOMAIN=n0tv1cky.com
    ↓
PROTOCOL=https
    ↓
FRONTEND_URL=${PROTOCOL}://${DOMAIN}
    → https://n0tv1cky.com
    ↓
NEXT_PUBLIC_FRONTEND_URL=${PROTOCOL}://${DOMAIN}
    → https://n0tv1cky.com
    ↓
CORS_ORIGINS=${PROTOCOL}://${DOMAIN},${PROTOCOL}://www.${DOMAIN}
    → https://n0tv1cky.com,https://www.n0tv1cky.com
```

## Common Scenarios

### Scenario 1: Switch from localhost to VM

**Before:**
```bash
HOST=localhost
# URLs: http://localhost:3000, http://localhost:8000
```

**After:**
```bash
HOST=192.168.1.100
# URLs: http://192.168.1.100:3000, http://192.168.1.100:8000
```

**That's it!** All derived URLs update automatically.

### Scenario 2: Change production domain

**Before:**
```bash
DOMAIN=n0tv1cky.com
# URLs: https://n0tv1cky.com
# CORS: https://n0tv1cky.com,https://www.n0tv1cky.com
```

**After:**
```bash
DOMAIN=mysite.com
# URLs: https://mysite.com
# CORS: https://mysite.com,https://www.mysite.com
```

**That's it!** All derived URLs and CORS update automatically.

### Scenario 3: Use custom ports in development

Edit `.env.dev`:
```bash
HOST=192.168.1.100
FRONTEND_PORT=3001
BACKEND_PORT=8001
```

All URLs automatically update:
- Frontend: `http://192.168.1.100:3001`
- Backend: `http://192.168.1.100:8001`

## File Structure

Both files follow the same structure:

```
┌─────────────────────────────────────────┐
│ 1. Deployment Mode                       │
│    DEPLOYMENT_MODE=dev/prod              │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 2. Domain/Host Configuration             │
│    HOST/DOMAIN = SINGLE SOURCE OF TRUTH  │
│    PROTOCOL, PORTS                       │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 3. Derived URLs                          │
│    All URLs use variables from #2        │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 4. Docker Container Names                │
│    Use COMPOSE_PROJECT_NAME              │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 5. Database Configuration                │
│    Credentials and connection URL        │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 6. Internal Service URLs                 │
│    Docker network communication          │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 7. Environment Settings                  │
│    NODE_ENV                              │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 8. Admin Configuration                   │
│    Passwords and tokens                  │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 9. CORS Configuration                    │
│    Uses PROTOCOL and HOST/DOMAIN         │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 10. Upload Configuration                 │
│     File size limits                     │
└─────────────────────────────────────────┘
```

## Validation

### Check Current Configuration

**Development:**
```bash
# Check current HOST
cat .env.dev | grep "^HOST="

# Check all derived URLs
cat .env.dev | grep -E "FRONTEND_URL|BACKEND_URL|NEXT_PUBLIC"
```

**Production:**
```bash
# Check current DOMAIN
cat .env.prod | grep "^DOMAIN="

# Check all derived URLs
cat .env.prod | grep -E "FRONTEND_URL|CORS_ORIGINS"
```

### Test Configuration

**Development:**
```bash
# Export variables
export $(cat .env.dev | grep -v '^#' | xargs)

# Check values
echo "Frontend: $FRONTEND_URL"
echo "Backend: $NEXT_PUBLIC_BACKEND_URL"
```

## Migration from Old Structure

If you have an old `.env.dev` or `.env.prod` file:

1. **Backup existing file:**
   ```bash
   cp .env.dev .env.dev.old
   ```

2. **Copy from example:**
   ```bash
   cp .env.dev.example .env.dev
   ```

3. **Update single variable:**
   ```bash
   # For dev
   sed -i 's/HOST=localhost/HOST=YOUR_IP/' .env.dev
   
   # For prod
   sed -i 's/DOMAIN=n0tv1cky.com/DOMAIN=yourdomain.com/' .env.prod
   ```

4. **Update credentials if needed:**
   ```bash
   # Database password, admin password, etc.
   ```

## Benefits

✅ **Single Source of Truth**: Change one variable, everything updates
✅ **Consistent Structure**: Dev and prod files mirror each other
✅ **Less Error-Prone**: No need to update multiple places
✅ **Self-Documenting**: Clear hierarchy and comments
✅ **Easy Migration**: Simple to switch domains or IPs
✅ **DRY Principle**: Don't Repeat Yourself

## Troubleshooting

### Issue: Variables not expanding

**Problem:** Seeing `${HOST}` literally in URLs

**Solution:** Ensure your shell/Docker supports variable expansion. Docker Compose supports this natively.

### Issue: URLs still showing old values

**Solution:** 
1. Check if you edited the right file (`.env.dev` vs `.env.prod`)
2. Restart containers: `docker compose restart`
3. Rebuild if needed: `docker compose up --build`

### Issue: CORS errors after changing domain

**Solution:** The `CORS_ORIGINS` variable automatically updates with domain changes. Restart the backend:
```bash
docker compose -f compose.dev.yaml restart backend
```

## Advanced: Adding New Derived Variables

If you need to add a new URL that should use the HOST/DOMAIN:

**Development:**
```bash
# Add to .env.dev
MY_NEW_URL=${PROTOCOL}://${HOST}:${BACKEND_PORT}/my-endpoint
```

**Production:**
```bash
# Add to .env.prod
MY_NEW_URL=${PROTOCOL}://${DOMAIN}/my-endpoint
```

The variable will automatically inherit the correct host/domain.
