from fastapi import APIRouter, HTTPException
from typing import List
import glob
import os
from app.markdown_parser import parse_markdown_file

router = APIRouter()


def read_all_blogs():
	files = glob.glob("./blogs/*.md")
	result = []
	for f in files:
		try:
			front, content = parse_markdown_file(f)
			front = front or {}
			front.setdefault('filename', os.path.basename(f))
			front.setdefault('content', content)
			result.append(front)
		except Exception:
			continue
	# simple sort by filename desc
	result.sort(key=lambda x: x.get('filename', ''), reverse=True)
	return result


@router.get("/", response_model=List[dict])
async def list_blogs():
	return read_all_blogs()


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
