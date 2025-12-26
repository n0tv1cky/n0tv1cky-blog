import glob
from .markdown_parser import parse_markdown_file
from .database import SessionLocal
from .models import Blog
from sqlalchemy.orm import Session
import os
import re
import logging

logger = logging.getLogger(__name__)

def calculate_reading_time(content: str) -> int:
    """Calculate reading time in minutes based on word count (average 200 words/min)"""
    READING_WORDS_PER_MINUTE = 200  # Avoid circular import
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
    # Average reading speed
    reading_time = max(1, round(words / READING_WORDS_PER_MINUTE))
    return reading_time

def upsert_blog_metadata(frontmatter: dict, content: str, file_path: str, db: Session):
    """Upsert blog metadata to database (content already parsed to avoid double read)"""
    slug = frontmatter.get('slug')
    if not slug:
        logger.warning(f"Blog file {file_path} has no slug in frontmatter, skipping")
        return
    
    # Calculate reading time if not provided
    if 'reading_time' not in frontmatter or not frontmatter.get('reading_time'):
        frontmatter['reading_time'] = calculate_reading_time(content)
    
    # Only include fields that exist in the Blog model
    # Valid Blog model fields: id, slug, title, filename, description, published, published_at, 
    # created_at, updated_at, reading_time, tags, category
    valid_fields = {
        'slug', 'title', 'filename', 'description', 'published', 'published_at',
        'created_at', 'updated_at', 'reading_time', 'tags', 'category'
    }
    
    # Filter frontmatter to only include valid fields
    filtered_frontmatter = {k: v for k, v in frontmatter.items() if k in valid_fields}
    filtered_frontmatter['filename'] = os.path.basename(file_path)
    
    blog = db.query(Blog).filter_by(slug=slug).first()
    if blog:
        for key, value in filtered_frontmatter.items():
            if key != 'id':  # Don't overwrite ID
                setattr(blog, key, value)
    else:
        blog = Blog(**filtered_frontmatter)
        db.add(blog)
    db.commit()

def sync_blogs_from_filesystem():
    """Sync all markdown files to database"""
    db = SessionLocal()
    blog_files = glob.glob("./blogs/*.md")
    synced = 0
    errors = 0
    for file_path in blog_files:
        try:
            frontmatter, content = parse_markdown_file(file_path)
            upsert_blog_metadata(frontmatter, content, file_path, db)
            synced += 1
        except Exception as e:
            logger.error(f"Failed to sync blog file {file_path}: {e}")
            errors += 1
    db.close()
    logger.info(f"Blog sync completed: {synced} synced, {errors} errors")
    return {'synced': synced, 'errors': errors}
