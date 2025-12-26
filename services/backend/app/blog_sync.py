import glob
from .markdown_parser import parse_markdown_file
from .database import SessionLocal
from .models import Blog
from sqlalchemy.orm import Session
import os
import re

def calculate_reading_time(content: str) -> int:
    """Calculate reading time in minutes based on word count (average 200 words/min)"""
    # Remove markdown syntax, code blocks, and HTML
    text = content
    # Remove code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    # Remove inline code
    text = re.sub(r'`[^`]+`', '', text)
    # Remove markdown links
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # Remove images
    text = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', '', text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Count words
    words = len(text.split())
    # Average reading speed: 200 words per minute
    reading_time = max(1, round(words / 200))
    return reading_time

def upsert_blog_metadata(frontmatter: dict, file_path: str, db: Session):
    slug = frontmatter.get('slug')
    if not slug:
        return
    # Calculate reading time if not provided
    if 'reading_time' not in frontmatter or not frontmatter.get('reading_time'):
        _, content = parse_markdown_file(file_path)
        frontmatter['reading_time'] = calculate_reading_time(content)
    
    blog = db.query(Blog).filter_by(slug=slug).first()
    if blog:
        for key, value in frontmatter.items():
            setattr(blog, key, value)
        blog.filename = os.path.basename(file_path)
    else:
        blog = Blog(**frontmatter, filename=os.path.basename(file_path))
        db.add(blog)
    db.commit()

def sync_blogs_from_filesystem():
    db = SessionLocal()
    blog_files = glob.glob("./blogs/*.md")
    for file_path in blog_files:
        frontmatter, _ = parse_markdown_file(file_path)
        upsert_blog_metadata(frontmatter, file_path, db)
    db.close()
