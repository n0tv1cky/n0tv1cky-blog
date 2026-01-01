# VM Development - Visual Guide

## Architecture Overview

### Before: Localhost Only
```
┌─────────────────────────────────────────┐
│         Your Computer (localhost)        │
│                                          │
│  Browser                                 │
│     ↓                                    │
│  http://localhost:3000                   │
│     ↓                                    │
│  Next.js (127.0.0.1:3000) ────────────┐ │
│     ↓                                  │ │
│  http://localhost:8000                 │ │
│     ↓                                  │ │
│  FastAPI (127.0.0.1:8000) ────────────┘ │
│     ↓                                    │
│  PostgreSQL (127.0.0.1:5432)             │
│                                          │
└─────────────────────────────────────────┘

✗ Can't access from phone
✗ Can't access from tablet  
✗ Can't access from other computers
```

### After: VM Accessible
```
┌──────────────────────────────────────────────────────────────┐
│                Network: 192.168.1.0/24                        │
│                                                               │
│  ┌────────────┐       ┌──────────────────────────────────┐  │
│  │ Your Phone │       │  VM (192.168.1.100)              │  │
│  │            │───────│                                   │  │
│  └────────────┘       │  Next.js (0.0.0.0:3000) ────┐    │  │
│        ↓              │     ↓                        │    │  │
│  http://192.168.      │  FastAPI (0.0.0.0:8000) ────┤    │  │
│        1.100:3000     │     ↓                        │    │  │
│                       │  PostgreSQL (5432)           │    │  │
│  ┌────────────┐       └──────────────────────────────┘    │  │
│  │ Your Tablet│───────────────────↑                       │  │
│  └────────────┘                                           │  │
│        ↓                                                   │  │
│  http://192.168.1.100:3000                                │  │
│                                                            │  │
│  ┌────────────┐                                           │  │
│  │ Laptop     │───────────────────↑                       │  │
│  └────────────┘                                           │  │
│        ↓                                                   │  │
│  http://192.168.1.100:3000                                │  │
│                                                            │  │
└──────────────────────────────────────────────────────────────┘

✓ Access from any device on the network
✓ Test on real mobile devices
✓ Share with team members
```

## Setup Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Initial Setup                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Run Setup Script                                     │
│                                                               │
│  $ ./scripts/setup-vm-dev.sh                                 │
│                                                               │
│  → Detects VM IP: 192.168.1.100                             │
│  → Updates .env.dev automatically                            │
│  → Creates backup of old config                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Start Docker Containers                              │
│                                                               │
│  $ docker compose -f compose.dev.yaml up --build            │
│                                                               │
│  → Builds frontend (Next.js)                                 │
│  → Builds backend (FastAPI)                                  │
│  → Starts PostgreSQL                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Access from Any Device                               │
│                                                               │
│  Frontend: http://192.168.1.100:3000                        │
│  Backend:  http://192.168.1.100:8000                        │
│  API Docs: http://192.168.1.100:8000/docs                   │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Flow

```
┌──────────────────┐
│   .env.dev       │
│                  │
│  NEXT_PUBLIC_    │
│  BACKEND_URL=    │
│  http://         │
│  192.168.1.100   │
│  :8000           │
└────────┬─────────┘
         │
         ↓
┌────────────────────┐
│  compose.dev.yaml  │
│                    │
│  Reads env vars    │
│  Passes to         │
│  containers        │
└────────┬───────────┘
         │
         ↓
┌───────────────────────────────────────────┐
│        Docker Containers                   │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Frontend (Next.js)                  │ │
│  │  • Binds to 0.0.0.0:3000            │ │
│  │  • Uses NEXT_PUBLIC_BACKEND_URL     │ │
│  │  • Accepts connections from any IP  │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Backend (FastAPI)                   │ │
│  │  • Binds to 0.0.0.0:8000            │ │
│  │  • CORS allows all origins (dev)    │ │
│  │  • Accepts connections from any IP  │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  PostgreSQL                          │ │
│  │  • Internal only                     │ │
│  │  • Accessed via Docker network       │ │
│  └──────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

## Network Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Request                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
              http://192.168.1.100:3000
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Next.js (Frontend)                          │
│                                                               │
│  • Serves HTML/CSS/JS                                        │
│  • Client-side routing                                       │
│  • API calls to backend                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
              http://192.168.1.100:8000/api/*
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  FastAPI (Backend)                           │
│                                                               │
│  • REST API endpoints                                        │
│  • Database queries                                          │
│  • File system access                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  postgres://internal
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL (Database)                       │
│                                                               │
│  • Metadata storage                                          │
│  • Comments & reactions                                      │
│  • User sessions                                             │
└─────────────────────────────────────────────────────────────┘
```

## Firewall Configuration

### Before (Default)
```
┌──────────────────┐
│       UFW        │
│                  │
│  Port 22: ALLOW  │ ← SSH only
│  Port *: DENY    │ ← Everything else blocked
└──────────────────┘
```

### After (Development)
```
┌──────────────────┐
│       UFW        │
│                  │
│  Port 22: ALLOW  │ ← SSH
│  Port 3000: ALLOW│ ← Next.js
│  Port 8000: ALLOW│ ← FastAPI
│  Port *: DENY    │ ← Everything else blocked
└──────────────────┘

Commands:
$ sudo ufw allow 3000/tcp
$ sudo ufw allow 8000/tcp
```

## Switching Between Modes

### Localhost Mode
```bash
# .env.dev
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# Access
Browser → http://localhost:3000 ✓
Phone → http://localhost:3000 ✗
```

### VM Mode
```bash
# .env.dev
NEXT_PUBLIC_BACKEND_URL=http://192.168.1.100:8000
NEXT_PUBLIC_FRONTEND_URL=http://192.168.1.100:3000

# Access
Browser → http://192.168.1.100:3000 ✓
Phone → http://192.168.1.100:3000 ✓
```

## Troubleshooting Visual Guide

```
Connection Failed?
       ↓
       ├─→ Check VM IP
       │   $ hostname -I
       │   Expected: 192.168.1.100
       │
       ├─→ Check Firewall
       │   $ sudo ufw status
       │   Expected: 3000/tcp ALLOW
       │            8000/tcp ALLOW
       │
       ├─→ Check Containers
       │   $ docker compose ps
       │   Expected: All "Up"
       │
       ├─→ Check .env.dev
       │   $ cat .env.dev | grep NEXT_PUBLIC
       │   Expected: NEXT_PUBLIC_BACKEND_URL=http://192.168.1.100:8000
       │
       └─→ Test Network
           $ ping 192.168.1.100
           Expected: Reply from 192.168.1.100
```

## Key Files Modified

```
n0tv1cky-blog/
├── .env.dev                          ← Updated with VM URLs
├── compose.dev.yaml                  ← Uses env variables
├── services/
│   └── frontend/
│       ├── package.json              ← "next dev -H 0.0.0.0"
│       └── next.config.js            ← Allow any hostname
├── scripts/
│   └── setup-vm-dev.sh               ← NEW: Automated setup
└── docs/
    ├── vm-development-setup.md       ← NEW: Detailed guide
    ├── QUICK-START-VM.md             ← NEW: Quick reference
    └── VM-CHANGES-SUMMARY.md         ← NEW: Change summary
```

## Quick Commands Reference

```bash
# Setup
make setup-vm              # Configure VM IP
make dev-up               # Start development

# Or manual
./scripts/setup-vm-dev.sh
docker compose -f compose.dev.yaml up --build

# Check status
docker compose ps
sudo ufw status

# Logs
make dev-logs
# Or
docker compose -f compose.dev.yaml logs -f

# Stop
make dev-down
# Or
docker compose -f compose.dev.yaml down

# Get VM IP
hostname -I | awk '{print $1}'
```
