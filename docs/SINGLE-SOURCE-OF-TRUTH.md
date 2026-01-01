# Single Source of Truth - Visual Guide

## Concept

Change **ONE** variable, and all related URLs update automatically.

## Development Configuration Flow

```
┌─────────────────────────────────────────────────────────┐
│              EDIT THIS ONE LINE                          │
│                                                          │
│  HOST=192.168.1.100                                     │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│              COMBINE WITH DEFAULTS                       │
│                                                          │
│  PROTOCOL=http                                          │
│  FRONTEND_PORT=3000                                     │
│  BACKEND_PORT=8000                                      │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│         ALL URLS AUTOMATICALLY GENERATED                 │
│                                                          │
│  FRONTEND_URL=http://192.168.1.100:3000                │
│  NEXT_PUBLIC_BACKEND_URL=http://192.168.1.100:8000     │
│  NEXT_PUBLIC_FRONTEND_URL=http://192.168.1.100:3000    │
│  DOMAIN_NAME=192.168.1.100:3000                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Production Configuration Flow

```
┌─────────────────────────────────────────────────────────┐
│              EDIT THIS ONE LINE                          │
│                                                          │
│  DOMAIN=n0tv1cky.com                                    │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│              COMBINE WITH DEFAULTS                       │
│                                                          │
│  PROTOCOL=https                                         │
│                                                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────┐
│         ALL URLS AUTOMATICALLY GENERATED                 │
│                                                          │
│  FRONTEND_URL=https://n0tv1cky.com                      │
│  NEXT_PUBLIC_FRONTEND_URL=https://n0tv1cky.com          │
│  DOMAIN_NAME=n0tv1cky.com                               │
│  CORS_ORIGINS=https://n0tv1cky.com,                     │
│               https://www.n0tv1cky.com                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Side-by-Side Comparison

### Old Way (Error-Prone)

```
.env.dev:
  NEXT_PUBLIC_BACKEND_URL=http://localhost:8000     ← Edit #1
  NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000    ← Edit #2
  FRONTEND_URL=http://localhost:3000                ← Edit #3
  DOMAIN_NAME=localhost:3000                        ← Edit #4

❌ 4 places to update
❌ Easy to miss one
❌ Inconsistent URLs
```

### New Way (Single Source of Truth)

```
.env.dev:
  HOST=localhost                                     ← Edit ONCE
  
  # Everything else derives automatically:
  FRONTEND_URL=${PROTOCOL}://${HOST}:${FRONTEND_PORT}
  NEXT_PUBLIC_BACKEND_URL=${PROTOCOL}://${HOST}:${BACKEND_PORT}
  NEXT_PUBLIC_FRONTEND_URL=${PROTOCOL}://${HOST}:${FRONTEND_PORT}
  DOMAIN_NAME=${HOST}:${FRONTEND_PORT}

✅ 1 place to update
✅ Impossible to have inconsistent URLs
✅ Self-documenting
```

## Real-World Example

### Scenario: Switch from localhost to VM

**Old Way:**
```bash
# 1. Find all localhost references
grep -r "localhost" .env.dev

# 2. Manually update each one
sed -i 's/localhost/192.168.1.100/g' .env.dev

# 3. Verify you didn't miss any
grep -r "localhost" .env.dev

# 4. Restart containers
docker compose restart
```

**New Way:**
```bash
# 1. Edit ONE line
sed -i 's/HOST=localhost/HOST=192.168.1.100/' .env.dev

# 2. Restart containers
docker compose restart

# Or even easier:
./scripts/setup-vm-dev.sh
```

## Variable Dependency Tree

```
Development:
    HOST
     ├─→ FRONTEND_URL
     ├─→ NEXT_PUBLIC_BACKEND_URL
     ├─→ NEXT_PUBLIC_FRONTEND_URL
     └─→ DOMAIN_NAME

Production:
    DOMAIN
     ├─→ FRONTEND_URL
     ├─→ NEXT_PUBLIC_FRONTEND_URL
     ├─→ DOMAIN_NAME
     └─→ CORS_ORIGINS
         ├─→ https://${DOMAIN}
         └─→ https://www.${DOMAIN}
```

## Validation

### Check Current Configuration

```bash
# Development
$ cat .env.dev | grep "^HOST="
HOST=localhost

$ cat .env.dev | grep "NEXT_PUBLIC"
NEXT_PUBLIC_BACKEND_URL=${PROTOCOL}://${HOST}:${BACKEND_PORT}
NEXT_PUBLIC_FRONTEND_URL=${PROTOCOL}://${HOST}:${FRONTEND_PORT}
```

### Expand Variables (See Actual Values)

```bash
# Development
$ export $(cat .env.dev | grep -v '^#' | xargs)
$ echo "Frontend: $NEXT_PUBLIC_FRONTEND_URL"
Frontend: http://localhost:3000

$ echo "Backend: $NEXT_PUBLIC_BACKEND_URL"
Backend: http://localhost:8000
```

## Migration Steps

### From Old .env.dev to New

```bash
# 1. Backup
cp .env.dev .env.dev.backup

# 2. Find your current backend URL
OLD_HOST=$(grep "NEXT_PUBLIC_BACKEND_URL" .env.dev.backup | cut -d'=' -f2 | cut -d':' -f2 | tr -d '/')

# 3. Use new structure
cp .env.dev.example .env.dev

# 4. Update HOST
sed -i "s/HOST=localhost/HOST=$OLD_HOST/" .env.dev

# 5. Verify
cat .env.dev | grep "^HOST="
```

## Common Scenarios

### Development

| Scenario | Change | Result |
|----------|--------|--------|
| Local dev | `HOST=localhost` | `http://localhost:3000` |
| VM at home | `HOST=192.168.1.100` | `http://192.168.1.100:3000` |
| VM at office | `HOST=10.0.1.50` | `http://10.0.1.50:3000` |
| Named host | `HOST=dev-server.local` | `http://dev-server.local:3000` |

### Production

| Scenario | Change | Result |
|----------|--------|--------|
| Main domain | `DOMAIN=n0tv1cky.com` | `https://n0tv1cky.com` |
| New domain | `DOMAIN=myblog.com` | `https://myblog.com` |
| Subdomain | `DOMAIN=blog.mysite.com` | `https://blog.mysite.com` |

## Benefits Summary

### Before (Multiple Sources of Truth)
```
├─ NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
├─ NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
├─ FRONTEND_URL=http://localhost:3000
└─ DOMAIN_NAME=localhost:3000

Problems:
  ❌ Update 4 places when changing IP
  ❌ Easy to have typos
  ❌ Inconsistent URLs possible
  ❌ Hard to maintain
```

### After (Single Source of Truth)
```
HOST=localhost
  ↓ (automatically derives)
├─ NEXT_PUBLIC_BACKEND_URL=http://${HOST}:8000
├─ NEXT_PUBLIC_FRONTEND_URL=http://${HOST}:3000
├─ FRONTEND_URL=http://${HOST}:3000
└─ DOMAIN_NAME=${HOST}:3000

Benefits:
  ✅ Update 1 place
  ✅ No typos possible
  ✅ Always consistent
  ✅ Easy to maintain
  ✅ Self-documenting
  ✅ DRY principle
```

## Quick Reference Card

```bash
┌─────────────────────────────────────────────────────┐
│           QUICK REFERENCE                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│  DEVELOPMENT                                         │
│  ───────────────────────────────────────────────    │
│  File:     .env.dev                                  │
│  Variable: HOST                                      │
│  Default:  localhost                                 │
│  Example:  HOST=192.168.1.100                        │
│                                                      │
│  PRODUCTION                                          │
│  ───────────────────────────────────────────────    │
│  File:     .env.prod                                 │
│  Variable: DOMAIN                                    │
│  Default:  n0tv1cky.com                              │
│  Example:  DOMAIN=yourdomain.com                     │
│                                                      │
│  COMMANDS                                            │
│  ───────────────────────────────────────────────    │
│  Setup VM:  ./scripts/setup-vm-dev.sh                │
│  Start Dev: docker compose -f compose.dev.yaml up    │
│  Check:     cat .env.dev | grep "^HOST="             │
│                                                      │
└─────────────────────────────────────────────────────┘
```
