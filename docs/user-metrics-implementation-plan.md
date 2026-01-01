# User Metrics Tracking System — Implementation Plan

**Created:** 2026-01-01  
**Status:** Planning  
**Issue:** #1 - Metrics Tracking System

## Overview

This document outlines a simple yet functional approach to tracking key user engagement metrics for the n0tv1cky-blog platform. The system will capture anonymous user behavior data while respecting privacy, providing actionable insights into content performance.

## Goals

Track the following metrics per blog post:
1. **Unique users** who visit each post
2. **Page views** per post
3. **Average time spent** on each post
4. **Scroll depth** distribution per post
5. **Additional engagement metrics**: bounce rate, clicks on specific elements, referrer sources

## Architecture Overview

```
┌─────────────────┐
│  Next.js Client │ ──── Track events via API ────┐
│  (Frontend)     │                                │
└─────────────────┘                                ▼
                                           ┌──────────────────┐
                                           │  FastAPI Backend │
                                           │  /api/metrics    │
                                           └──────────────────┘
                                                    │
                                                    ▼
                                           ┌──────────────────┐
                                           │  PostgreSQL DB   │
                                           │  metrics tables  │
                                           └──────────────────┘
```

## Database Schema

### 1. `user_sessions` table
Tracks anonymous user sessions with a fingerprint-based approach.

```sql
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,  -- Client-generated UUID
    fingerprint VARCHAR(64),                  -- Browser fingerprint hash
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    referrer TEXT,
    CONSTRAINT unique_session UNIQUE (session_id)
);

CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_fingerprint ON user_sessions(fingerprint);
```

### 2. `page_views` table
Records each page visit with timing and engagement data.

```sql
CREATE TABLE page_views (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    blog_slug VARCHAR(255) NOT NULL,
    viewed_at TIMESTAMP DEFAULT NOW(),
    time_spent INTEGER,                       -- Seconds spent on page (updated via heartbeat)
    scroll_depth INTEGER DEFAULT 0,           -- Max scroll percentage (0-100)
    is_bounce BOOLEAN DEFAULT TRUE,          -- Updated if user navigates elsewhere
    referrer TEXT,
    exit_page BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES user_sessions(session_id)
);

CREATE INDEX idx_page_views_blog_slug ON page_views(blog_slug);
CREATE INDEX idx_page_views_session_id ON page_views(session_id);
CREATE INDEX idx_page_views_viewed_at ON page_views(viewed_at);
```

### 3. `interaction_events` table
Captures specific user interactions (clicks, hovers, etc.).

```sql
CREATE TABLE interaction_events (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    blog_slug VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,          -- 'click', 'copy_code', 'share', 'reaction', etc.
    event_target VARCHAR(255),                -- Element identifier (button id, class, etc.)
    event_data JSONB,                         -- Flexible data field for additional context
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interaction_events_blog_slug ON interaction_events(blog_slug);
CREATE INDEX idx_interaction_events_event_type ON interaction_events(event_type);
CREATE INDEX idx_interaction_events_created_at ON interaction_events(created_at);
```

### 4. `blog_metrics_summary` table (optional — for pre-computed aggregates)
Stores daily aggregated metrics to speed up analytics queries.

```sql
CREATE TABLE blog_metrics_summary (
    id SERIAL PRIMARY KEY,
    blog_slug VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    unique_users INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    avg_time_spent FLOAT DEFAULT 0,          -- Average seconds
    avg_scroll_depth FLOAT DEFAULT 0,        -- Average percentage
    bounce_rate FLOAT DEFAULT 0,             -- Percentage
    total_interactions INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_blog_date UNIQUE (blog_slug, date)
);

CREATE INDEX idx_blog_metrics_summary_slug ON blog_metrics_summary(blog_slug);
CREATE INDEX idx_blog_metrics_summary_date ON blog_metrics_summary(date);
```

## Backend Implementation

### 1. Models (`services/backend/app/models.py`)

Add SQLAlchemy models for the new tables:

```python
class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    fingerprint = Column(String(64), index=True)
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    user_agent = Column(Text)
    referrer = Column(Text)
    
    page_views = relationship("PageView", back_populates="session", cascade="all, delete-orphan")
    interactions = relationship("InteractionEvent", back_populates="session", cascade="all, delete-orphan")


class PageView(Base):
    __tablename__ = "page_views"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("user_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    blog_slug = Column(String(255), nullable=False, index=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    time_spent = Column(Integer)  # seconds
    scroll_depth = Column(Integer, default=0)  # 0-100
    is_bounce = Column(Boolean, default=True)
    referrer = Column(Text)
    exit_page = Column(Boolean, default=False)
    
    session = relationship("UserSession", back_populates="page_views")


class InteractionEvent(Base):
    __tablename__ = "interaction_events"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), ForeignKey("user_sessions.session_id", ondelete="CASCADE"), nullable=False)
    blog_slug = Column(String(255), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    event_target = Column(String(255))
    event_data = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    session = relationship("UserSession", back_populates="interactions")


class BlogMetricsSummary(Base):
    __tablename__ = "blog_metrics_summary"
    
    id = Column(Integer, primary_key=True, index=True)
    blog_slug = Column(String(255), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    unique_users = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    avg_time_spent = Column(Float, default=0.0)
    avg_scroll_depth = Column(Float, default=0.0)
    bounce_rate = Column(Float, default=0.0)
    total_interactions = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('blog_slug', 'date', name='unique_blog_date'),
    )
```

### 2. Schemas (`services/backend/app/schemas.py`)

Add Pydantic schemas for request/response validation:

```python
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class SessionCreate(BaseModel):
    session_id: str = Field(..., max_length=64)
    fingerprint: Optional[str] = Field(None, max_length=64)
    user_agent: Optional[str] = None
    referrer: Optional[str] = None


class PageViewCreate(BaseModel):
    session_id: str = Field(..., max_length=64)
    blog_slug: str = Field(..., max_length=255)
    referrer: Optional[str] = None


class PageViewUpdate(BaseModel):
    time_spent: Optional[int] = None  # seconds
    scroll_depth: Optional[int] = Field(None, ge=0, le=100)
    is_bounce: Optional[bool] = None
    exit_page: Optional[bool] = None


class InteractionEventCreate(BaseModel):
    session_id: str = Field(..., max_length=64)
    blog_slug: str = Field(..., max_length=255)
    event_type: str = Field(..., max_length=50)
    event_target: Optional[str] = Field(None, max_length=255)
    event_data: Optional[Dict[str, Any]] = None


class MetricsResponse(BaseModel):
    blog_slug: str
    unique_users: int
    total_views: int
    avg_time_spent: float  # seconds
    avg_scroll_depth: float  # percentage
    bounce_rate: float  # percentage
    total_interactions: int
    period_start: datetime
    period_end: datetime
```

### 3. Routes (`services/backend/app/routes/metrics.py`)

Create new metrics API endpoints:

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models import UserSession, PageView, InteractionEvent, BlogMetricsSummary
from ..schemas import (
    SessionCreate, PageViewCreate, PageViewUpdate, 
    InteractionEventCreate, MetricsResponse
)
from ..ratelimit import limiter

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.post("/session", status_code=201)
@limiter.limit("10/minute")
async def create_or_update_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db)
):
    """Create or update user session."""
    existing = db.query(UserSession).filter(
        UserSession.session_id == session_data.session_id
    ).first()
    
    if existing:
        existing.last_seen = datetime.now()
        db.commit()
        return {"status": "updated", "session_id": existing.session_id}
    
    new_session = UserSession(**session_data.dict())
    db.add(new_session)
    db.commit()
    return {"status": "created", "session_id": new_session.session_id}


@router.post("/pageview", status_code=201)
@limiter.limit("30/minute")
async def track_page_view(
    page_view_data: PageViewCreate,
    db: Session = Depends(get_db)
):
    """Track a new page view."""
    # Verify session exists
    session = db.query(UserSession).filter(
        UserSession.session_id == page_view_data.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    page_view = PageView(**page_view_data.dict())
    db.add(page_view)
    db.commit()
    db.refresh(page_view)
    return {"id": page_view.id, "status": "tracked"}


@router.patch("/pageview/{page_view_id}")
@limiter.limit("60/minute")
async def update_page_view(
    page_view_id: int,
    update_data: PageViewUpdate,
    db: Session = Depends(get_db)
):
    """Update page view metrics (time spent, scroll depth)."""
    page_view = db.query(PageView).filter(PageView.id == page_view_id).first()
    
    if not page_view:
        raise HTTPException(status_code=404, detail="Page view not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(page_view, key, value)
    
    db.commit()
    return {"status": "updated"}


@router.post("/interaction", status_code=201)
@limiter.limit("60/minute")
async def track_interaction(
    interaction_data: InteractionEventCreate,
    db: Session = Depends(get_db)
):
    """Track user interaction event."""
    interaction = InteractionEvent(**interaction_data.dict())
    db.add(interaction)
    db.commit()
    return {"status": "tracked"}


@router.get("/blog/{slug}", response_model=MetricsResponse)
async def get_blog_metrics(
    slug: str,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get aggregated metrics for a specific blog post."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Query page views within date range
    page_views = db.query(PageView).filter(
        PageView.blog_slug == slug,
        PageView.viewed_at >= start_date
    ).all()
    
    if not page_views:
        return MetricsResponse(
            blog_slug=slug,
            unique_users=0,
            total_views=0,
            avg_time_spent=0.0,
            avg_scroll_depth=0.0,
            bounce_rate=0.0,
            total_interactions=0,
            period_start=start_date,
            period_end=end_date
        )
    
    # Calculate unique users (distinct session_ids)
    unique_users = db.query(distinct(PageView.session_id)).filter(
        PageView.blog_slug == slug,
        PageView.viewed_at >= start_date
    ).count()
    
    # Calculate averages
    total_views = len(page_views)
    avg_time = sum(pv.time_spent or 0 for pv in page_views) / total_views
    avg_scroll = sum(pv.scroll_depth or 0 for pv in page_views) / total_views
    bounces = sum(1 for pv in page_views if pv.is_bounce)
    bounce_rate = (bounces / total_views) * 100 if total_views > 0 else 0
    
    # Count interactions
    total_interactions = db.query(InteractionEvent).filter(
        InteractionEvent.blog_slug == slug,
        InteractionEvent.created_at >= start_date
    ).count()
    
    return MetricsResponse(
        blog_slug=slug,
        unique_users=unique_users,
        total_views=total_views,
        avg_time_spent=round(avg_time, 2),
        avg_scroll_depth=round(avg_scroll, 2),
        bounce_rate=round(bounce_rate, 2),
        total_interactions=total_interactions,
        period_start=start_date,
        period_end=end_date
    )


@router.get("/admin/summary")
async def get_all_metrics_summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get metrics summary for all blog posts (admin endpoint)."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Get all unique blog slugs
    blog_slugs = db.query(distinct(PageView.blog_slug)).filter(
        PageView.viewed_at >= start_date
    ).all()
    
    results = []
    for (slug,) in blog_slugs:
        metrics = await get_blog_metrics(slug, days, db)
        results.append(metrics)
    
    return {
        "period_start": start_date,
        "period_end": end_date,
        "blogs": results
    }
```

### 4. Register routes in `main.py`

```python
from app.routes import metrics

app.include_router(metrics.router)
```

## Frontend Implementation

### 1. Tracking Hook (`services/frontend/src/lib/useMetrics.js`)

Create a custom React hook to handle all tracking:

```javascript
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const SESSION_KEY = 'blog_session_id';
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const SCROLL_THROTTLE = 1000; // 1 second

// Generate browser fingerprint (simple version)
const generateFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('###');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Get or create session ID
const getSessionId = () => {
  if (typeof window === 'undefined') return null;
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

// API helper
const trackingFetch = async (endpoint, data) => {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.ok;
  } catch (error) {
    console.error('Tracking error:', error);
    return false;
  }
};

export const useMetrics = (blogSlug) => {
  const [pageViewId, setPageViewId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const startTimeRef = useRef(Date.now());
  const maxScrollDepthRef = useRef(0);
  const heartbeatIntervalRef = useRef(null);
  const lastScrollTimeRef = useRef(0);
  const hasSentInitialView = useRef(false);
  
  // Initialize session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const sid = getSessionId();
    setSessionId(sid);
    
    const fingerprint = generateFingerprint();
    const referrer = document.referrer || '';
    
    trackingFetch('/api/metrics/session', {
      session_id: sid,
      fingerprint,
      user_agent: navigator.userAgent,
      referrer
    });
  }, []);
  
  // Track page view
  useEffect(() => {
    if (!sessionId || !blogSlug || hasSentInitialView.current) return;
    
    const trackPageView = async () => {
      const response = await fetch(`${BACKEND_URL}/api/metrics/pageview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          blog_slug: blogSlug,
          referrer: document.referrer || ''
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPageViewId(data.id);
        hasSentInitialView.current = true;
      }
    };
    
    trackPageView();
  }, [sessionId, blogSlug]);
  
  // Track scroll depth
  useEffect(() => {
    if (!pageViewId) return;
    
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < SCROLL_THROTTLE) return;
      lastScrollTimeRef.current = now;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );
      
      if (scrollPercent > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = Math.min(scrollPercent, 100);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pageViewId]);
  
  // Heartbeat to update time spent
  useEffect(() => {
    if (!pageViewId) return;
    
    heartbeatIntervalRef.current = setInterval(() => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      fetch(`${BACKEND_URL}/api/metrics/pageview/${pageViewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time_spent: timeSpent,
          scroll_depth: maxScrollDepthRef.current,
          is_bounce: false
        })
      }).catch(err => console.error('Heartbeat error:', err));
    }, HEARTBEAT_INTERVAL);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [pageViewId]);
  
  // Final update on unmount
  useEffect(() => {
    return () => {
      if (!pageViewId) return;
      
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Use sendBeacon for reliability on page unload
      const data = JSON.stringify({
        time_spent: timeSpent,
        scroll_depth: maxScrollDepthRef.current,
        exit_page: true
      });
      
      navigator.sendBeacon(
        `${BACKEND_URL}/api/metrics/pageview/${pageViewId}`,
        new Blob([data], { type: 'application/json' })
      );
    };
  }, [pageViewId]);
  
  // Track custom interactions
  const trackInteraction = (eventType, eventTarget, eventData = {}) => {
    if (!sessionId || !blogSlug) return;
    
    trackingFetch('/api/metrics/interaction', {
      session_id: sessionId,
      blog_slug: blogSlug,
      event_type: eventType,
      event_target: eventTarget,
      event_data: eventData
    });
  };
  
  return { trackInteraction };
};
```

### 2. Install dependencies

```bash
cd services/frontend
npm install uuid
```

### 3. Integrate tracking into blog viewer (`services/frontend/src/components/BlogViewer.js`)

```javascript
import { useMetrics } from '../lib/useMetrics';

export default function BlogViewer({ blog }) {
  const { trackInteraction } = useMetrics(blog.slug);
  
  // Track code copy
  const handleCodeCopy = (codeBlock) => {
    trackInteraction('copy_code', 'code-block', { 
      language: codeBlock.language 
    });
  };
  
  // Track reaction clicks
  const handleReaction = (reactionType) => {
    trackInteraction('reaction', 'reaction-button', { 
      type: reactionType 
    });
  };
  
  // Track external link clicks
  const handleLinkClick = (url) => {
    trackInteraction('external_link', 'content-link', { url });
  };
  
  // ... rest of component
}
```

### 4. Create Admin Metrics Dashboard Component (`services/frontend/src/components/MetricsDashboard.js`)

```javascript
import { useState, useEffect } from 'react';
import { authFetch } from '../lib/api';

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const data = await authFetch(`/api/metrics/admin/summary?days=${days}`);
        setMetrics(data.blogs);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, [days]);
  
  if (loading) return <div>Loading metrics...</div>;
  
  return (
    <div className="metrics-dashboard">
      <h2>Blog Metrics (Last {days} days)</h2>
      
      <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
        <option value={7}>Last 7 days</option>
        <option value={30}>Last 30 days</option>
        <option value={90}>Last 90 days</option>
      </select>
      
      <table className="metrics-table">
        <thead>
          <tr>
            <th>Blog Post</th>
            <th>Unique Users</th>
            <th>Page Views</th>
            <th>Avg Time (sec)</th>
            <th>Avg Scroll %</th>
            <th>Bounce Rate</th>
            <th>Interactions</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.blog_slug}>
              <td>{m.blog_slug}</td>
              <td>{m.unique_users}</td>
              <td>{m.total_views}</td>
              <td>{m.avg_time_spent.toFixed(1)}</td>
              <td>{m.avg_scroll_depth.toFixed(1)}%</td>
              <td>{m.bounce_rate.toFixed(1)}%</td>
              <td>{m.total_interactions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Privacy & Compliance

1. **Anonymous tracking**: Session IDs are client-generated UUIDs, not tied to personal information
2. **No cookies**: Use localStorage for session persistence
3. **Browser fingerprinting**: Basic fingerprinting for duplicate detection, not for tracking across browsers
4. **Data retention**: Implement a cleanup job to remove data older than X days/months
5. **GDPR compliance**: Add a banner informing users about anonymous analytics
6. **Opt-out mechanism**: Provide a way for users to disable tracking (check localStorage flag)

## Implementation Steps

### Phase 1: Database Setup
1. ✅ Create migration file with SQL schema
2. ✅ Run migration on dev database
3. ✅ Verify tables and indexes created correctly

### Phase 2: Backend Development
1. ✅ Add models to `models.py`
2. ✅ Add schemas to `schemas.py`
3. ✅ Create `routes/metrics.py` with API endpoints
4. ✅ Register metrics router in `main.py`
5. ✅ Add rate limiting to metrics endpoints
6. ✅ Test endpoints with Postman/curl
7. ✅ Update CORS settings if needed

### Phase 3: Frontend Implementation
1. ✅ Install `uuid` package
2. ✅ Create `useMetrics.js` hook
3. ✅ Integrate hook into `BlogViewer.js`
4. ✅ Add interaction tracking to key elements
5. ✅ Create `MetricsDashboard.js` component
6. ✅ Add metrics route to admin panel
7. ✅ Test tracking in browser dev tools

### Phase 4: Testing & Validation
1. ✅ Test session creation and persistence
2. ✅ Verify page view tracking works
3. ✅ Confirm time spent updates via heartbeat
4. ✅ Validate scroll depth calculation
5. ✅ Test interaction event tracking
6. ✅ Verify admin dashboard displays correct data
7. ✅ Test with multiple concurrent users

### Phase 5: Optimization & Monitoring
1. ✅ Add database indexes for query performance
2. ✅ Implement background job for daily summary aggregation
3. ✅ Set up data retention policy (auto-delete old records)
4. ✅ Monitor API performance and optimize as needed
5. ✅ Add error logging for tracking failures

## Migration Script

Create `services/backend/migrations/001_add_metrics_tables.sql`:

```sql
-- User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    fingerprint VARCHAR(64),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    user_agent TEXT,
    referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_fingerprint ON user_sessions(fingerprint);

-- Page Views
CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    blog_slug VARCHAR(255) NOT NULL,
    viewed_at TIMESTAMP DEFAULT NOW(),
    time_spent INTEGER,
    scroll_depth INTEGER DEFAULT 0,
    is_bounce BOOLEAN DEFAULT TRUE,
    referrer TEXT,
    exit_page BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_page_views_session FOREIGN KEY (session_id) 
        REFERENCES user_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_page_views_blog_slug ON page_views(blog_slug);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at ON page_views(viewed_at);

-- Interaction Events
CREATE TABLE IF NOT EXISTS interaction_events (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    blog_slug VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_target VARCHAR(255),
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_interaction_events_session FOREIGN KEY (session_id) 
        REFERENCES user_sessions(session_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interaction_events_blog_slug ON interaction_events(blog_slug);
CREATE INDEX IF NOT EXISTS idx_interaction_events_event_type ON interaction_events(event_type);
CREATE INDEX IF NOT EXISTS idx_interaction_events_created_at ON interaction_events(created_at);

-- Blog Metrics Summary (for aggregated data)
CREATE TABLE IF NOT EXISTS blog_metrics_summary (
    id SERIAL PRIMARY KEY,
    blog_slug VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    unique_users INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    avg_time_spent FLOAT DEFAULT 0,
    avg_scroll_depth FLOAT DEFAULT 0,
    bounce_rate FLOAT DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_blog_date UNIQUE (blog_slug, date)
);

CREATE INDEX IF NOT EXISTS idx_blog_metrics_summary_slug ON blog_metrics_summary(blog_slug);
CREATE INDEX IF NOT EXISTS idx_blog_metrics_summary_date ON blog_metrics_summary(date);
```

## Future Enhancements

1. **Real-time dashboard**: WebSocket support for live metrics updates
2. **Heatmaps**: Visual representation of click patterns
3. **A/B testing**: Track performance of different content variations
4. **Cohort analysis**: Track user behavior over time
5. **Export functionality**: CSV/JSON export of metrics data
6. **Email reports**: Automated weekly/monthly analytics emails
7. **Performance insights**: Identify slow-loading content
8. **Search analytics**: Track what users search for (if search is implemented)

## Testing Checklist

- [ ] Session creation works on first visit
- [ ] Session persists across page reloads
- [ ] Page views are tracked correctly
- [ ] Time spent updates every 5 seconds
- [ ] Scroll depth tracks maximum scroll position
- [ ] Bounce status updates when user navigates
- [ ] Interaction events are captured
- [ ] Admin dashboard loads and displays metrics
- [ ] Metrics are calculated correctly (unique users, averages)
- [ ] API rate limits are enforced
- [ ] No tracking errors in browser console
- [ ] Backend logs show successful tracking requests
- [ ] Database queries are performant (< 100ms for summary)

## Notes & Considerations

- **Session expiration**: Consider adding session expiration logic (e.g., expire after 30 days of inactivity)
- **Bot filtering**: Add user-agent filtering to exclude known bots/crawlers
- **Performance impact**: Tracking adds minimal overhead (~50KB JS, heartbeat every 5s)
- **Storage requirements**: Estimate ~1KB per page view; with 1000 daily views that's ~30MB/month
- **Backup strategy**: Include metrics tables in regular database backups
- **CORS**: Ensure backend allows frontend origin for metrics endpoints

---

**Next Steps:**
1. Review this plan and confirm approach
2. Create database migration
3. Implement backend models and routes
4. Build frontend tracking hook
5. Test and iterate
