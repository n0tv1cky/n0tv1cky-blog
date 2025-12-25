import glob
from .markdown_parser import parse_markdown_file
from .database import SessionLocal
from .models import Blog
from sqlalchemy.orm import Session
import os

def upsert_blog_metadata(frontmatter: dict, file_path: str, db: Session):
    slug = frontmatter.get('slug')
    if not slug:
        return
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
