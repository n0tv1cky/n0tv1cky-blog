# Features Documentation

## Overview
This document outlines all major features of the blog platform.

## Core Features

### Markdown-Based Content
- **Source of Truth**: All blog content stored as markdown files in `./blogs`
- **Git-Friendly**: Version control for all content
- **Frontmatter Support**: YAML metadata for each post
- **Syntax Highlighting**: Code blocks with copy button
- **Image Support**: Inline images with lightbox view

### Blog Management

#### Admin Dashboard
- View all blogs (published and drafts)
- Create new blog posts
- Edit existing posts
- Delete posts
- Publish/unpublish with confirmation
- Real-time status indicators

#### Editor Features
- Live markdown preview
- Image paste support (Ctrl+V)
- Drag & drop image upload
- Autosave drafts
- Slug preview
- Publication scheduling

### User Engagement

#### Reactions System
- Like/dislike buttons per blog
- Anonymous voting (session-based)
- Real-time count updates
- Rate limiting (5 reactions/hour)

#### Comments System
- Anonymous commenting
- Nested replies (threading)
- Timestamps with "time ago" display
- Rate limiting (10 comments/hour)
- Markdown support in comments

### Metrics Tracking

#### Blog Analytics
- Unique visitors per post
- Total page views
- Average time spent
- Scroll depth tracking
- Bounce rate calculation
- Referrer tracking

#### Admin Metrics Dashboard
- View metrics for all posts
- Filter by time period (7/30/90 days)
- Export data capabilities
- Visual charts and graphs

### RSS & SEO

#### RSS Feed
- Automatic RSS generation at `/rss.xml`
- Published posts only
- Full content or excerpts
- Standard RSS 2.0 format

#### Sitemap
- Automatic sitemap at `/sitemap.xml`
- All published posts included
- Priority and frequency hints
- Last modified timestamps

## Technical Features

### Authentication
- JWT-based admin authentication
- Password-protected admin endpoints
- Token refresh mechanism
- Secure session management

### Rate Limiting
- Per-IP rate limiting
- Configurable limits per endpoint
- Automatic cleanup of old entries
- 429 status code responses

### Database
- PostgreSQL for metadata
- SQLAlchemy ORM
- Automatic migrations via models
- Blog sync on startup

### API Design
- RESTful endpoints
- JSON responses
- Proper HTTP status codes
- Error handling with details
- CORS support

### Frontend Architecture
- Next.js 14 (App Router)
- React Server Components
- Client-side hydration
- Dark mode support
- Responsive design
- Image optimization

## Feature Status

### ✅ Implemented
- Markdown blog system
- Admin dashboard with publish/unpublish
- User reactions (like/dislike)
- Comments with threading
- Metrics tracking and dashboard
- Image upload and management
- RSS feed generation
- Dark mode theme
- Mobile responsive design

### 🚧 Planned
- Search functionality
- Blog categories/tags filtering
- Email notifications for comments
- Social media sharing buttons
- Reading progress indicator
- Related posts suggestions
- Comment moderation dashboard
- Multi-author support

### 💡 Potential Future
- Newsletter integration
- Code playground for demos
- Table of contents auto-generation
- Series/collection grouping
- Bookmark/save for later
- Print-friendly view
- PDF export
- i18n support
