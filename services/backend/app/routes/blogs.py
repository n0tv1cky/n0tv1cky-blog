from fastapi import APIRouter, HTTPException
from typing import List
import glob
import os
from app.markdown_parser import parse_markdown_file
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


def read_all_blogs(published_only: bool = True):
	"""Read all blogs, optionally filtering by published status"""
	files = glob.glob("./blogs/*.md")
	result = []
	for f in files:
		try:
			front, content = parse_markdown_file(f)
			front = front or {}
			
			# Filter by published status if requested
			if published_only and not front.get('published', False):
				continue
			
			front.setdefault('filename', os.path.basename(f))
			# Only include content for individual blog requests, not list
			# front.setdefault('content', content)  # Removed for list endpoint
			result.append(front)
		except Exception as e:
			logger.warning(f"Failed to parse blog file {f}: {e}")
			continue
	
	# Sort by published_at or created_at descending, fallback to filename
	result.sort(key=lambda x: (
		x.get('published_at') or x.get('created_at') or x.get('filename', '')
	), reverse=True)
	return result


@router.get("/", response_model=List[dict])
async def list_blogs():
	"""List all published blogs"""
	return read_all_blogs(published_only=True)


@router.get("/{slug}")
async def get_blog(slug: str):
	files = glob.glob(f"./blogs/*_{slug}.md")
	if not files:
		# try any file with slug inside
		files = [p for p in glob.glob("./blogs/*.md") if f"_{slug}.md" in p]
	if not files:
		raise HTTPException(status_code=404, detail="Blog not found")
	front, content = parse_markdown_file(files[0])
	front = front or {}
	front['content'] = content
	return front
