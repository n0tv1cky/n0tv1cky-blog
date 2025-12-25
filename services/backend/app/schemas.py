from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
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

class CommentCreate(CommentBase):
    pass

class CommentOut(CommentBase):
    id: str
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    class Config:
        orm_mode = True
