from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import enum

class ReactionType(str, enum.Enum):
    like = "like"
    dislike = "dislike"

class BlogBase(BaseModel):
    slug: str
    title: str
    filename: str
    description: Optional[str]
    published: bool = False
    published_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    reading_time: Optional[int]
    tags: Optional[List[str]]
    category: Optional[str]

class BlogCreate(BlogBase):
    pass

class BlogOut(BlogBase):
    class Config:
        orm_mode = True

class ReactionBase(BaseModel):
    blog_slug: str
    user_identifier: str
    reaction_type: ReactionType

class ReactionCreate(ReactionBase):
    pass

class ReactionOut(ReactionBase):
    created_at: Optional[datetime]
    class Config:
        orm_mode = True

class CommentBase(BaseModel):
    blog_slug: str
    author_name: str
    author_email: Optional[EmailStr]
    content: str

class CommentCreate(BaseModel):
    # blog_slug comes from URL path, not body
    author_name: str
    author_email: Optional[EmailStr] = None
    content: str

class CommentOut(CommentBase):
    id: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        orm_mode = True

# Metrics Schemas
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
    time_spent: Optional[int] = None
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
    avg_time_spent: float
    avg_scroll_depth: float
    bounce_rate: float
    total_interactions: int
    period_start: datetime
    period_end: datetime
