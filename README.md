# Blog System Implementation Plan

## Project Overview
A modern, minimal blog platform where admins can publish markdown blogs with images, and users can interact through likes/dislikes and comments. **Markdown files serve as the source of truth**, making the system git-friendly and easily portable.

## Tech Stack
- **Frontend**: Next.js (JavaScript)
- **Backend**: Python FastAPI
- **Database**: PostgreSQL (Docker) - for metadata, reactions, and comments only
- **File Storage**: Markdown files in `./blogs` folder (source of truth)

## Core Architecture Principle

### Markdown Files as Source of Truth
- **Markdown files** = Source of truth for blog content
- **Database** = Index/cache for fast queries (metadata only)
- On startup/publish, backend reads .md files and syncs database
- Blog content is ALWAYS read from .md files, never stored in DB
- Git repository serves as backup and version control

## Project Structure
```
project-root/
├── .env.dev
├── .env.prod
├── compose.dev.yaml                         # Docker Compose for dev
├── compose.prod.yaml                        # Docker Compose for prod
├── blogs/                                    # Source of truth
│   ├── 20241225_143022_installing-docker-on-ubuntu.md
│   ├── 20241226_091500_building-rest-apis-with-fastapi.md
│   ├── images/
│   │   ├── 20241225_143022_installing-docker-on-ubuntu_1.png
│   │   ├── 20241225_143022_installing-docker-on-ubuntu_2.jpg
│   │   └── 20241226_091500_building-rest-apis-with-fastapi_1.png
│   └── drafts/                              # Temporary drafts
│       └── draft_1735123456.md
├── services/
│   ├── frontend/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.js
│   │   │   │   ├── page.js                  # Landing page
│   │   │   │   ├── blogs/
│   │   │   │   │   └── page.js              # Blog list
│   │   │   │   ├── blogs/
│   │   │   │   │   └── [slug]/
│   │   │   │   │       └── page.js          # Blog reader
│   │   │   │   └── admin/
│   │   │   │       ├── page.js              # Admin dashboard (with draft/published tags)
│   │   │   │       ├── new/
│   │   │   │       │   └── page.js          # New blog editor (with autosave toggle)
│   │   │   │       └── edit/
│   │   │   │           └── [slug]/
│   │   │   │               └── page.js      # Edit existing blog
│   │   │   ├── components/
│   │   │   │   ├── BlogCard.js
│   │   │   │   ├── BlogViewer.js
│   │   │   │   ├── CommentSection.js
│   │   │   │   ├── MarkdownEditor.js        # With paste image support
│   │   │   │   ├── ImageUploader.js
│   │   │   │   ├── SlugPreview.js
│   │   │   │   ├── DraftAutosave.js         # With toggle (on by default)
│   │   │   │   ├── StatusBadge.js           # Draft/Published badge
│   │   │   │   └── LandingPage.js
│   │   │   └── lib/
│   │   │       ├── api.js
│   │   │       └── ratelimit.js             # Client-side rate limiting
│   │   └── .dockerignore
│   └── backend/
│       ├── Dockerfile
│       ├── .dockerignore
│       ├── requirements.txt
│       ├── app/
│       │   ├── main.py
│       │   ├── database.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   ├── markdown_parser.py           # Parse frontmatter + content
│       │   ├── blog_sync.py                 # Sync .md files to DB
│       │   ├── ratelimit.py                 # Rate limiting middleware
│       │   └── routes/
│       │       ├── blogs.py
│       │       ├── comments.py
│       │       ├── reactions.py
│       │       ├── uploads.py
│       │       └── admin.py                 # Admin operations + sync
│       └── .dockerignore
└── README.md
```

## File Naming Convention

### Blog Files
```
Format: YYYYMMDD_HHMMSS_slug-from-title.md

Examples:
- 20241225_143022_installing-docker-on-ubuntu.md
- 20241226_091500_building-rest-apis-with-fastapi.md
- 20241227_120000_python-best-practices.md
```

### Image Files
```
Format: YYYYMMDD_HHMMSS_blog-slug_N.ext

Examples:
- 20241225_143022_installing-docker-on-ubuntu_1.png
- 20241225_143022_installing-docker-on-ubuntu_2.jpg
- 20241226_091500_building-rest-apis-with-fastapi_1.png
```

### Slug Generation
- Auto-generated from title: "Installing Docker" → `installing-docker`
- Lowercase, hyphenated words
- Remove special characters
- Editable before publishing for SEO customization

## Markdown File Structure

Each blog file contains YAML frontmatter + markdown content:

```markdown
---
title: Installing Docker on Ubuntu
slug: installing-docker-on-ubuntu
published: true
published_at: 2024-12-25T14:30:22Z
created_at: 2024-12-25T14:30:22Z
updated_at: 2024-12-25T14:30:22Z
description: A comprehensive guide to installing Docker on Ubuntu 22.04
tags: docker, ubuntu, devops, containers
category: devops
author: n0tv1cky
reading_time: 5
---

# Installing Docker on Ubuntu

Docker is a powerful containerization platform that simplifies application deployment...

![Docker Architecture](/images/20241225_143022_installing-docker-on-ubuntu_1.png)

Here's how to install it step by step:

## Prerequisites

Before we begin, ensure you have:
- Ubuntu 22.04 or later
- Sudo privileges

## Installation Steps

```bash
sudo apt-get update
sudo apt-get install docker.io
```

![Terminal Output](/images/20241225_143022_installing-docker-on-ubuntu_2.png)

## Verification

Check if Docker is running:

```bash
sudo systemctl status docker
```
```

## Environment Variables

### .env.dev
```
DOMAIN_NAME=localhost:3000
DATABASE_URL=postgresql://bloguser:blogpass@postgres:5432/blogdb
POSTGRES_USER=bloguser
POSTGRES_PASSWORD=blogpass
POSTGRES_DB=blogdb
BACKEND_URL=http://backend:8000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
ADMIN_PASSWORD=admin123
```

### .env.prod
```
DOMAIN_NAME=n0tv1cky.com
DATABASE_URL=postgresql://produser:prodpass@postgres:5432/blogdb
POSTGRES_USER=produser
POSTGRES_PASSWORD=prodpass
POSTGRES_DB=blogdb
BACKEND_URL=http://backend:8000
FRONTEND_URL=https://n0tv1cky.com
NODE_ENV=production
ADMIN_PASSWORD=your_secure_password_here
```

## Production environment guidance (backend URL)

When deploying to production, prefer same-origin relative requests from the frontend to avoid mixed-content and CORS issues. Use one of these approaches based on your deployment topology:

- **Frontend and backend served from the same origin (recommended)**: do not set `NEXT_PUBLIC_BACKEND_URL` in the frontend. Use relative paths (e.g., `/api`, `/images`) so the browser will call the same origin and use HTTPS automatically when the page is served over TLS.

- **Frontend and backend on separate origins**: set `NEXT_PUBLIC_BACKEND_URL` to a secure absolute URL using `https://` (for example `https://api.n0tv1cky.com`). Avoid using `http://` for production — browsers will block `http://` resource requests when the page is served over `https://`.

Examples:
- Same-origin (nginx reverse-proxy): do not set `NEXT_PUBLIC_BACKEND_URL`.
- Different origins: set `NEXT_PUBLIC_BACKEND_URL=https://api.n0tv1cky.com`

Docker Compose / production note:

- The `compose.prod.yaml` in this repo previously forwarded `BACKEND_URL` into the frontend build as `NEXT_PUBLIC_BACKEND_URL`, which bakes an internal HTTP address into the static frontend assets. The `compose.prod.yaml` has been adjusted to avoid exposing `NEXT_PUBLIC_BACKEND_URL` to the frontend image in production. If you need to host the API on a separate origin, set `NEXT_PUBLIC_BACKEND_URL` to an `https://` URL at deploy time (not to an internal Docker `http://` address).

Local development may still rely on `http://localhost:8000`. The frontend falls back to this value only when running locally and no production env var is provided.

## Nginx TLS reverse-proxy example

Below is a recommended nginx configuration snippet (the repo contains `services/nginx/conf.d/default.conf`) that terminates TLS and proxies API and image requests to the backend while serving the frontend app. This ensures all browser-visible traffic is HTTPS and avoids mixed content.

Replace backend/frontend sockets/addresses as appropriate for your environment.

server {
   listen 80;
   server_name n0tv1cky.com www.n0tv1cky.com;
   # Redirect all HTTP to HTTPS
   location / {
      return 301 https://$host$request_uri;
   }
}

server {
   listen 443 ssl http2;
   server_name n0tv1cky.com www.n0tv1cky.com;

   ssl_certificate /etc/letsencrypt/live/n0tv1cky.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/n0tv1cky.com/privkey.pem;

   # Proxy Next.js static assets to frontend (Next dev or production build)
   location /_next/ {
      proxy_pass http://127.0.0.1:3000; # frontend
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   }

   # Proxy API requests to backend (FastAPI)
   location /api/ {
      proxy_pass http://127.0.0.1:8000; # backend
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
   }

   # Proxy image requests to backend static files handler
   location /images/ {
      proxy_pass http://127.0.0.1:8000; # backend
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
   }

   # All other requests to frontend
   location / {
      proxy_pass http://127.0.0.1:3000; # frontend
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
   }
}

Notes:
- Ensure `proxy_pass` points to the correct internal addresses for your setup (Docker service names, unix sockets, or loopback ports). When using Docker, you may proxy to `http://backend:8000` from an nginx container on the same Docker network.
- Keep headers like `X-Forwarded-Proto` so the backend knows the original request scheme (useful if the backend generates absolute URLs or needs to enforce secure cookies).
- After editing nginx configuration files, test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```


## Database Schema (Revised)

### Tables

**blogs** (metadata only - content in .md files)
- id: UUID (primary key)
- slug: VARCHAR(255) (unique, indexed) - for URL routing
- title: VARCHAR(500)
- filename: VARCHAR(500) - e.g., 20241225_143022_installing-docker-on-ubuntu.md
- description: TEXT
- published: BOOLEAN (default: false)
- published_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- reading_time: INTEGER (minutes)
- tags: TEXT[] (array)
- category: VARCHAR(100) (nullable) - for future categorization

**reactions**
- id: UUID (primary key)
- blog_slug: VARCHAR(255) (foreign key to blogs.slug)
- user_identifier: VARCHAR(255) (IP/session hash)
- reaction_type: ENUM('like', 'dislike')
- created_at: TIMESTAMP
- UNIQUE(blog_slug, user_identifier)

**comments**
- id: UUID (primary key)
- blog_slug: VARCHAR(255) (foreign key to blogs.slug)
- author_name: VARCHAR(100)
- author_email: VARCHAR(255) (optional)
- content: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP

## Workflows

### Publishing a New Blog

1. Admin navigates to `/admin/new`
2. Enters title: "Installing Docker on Ubuntu"
3. System shows slug preview: `installing-docker-on-ubuntu` (editable)
4. Writes content in markdown editor
5. Pastes/uploads images:
   - Detects paste event with image data
   - Uploads via API
   - Saved as: `20241225_143022_installing-docker-on-ubuntu_1.png`
   - Markdown syntax auto-inserted: `![Image](/images/...)`
6. **Auto-save** every 30 seconds to `./blogs/drafts/`
7. Clicks "Preview" to see rendered version
8. Clicks "Publish":
   - Generates timestamp: `20241225_143022`
   - Creates filename: `20241225_143022_installing-docker-on-ubuntu.md`
   - Writes file to `./blogs/`
   - Updates database with metadata
   - Deletes draft file

### Editing an Existing Blog

1. Admin navigates to `/admin/edit/installing-docker-on-ubuntu`
2. Backend:
   - Queries DB for filename by slug
   - Reads the .md file
   - Parses frontmatter and content
   - Sends to frontend
3. Admin makes changes
4. Clicks "Update":
   - Overwrites .md file
   - Updates frontmatter timestamps
   - Syncs metadata to DB

### Reading a Blog (User View)

1. User visits landing page at `/` (see Landing Page section)
2. User navigates to `/blogs` to see blog list
3. User clicks on a blog or visits `/blogs/installing-docker-on-ubuntu`
4. Backend:
   - Queries DB for filename by slug
   - Reads corresponding .md file from `./blogs/`
   - Parses markdown → HTML with syntax highlighting
   - Queries reactions and comments from DB
5. Returns complete blog data to frontend
6. Frontend renders with:
   - Markdown content
   - Click-to-fullscreen images
   - Like/dislike buttons with counts (rate-limited)
   - Comments section (rate-limited)

### Database Sync/Ingester

**On Backend Startup:**
```python
async def sync_blogs_from_filesystem():
    """
    Reads all .md files in ./blogs/
    Parses frontmatter
    Updates or inserts metadata into database
    Ensures DB is always in sync with filesystem
    """
    blog_files = glob.glob("./blogs/*.md")
    for file_path in blog_files:
        frontmatter, content = parse_markdown_file(file_path)
        upsert_blog_metadata(frontmatter, file_path)
```

**Manual Sync Endpoint:**
```
POST /api/admin/sync-blogs
```
Use this after:
- Manually adding .md files
- Pulling from git
- Restoring from backup

**Sync on Publish/Edit:**
- Automatically syncs after every publish or edit operation

## Image Copy-Paste Feature

### Implementation
```javascript
// In MarkdownEditor component
const handlePaste = async (e) => {
  const items = e.clipboardData.items;
  
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const blob = item.getAsFile();
      
      // Upload image
      const formData = new FormData();
      formData.append('image', blob);
      formData.append('blog_slug', currentSlug);
      
      const response = await fetch('/api/uploads/image', {
        method: 'POST',
        body: formData
      });
      
      const { image_url } = await response.json();
      
      // Insert markdown at cursor
      insertAtCursor(`![Image](${image_url})`);
    }
  }
};
```

### Image Upload API
- Accepts image file
- Generates filename: `YYYYMMDD_HHMMSS_blog-slug_N.ext`
- Saves to `./blogs/images/`
- Returns URL for markdown insertion

## API Endpoints

### Blogs
- `GET /api/blogs` - List all published blogs (metadata from DB)
- `GET /api/blogs/{slug}` - Get specific blog (content from .md file)
- `POST /api/blogs` - Create new blog (admin) - writes .md file + DB
- `PUT /api/blogs/{slug}` - Update blog (admin) - updates .md file + DB
- `DELETE /api/blogs/{slug}` - Delete blog (admin) - deletes .md file + DB entry
- `PATCH /api/blogs/{slug}/publish` - Toggle publish status (admin)

### Reactions (Rate Limited)
- `POST /api/blogs/{slug}/react` - Add/update like/dislike (10/hour per IP)
- `GET /api/blogs/{slug}/reactions` - Get reaction counts
- `DELETE /api/blogs/{slug}/react` - Remove own reaction

### Comments (Rate Limited)
- `GET /api/blogs/{slug}/comments` - Get all comments for a blog
- `POST /api/blogs/{slug}/comments` - Add comment (3/hour per IP)
- `DELETE /api/comments/{id}` - Delete comment (admin)

### Uploads (Rate Limited)
- `POST /api/uploads/image` - Upload image (admin, 10/hour per IP) - saves with naming convention

### Admin
- `POST /api/admin/sync-blogs` - Manually sync all .md files to DB
- `POST /api/admin/auth` - Admin authentication
- `GET /api/admin/drafts` - List all draft files
- `GET /api/admin/stats` - Get dashboard statistics

## Essential Features

### Core Features
1. ✅ **Markdown as source of truth** - Content in .md files
2. ✅ **Auto-save drafts** - Every 30 seconds, toggle ON by default
3. ✅ **Image copy-paste** - Paste images directly into editor
4. ✅ **Slug customization** - Edit URL slug before publishing
5. ✅ **Git-friendly** - All content in version-controllable text files
6. ✅ **Database sync** - Auto-sync on startup and manual sync endpoint
7. ✅ **Timestamped filenames** - Easy chronological sorting
8. ✅ **Draft/Published status** - Visual badges in admin dashboard
9. ✅ **Category support** - Field ready for future categorization
10. ✅ **Landing page** - Introduction page at root domain
11. ✅ **Blog listing** - Dedicated `/blogs` route

### User Experience
12. ✅ **Click-to-fullscreen images** - Modal view for images
13. ✅ **Syntax highlighting** - For code blocks
14. ✅ **Reading time** - Auto-calculated from word count
15. ✅ **Table of contents** - Auto-generated from headers
16. ✅ **Live preview** - See rendered markdown while editing
17. ✅ **Responsive design** - Mobile-first approach
18. ✅ **Search functionality** - Full-text search across blogs
19. ✅ **Blog filtering** - By tags, date, popularity
20. ✅ **Pagination** - For blog list pages

### Admin Tools
21. ✅ **Draft management** - Save and resume drafts with status tags
22. ✅ **Bulk sync** - Sync all blogs at once after git pull
23. ✅ **Image optimization** - Compress images on upload
24. ✅ **SEO metadata** - Description, keywords in frontmatter
25. ✅ **Simple authentication** - Basic password protection
26. ✅ **Dashboard stats** - Quick overview of blog performance
27. ✅ **Quick publish toggle** - Change status without full edit

### Social Features & Anti-Spam
28. ✅ **Like/dislike** - With counts and user tracking
29. ✅ **Comments** - With author name and optional email
30. ✅ **Share buttons** - Social media sharing
31. ✅ **Multi-layer rate limiting** - IP + browser fingerprinting
32. ✅ **Honeypot protection** - Against bot submissions
33. ✅ **Time-based validation** - Prevent instant submissions
34. ✅ **Content validation** - Length and pattern checking

### Additional Recommended Features

**35. ✅ RSS Feed** - `/rss.xml` for blog subscribers
- Auto-generated from published blogs
- Include full content or excerpts
- Standard RSS 2.0 format

**36. ✅ Sitemap** - `/sitemap.xml` for SEO
- Auto-generated list of all pages
- Include lastmod dates
- Help search engines index content

**37. ✅ Related Posts** - At end of each blog
- Show 3-5 related blogs based on tags/category
- Increase engagement and time on site

**38. ✅ Blog Analytics** - Basic view tracking
- Store in database: view count per blog
- Privacy-friendly (no user tracking)
- Display "X views" on blog cards

**39. ✅ Dark Mode** - Toggle for user preference
- Respect system preference by default
- Persistent user choice in localStorage
- Smooth theme transitions

**40. ✅ Copy Code Button** - On code blocks
- One-click copy for all code snippets
- "Copied!" confirmation feedback
- Improves developer experience

**41. ✅ Email Notifications** - For admin (optional)
- New comments notification
- Weekly digest of activity
- Configurable in environment variables

**42. ✅ Archive Page** - `/archive`
- Chronological list of all blogs by month/year
- Quick navigation through history
- Complementary to main blog list

**43. ✅ Print Stylesheet** - For blog posts
- Clean, readable print layout
- Remove navigation and comments
- Optimize for paper/PDF saving

## Backup & Restore Strategy

### Backup
**Blog Content (Primary):**
```bash
cd blogs/
git add .
git commit -m "Backup blogs"
git push origin main
```

**Database (Reactions & Comments):**
```bash
docker exec postgres pg_dump -U bloguser blogdb > backup.sql
```

### Restore
1. **Clone repository** with .md files
   ```bash
   git clone https://github.com/yourusername/your-blog-repo.git
   cd your-blog-repo
   ```

2. **Start services**
   ```bash
   docker-compose -f docker-compose.prod.yaml up -d
   ```

3. **Auto-sync on startup** - Backend automatically syncs all .md files to DB

4. **Restore reactions/comments** (optional)
   ```bash
   docker exec -i postgres psql -U bloguser blogdb < backup.sql
   ```

### Advantages
✅ **Git-friendly** - All content in text files
✅ **Portable** - Move blogs anywhere, just sync
✅ **No vendor lock-in** - Markdown is universal
✅ **Easy backup** - Just commit and push
✅ **Fast** - DB index for queries, file read for content
✅ **Maintainable** - Clear separation of concerns
✅ **Flexible** - Edit .md files directly or via UI
✅ **Version control** - Git history for all changes

## Implementation Phases

### Phase 1: Project Setup & Structure
1. Create folder structure
2. Set up environment files (.env.dev, .env.prod)
3. Create Docker Compose configurations
4. Initialize Next.js project
5. Initialize FastAPI project
6. Set up PostgreSQL with initial schema

### Phase 2: Backend Core Development
1. Set up FastAPI with PostgreSQL connection
2. Create database models (blogs, reactions, comments)
3. Implement markdown parser with frontmatter support
4. Build blog sync/ingester system
5. Implement file I/O operations for .md files
6. Create startup sync routine

### Phase 3: Backend API Development
1. Implement blog CRUD operations
2. Build reactions endpoints
3. Build comments endpoints
4. Implement image upload with naming convention
5. Create admin authentication
6. Add manual sync endpoint

### Phase 4: Frontend Core Development
1. Create Next.js app structure with routing
2. Build homepage with blog listing
3. Create blog reader with markdown rendering
4. Implement syntax highlighting
5. Add click-to-fullscreen image viewer
6. Build reaction and comment UI components

### Phase 5: Admin Panel Development
1. Create admin authentication page
2. Build markdown editor component
3. Implement image copy-paste functionality
4. Add slug preview and customization
5. Implement auto-save for drafts
6. Create live preview panel
7. Build blog management dashboard

### Phase 6: Integration & Styling
1. Connect frontend to backend APIs
2. Implement modern, minimal design system
3. Add responsive layouts (mobile-first)
4. Implement loading states
5. Add error handling and user feedback
6. Test image upload and display workflow

### Phase 7: Polish & Additional Features
1. Add table of contents generation
2. Implement reading time calculation
3. Add search functionality
4. Optimize image compression
5. Add SEO metadata handling
6. Implement share buttons

### Phase 8: Testing & Deployment
1. Test all CRUD operations
2. Test sync functionality (startup + manual)
3. Test image uploads and copy-paste
4. Verify markdown rendering
5. Test comments and reactions
6. Test backup and restore process
7. Test with docker-compose.dev.yaml locally
8. Deploy with docker-compose.prod.yaml
9. Verify environment variable usage

## Design Guidelines

### Visual Style
- **Clean, minimal interface** - Ample whitespace
- **Typography**: Serif for blog content (Georgia, Merriweather), Sans-serif for UI (Inter, SF Pro)
- **Subtle animations** - Smooth transitions, no jarring effects
- **Mobile-first** - Responsive from 320px onwards
- **Fast loading** - Optimized images, minimal JS

### Color Scheme (Customizable)
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --text-primary: #1a1a1a;
  --text-secondary: #6c757d;
  --accent: #0066cc;
  --accent-hover: #0052a3;
  --border: #e0e0e0;
  --code-bg: #f5f5f5;
}
```

### Component Design
- **Blog cards**: Clean cards with hover effects
- **Code blocks**: Syntax highlighted with copy button
- **Images**: Responsive with lightbox on click
- **Forms**: Simple, accessible inputs
- **Buttons**: Clear CTAs with loading states
- **Comments**: Threaded, with timestamps
- **Reactions**: Prominent like/dislike buttons

## Security Considerations

1. **Admin authentication** - Password protection for write operations
2. **SQL injection prevention** - Using SQLAlchemy ORM with parameterized queries
3. **XSS prevention** - Sanitize markdown rendering, escape user inputs
4. **Rate limiting** - For reactions, comments, and image uploads
5. **File upload validation** - Check size (max 5MB), type (images only)
6. **CSRF protection** - Token-based for state-changing operations
7. **Environment variables** - Never commit .env files
8. **Input validation** - Validate all API inputs with Pydantic
9. **User identifier hashing** - Hash IPs for privacy

## Deployment Checklist

### Development
- [ ] Start with `docker compose -f compose.dev.yaml up`
- [ ] Access landing page at `http://localhost:3000`
- [ ] Access blog list at `http://localhost:3000/blogs`
- [ ] Admin panel at `http://localhost:3000/admin`
- [ ] Backend API at `http://localhost:8000`
- [ ] Test autosave toggle (should be ON by default)
- [ ] Verify draft/published badges in admin dashboard

### Production
- [ ] Update .env.prod with secure credentials
- [ ] Set DOMAIN_NAME=n0tv1cky.com
- [ ] Set strong ADMIN_PASSWORD
- [ ] Configure volume mounts for persistence
- [ ] Start with `docker compose -f compose.prod.yaml up -d`
- [ ] Verify blog sync on startup
- [ ] Test rate limiting on comments and reactions
- [ ] Configure NGINX reverse proxy (separate task)
- [ ] Set up SSL certificates
- [ ] Configure automated backups (git + database)
- [ ] Test landing page and blog listing
- [ ] Verify RSS feed at /rss.xml
- [ ] Verify sitemap at /sitemap.xml

## Next Steps
1. Begin Phase 1: Create initial project structure
2. Set up Docker configurations (using `docker compose`)
3. Implement backend sync system
4. Build rate limiting and anti-spam features
5. Create landing page and blog listing
6. Build frontend with admin panel (autosave toggle, status badges)
7. Test locally with dev environment
8. Deploy to production
9. Set up automated backups

## Docker First Approach

All development and deployment uses **Docker** and **docker compose** (v2 syntax):

**Development:**
```bash
# Build and start all services
docker compose -f compose.dev.yaml up --build

# Start in background
docker compose -f compose.dev.yaml up -d

# View logs
docker compose -f compose.dev.yaml logs -f

# Stop services
docker compose -f compose.dev.yaml down

# Rebuild specific service
docker compose -f compose.dev.yaml up --build frontend
```

**Production:**
```bash
# Deploy
docker compose -f compose.prod.yaml up -d

# View logs
docker compose -f compose.prod.yaml logs -f backend

# Restart service
docker compose -f compose.prod.yaml restart frontend

# Stop everything
docker compose -f compose.prod.yaml down
```

**Key Principles:**
- ✅ All services run in Docker containers
- ✅ No local installations of Node.js or Python required
- ✅ Consistent environments across dev and prod
- ✅ Easy onboarding for new developers
- ✅ Volume mounts for hot-reloading in dev
- ✅ Named volumes for data persistence in prod

**Benefits:**
- 🚀 "It works on my machine" → "It works everywhere"
- 🔒 Isolated dependencies
- 📦 Easy deployment and scaling
- 🔄 Simple rollbacks with container versions
- 🧪 Easy to test and debug