from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, timedelta
from typing import Optional
from ..database import get_db
from ..models import UserSession, PageView, InteractionEvent
from ..schemas import (
    SessionCreate, PageViewCreate, PageViewUpdate, 
    InteractionEventCreate, MetricsResponse
)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.post("/session", status_code=201)
async def create_or_update_session(
    request: Request,
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
async def track_page_view(
    request: Request,
    page_view_data: PageViewCreate,
    db: Session = Depends(get_db)
):
    """Track a new page view."""
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
async def update_page_view(
    request: Request,
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
async def track_interaction(
    request: Request,
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
    
    unique_users = db.query(distinct(PageView.session_id)).filter(
        PageView.blog_slug == slug,
        PageView.viewed_at >= start_date
    ).count()
    
    total_views = len(page_views)
    avg_time = sum(pv.time_spent or 0 for pv in page_views) / total_views
    avg_scroll = sum(pv.scroll_depth or 0 for pv in page_views) / total_views
    bounces = sum(1 for pv in page_views if pv.is_bounce)
    bounce_rate = (bounces / total_views) * 100 if total_views > 0 else 0
    
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
    
    blog_slugs = db.query(distinct(PageView.blog_slug)).filter(
        PageView.viewed_at >= start_date
    ).all()
    
    results = []
    for (slug,) in blog_slugs:
        metrics = await get_blog_metrics(slug, days, db)
        results.append(metrics)
    
    # Sort by total views descending
    results.sort(key=lambda x: x.total_views, reverse=True)
    
    return {
        "period_start": start_date,
        "period_end": end_date,
        "blogs": results
    }
