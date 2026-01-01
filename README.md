# n0tv1cky Blog

A modern, minimal blog platform with markdown-first content management, analytics, and user engagement features.

## Key Features
- 📝 **Markdown-First**: Blog content stored as `.md` files (git-friendly)
- 📊 **Analytics**: Track views, engagement, and user behavior
- 💬 **User Engagement**: Reactions (like/dislike) and threaded comments
- 🎨 **Admin Dashboard**: Full content management with publish/unpublish workflow
- 🔒 **Secure**: JWT authentication with rate limiting
- 🌙 **Dark Mode**: Full dark mode support throughout

## Quick Start

### Local Development
```bash
# Start services
make dev-up

# Access at:
# Frontend: http://localhost:3001
# Backend: http://localhost:8001
```

### VM/Remote Development
```bash
# Update .env.dev with your VM IP
HOST=YOUR_VM_IP

# Start services
make dev-up

# Access from any device on your network
```

📚 **Documentation**: [Setup Guide](docs/SETUP.md) | [Features](docs/FEATURES.md) | [Deployment](docs/DEPLOYMENT.md)

## Tech Stack
- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Python FastAPI, SQLAlchemy
- **Database**: PostgreSQL (metadata, analytics, comments)
- **Content**: Markdown files in `./blogs` (source of truth)

## Architecture

### Content-First Design
- **Markdown files** = Source of truth for blog content
- **Database** = Metadata cache for fast queries
- **Git** = Version control and backup

Blog content is always read from `.md` files, never stored in database. The DB only indexes metadata for efficient querying.

## Project Structure
```
├── .env.dev, .env.prod          # Environment configs
├── compose.dev.yaml             # Development docker compose
├── compose.prod.yaml            # Production docker compose
├── makefile                     # Quick commands
├── blogs/                       # Content source of truth
│   ├── *.md                     # Blog posts
│   └── images/                  # Blog images
├── services/
│   ├── frontend/                # Next.js application
│   │   └── src/
│   │       ├── app/             # App routes
│   │       ├── components/      # React components
│   │       └── lib/             # API & utilities
│   └── backend/                 # FastAPI application
│       └── app/
│           ├── routes/          # API endpoints
│           ├── models.py        # Database models
│           └── *.py             # Core logic
└── docs/                        # Documentation
```

## File Conventions

### Blog Files
```
Format: YYYYMMDD_HHMMSS_slug.md

Example: 20250101_120000_hello-world.md
```

### Frontmatter Structure
```yaml
---
title: Your Blog Title
slug: your-blog-slug
published: true
published_at: 2025-01-01T12:00:00Z
created_at: 2025-01-01T12:00:00Z
updated_at: 2025-01-01T12:00:00Z
description: Brief description
tags: tag1, tag2, tag3
category: category-name
author: your-name
reading_time: 5
---
```

### Image Files
```
Format: YYYYMMDD_HHMMSS_blog-slug_N.ext

Example: 20250101_120000_hello-world_1.png
```

## Environment Setup

### Development (.env.dev)
```bash
HOST=localhost                              # Or VM IP for remote access
FRONTEND_PORT=3001
BACKEND_PORT=8001
DATABASE_URL=postgresql://bloguser:blogpass@postgres:5432/blogdb
ADMIN_PASSWORD=your_secure_password
```

### Production (.env.prod)
```bash
DOMAIN=yourdomain.com
FRONTEND_PORT=3000
BACKEND_PORT=8000
DATABASE_URL=postgresql://produser:prodpass@postgres:5432/blogdb
ADMIN_PASSWORD=strong_production_password
JWT_SECRET=your_jwt_secret
```

## Available Commands

```bash
# Development
make dev-up          # Start dev environment
make dev-down        # Stop dev environment
make dev-logs        # View dev logs

# Production
make prod-up         # Start production
make prod-down       # Stop production
make prod-logs       # View prod logs

# Utility
make clean           # Remove containers & volumes
make shell-backend   # Access backend container
make shell-frontend  # Access frontend container
```

## Development Workflow

1. **Create/Edit Content**: Write markdown files in `./blogs`
2. **Admin Interface**: Use `/admin` for GUI content management
3. **Preview**: Check changes at `/blogs/[slug]`
4. **Publish**: Toggle publish status in admin dashboard
5. **Monitor**: View analytics in metrics dashboard

## API Endpoints

### Public
- `GET /api/blogs` - List published blogs
- `GET /api/blogs/{slug}` - Get blog content
- `POST /api/blogs/{slug}/react` - Add reaction
- `POST /api/blogs/{slug}/comments` - Add comment

### Admin (Requires Auth)
- `POST /api/admin/auth` - Admin login
- `GET /api/admin/blogs` - All blogs (including drafts)
- `POST /api/admin/blogs` - Create blog
- `PUT /api/admin/blogs/{slug}` - Update blog
- `PATCH /api/admin/blogs/{slug}/publish` - Toggle publish
- `DELETE /api/admin/blogs/{slug}` - Delete blog
- `GET /api/metrics/admin/summary` - Analytics data

## Contributing

See [SETUP.md](docs/SETUP.md) for detailed development setup instructions.

## Security

See [SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md) for security considerations and audit results.

## License

MIT License - See LICENSE file for details
