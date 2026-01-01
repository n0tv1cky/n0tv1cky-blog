from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, Enum, ARRAY, ForeignKey, Date, Float, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .database import Base
import enum

class ReactionType(enum.Enum):
    like = "like"
    dislike = "dislike"

class Blog(Base):
    __tablename__ = "blogs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False)
    filename = Column(String(500), nullable=False)
    description = Column(Text)
    published = Column(Boolean, default=False)
    published_at = Column(DateTime)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    reading_time = Column(Integer)
    tags = Column(ARRAY(Text))
    category = Column(String(100))
    reactions = relationship("Reaction", back_populates="blog")
    comments = relationship("Comment", back_populates="blog")

class Reaction(Base):
    __tablename__ = "reactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blog_slug = Column(String(255), ForeignKey("blogs.slug"), nullable=False)
    user_identifier = Column(String(255), nullable=False)
    reaction_type = Column(Enum(ReactionType), nullable=False)
    created_at = Column(DateTime)
    blog = relationship("Blog", back_populates="reactions")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blog_slug = Column(String(255), ForeignKey("blogs.slug"), nullable=False)
    author_name = Column(String(100), nullable=False)
    author_email = Column(String(255))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
    blog = relationship("Blog", back_populates="comments")

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
    time_spent = Column(Integer)
    scroll_depth = Column(Integer, default=0)
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
