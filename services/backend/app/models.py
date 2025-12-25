from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, Enum, ARRAY, ForeignKey
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
