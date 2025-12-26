from fastapi import APIRouter, Header, HTTPException, status, Request
from app.auth import create_access_token, create_refresh_token
from app.auth_helpers import require_admin
from pydantic import BaseModel, Field, validator
import os
import yaml
import re
import logging
from app.blog_sync import sync_blogs_from_filesystem
from app.utils import get_ist_now, ist_to_iso
from app.ratelimit import rate_limiter
from app.routes.blogs import read_all_blogs

router = APIRouter()
logger = logging.getLogger(__name__)


class BlogCreate(BaseModel):
	title: str = Field(..., min_length=1, max_length=500, description="Blog title")
	slug: str = Field(..., min_length=1, max_length=255, description="URL-friendly slug")
	description: str = Field(default='', max_length=1000, description="Blog description")
	content: str = Field(..., min_length=1, description="Blog content in markdown")
	published: bool = Field(default=False, description="Published status")
	tags: list = Field(default=None, description="List of tags")
	category: str = Field(default=None, max_length=100, description="Blog category")
	
	@validator('slug')
	def validate_slug(cls, v):
		"""Validate slug is URL-safe"""
		if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', v):
			raise ValueError('Slug must be lowercase alphanumeric with hyphens only')
		return v
	
	@validator('title')
	def validate_title(cls, v):
		"""Validate title is not empty"""
		if not v or not v.strip():
			raise ValueError('Title cannot be empty')
		return v.strip()


def write_markdown_file(filename: str, front: dict, content: str):
	"""Write markdown file with frontmatter"""
	front_yaml = yaml.safe_dump(front, sort_keys=False, default_flow_style=False, allow_unicode=True)
	with open(filename, 'w', encoding='utf-8') as f:
		f.write('---\n')
		f.write(front_yaml)
		f.write('---\n\n')
		f.write(content)




class AuthRequest(BaseModel):
	password: str

@router.post('/auth')
async def admin_auth(auth_req: AuthRequest, request: Request):
	"""Admin authentication endpoint (rate limited: 3/hour per IP)"""
	# Apply rate limiting manually (decorator interferes with FastAPI parameter injection)
	from app.ratelimit import get_client_id, RATE_LIMITS, rate_limits
	import time
	client_id = get_client_id(request)
	max_calls, period = RATE_LIMITS.get('comment', (3, 3600))
	now = time.time()
	calls = rate_limits[(client_id, 'comment')]
	rate_limits[(client_id, 'comment')] = [t for t in calls if now - t < period]
	if len(rate_limits[(client_id, 'comment')]) >= max_calls:
		raise HTTPException(status_code=429, detail='Rate limit exceeded')
	rate_limits[(client_id, 'comment')].append(now)
	
	from app.auth_helpers import ADMIN_PASSWORD
	if auth_req.password != ADMIN_PASSWORD:
		raise HTTPException(status_code=401, detail='Invalid credentials')
	access = create_access_token({'sub': 'admin'})
	refresh = create_refresh_token({'sub': 'admin'})
	return {'access_token': access, 'refresh_token': refresh, 'token_type': 'bearer'}



class RefreshRequest(BaseModel):
	refresh_token: str


@router.post('/auth/refresh')
async def refresh_token(req: RefreshRequest):
	# Accept a refresh token and return a new access token
	from app.auth import verify_token
	token = req.refresh_token
	payload = verify_token(token)
	if not payload:
		raise HTTPException(status_code=401, detail='Invalid refresh token')
	# ensure token type is refresh (or allow if missing for backward compat)
	if payload.get('typ') and payload.get('typ') != 'refresh':
		raise HTTPException(status_code=401, detail='Invalid token type')
	# issue a new access token
	access = create_access_token({'sub': payload.get('sub', 'admin')})
	return {'access_token': access, 'token_type': 'bearer'}


@router.post('/blogs')
async def create_blog(payload: BlogCreate, x_admin_password: str = Header(None), authorization: str = Header(None)):
	"""Create a new blog post"""
	require_admin(x_admin_password, authorization)
	now = get_ist_now()
	timestamp = now.strftime('%Y%m%d_%H%M%S')
	filename = f"./blogs/{timestamp}_{payload.slug}.md"
	front = {
		'title': payload.title,
		'slug': payload.slug,
		'published': payload.published,
		'published_at': ist_to_iso(now) if payload.published else None,
		'created_at': ist_to_iso(now),
		'updated_at': ist_to_iso(now),
		'description': payload.description,
		'tags': payload.tags or [],
		'category': payload.category,
		'author': os.getenv('COMMIT_AUTHOR', 'admin'),
	}
	write_markdown_file(filename, front, payload.content)

	# sync to DB index
	sync_blogs_from_filesystem()
	return {'ok': True, 'filename': filename}


@router.put('/blogs/{slug}')
async def update_blog(slug: str, payload: BlogCreate, x_admin_password: str = Header(None), authorization: str = Header(None)):
	"""Update an existing blog post"""
	require_admin(x_admin_password, authorization)
	import glob
	from app.markdown_parser import parse_markdown_file
	
	# find file
	matches = glob.glob(f"./blogs/*_{slug}.md")
	if not matches:
		raise HTTPException(status_code=404, detail='Blog file not found')
	filename = matches[0]
	
	# Read existing frontmatter to preserve created_at
	existing_frontmatter, _ = parse_markdown_file(filename)
	now = get_ist_now()
	
	front = {
		'title': payload.title,
		'slug': payload.slug,
		'published': payload.published,
		'published_at': ist_to_iso(now) if payload.published and not existing_frontmatter.get('published_at') else existing_frontmatter.get('published_at'),
		'created_at': existing_frontmatter.get('created_at'),  # Preserve original creation date
		'updated_at': ist_to_iso(now),
		'description': payload.description,
		'tags': payload.tags or [],
		'category': payload.category,
		'author': existing_frontmatter.get('author', os.getenv('COMMIT_AUTHOR', 'admin')),
	}
	write_markdown_file(filename, front, payload.content)

	# sync to DB index
	sync_blogs_from_filesystem()
	return {'ok': True, 'filename': filename}


@router.post('/sync-blogs')
async def manual_sync(x_admin_password: str = Header(None), authorization: str = Header(None)):
	"""Manually sync all .md files to database"""
	require_admin(x_admin_password, authorization)
	sync_blogs_from_filesystem()
	return {'ok': True, 'message': 'Blogs synced successfully'}


@router.delete('/blogs/{slug}')
async def delete_blog(slug: str, x_admin_password: str = Header(None), authorization: str = Header(None)):
	"""Delete a blog post (with proper transaction handling)"""
	require_admin(x_admin_password, authorization)
	import glob
	import os
	from app.database import SessionLocal
	from app.models import Blog, Comment, Reaction
	
	# Find file
	matches = glob.glob(f"./blogs/*_{slug}.md")
	if not matches:
		raise HTTPException(status_code=404, detail='Blog file not found')
	filename = matches[0]
	
	# Use database transaction - delete DB first, then file
	db = SessionLocal()
	try:
		blog = db.query(Blog).filter_by(slug=slug).first()
		if blog:
			# Delete associated comments and reactions
			db.query(Comment).filter_by(blog_slug=slug).delete()
			db.query(Reaction).filter_by(blog_slug=slug).delete()
			# Delete blog
			db.delete(blog)
			db.commit()
		
		# Only delete file if database deletion succeeded
		if os.path.exists(filename):
			os.remove(filename)
	except Exception as e:
		db.rollback()
		logger.error(f"Failed to delete blog {slug}: {e}")
		raise HTTPException(status_code=500, detail=f'Failed to delete blog: {str(e)}')
	finally:
		db.close()
	
	return {'ok': True, 'message': f'Blog {slug} deleted'}


@router.patch('/blogs/{slug}/publish')
async def toggle_publish(slug: str, x_admin_password: str = Header(None), authorization: str = Header(None)):
	"""Toggle publish status of a blog"""
	require_admin(x_admin_password, authorization)
	import glob
	from app.database import SessionLocal
	from app.models import Blog
	from app.markdown_parser import parse_markdown_file
	
	# Find file
	matches = glob.glob(f"./blogs/*_{slug}.md")
	if not matches:
		raise HTTPException(status_code=404, detail='Blog file not found')
	filename = matches[0]
	
	# Read and update frontmatter
	frontmatter, content = parse_markdown_file(filename)
	new_published = not frontmatter.get('published', False)
	now = get_ist_now()
	frontmatter['published'] = new_published
	if new_published and not frontmatter.get('published_at'):
		frontmatter['published_at'] = ist_to_iso(now)
	frontmatter['updated_at'] = ist_to_iso(now)
	
	# Write back
	write_markdown_file(filename, frontmatter, content)
	
	# Update database
	db = SessionLocal()
	try:
		blog = db.query(Blog).filter_by(slug=slug).first()
		if blog:
			blog.published = new_published
			if new_published:
				blog.published_at = now
			blog.updated_at = now
			db.commit()
	finally:
		db.close()
	
	return {'ok': True, 'published': new_published}


@router.get('/blogs')
async def list_all_blogs(x_admin_password: str = Header(None), authorization: str = Header(None)):
	"""List all blogs (published and drafts) - admin only"""
	require_admin(x_admin_password, authorization)
	# Return all blogs, not just published ones
	return read_all_blogs(published_only=False)


@router.get('/drafts')
async def list_drafts(x_admin_password: str = Header(None), authorization: str = Header(None)):
	require_admin(x_admin_password, authorization)
	import glob
	import os
	from app.markdown_parser import parse_markdown_file
	
	draft_files = glob.glob("./blogs/drafts/*.md")
	drafts = []
	for file_path in draft_files:
		try:
			frontmatter, content = parse_markdown_file(file_path)
			frontmatter['filename'] = os.path.basename(file_path)
			frontmatter['content'] = content[:200] + '...' if len(content) > 200 else content
			drafts.append(frontmatter)
		except Exception:
			continue
	return drafts


@router.get('/stats')
async def get_stats(x_admin_password: str = Header(None), authorization: str = Header(None)):
	require_admin(x_admin_password, authorization)
	from app.database import SessionLocal
	from app.models import Blog, Comment, Reaction
	import glob
	
	db = SessionLocal()
	try:
		total_blogs = db.query(Blog).count()
		published_blogs = db.query(Blog).filter_by(published=True).count()
		draft_blogs = total_blogs - published_blogs
		total_comments = db.query(Comment).count()
		total_reactions = db.query(Reaction).count()
		from app.models import ReactionType
		total_likes = db.query(Reaction).filter_by(reaction_type=ReactionType.like).count()
		total_dislikes = db.query(Reaction).filter_by(reaction_type=ReactionType.dislike).count()
		
		# Count draft files
		draft_files = glob.glob("./blogs/drafts/*.md")
		draft_count = len(draft_files)
		
		return {
			'total_blogs': total_blogs,
			'published_blogs': published_blogs,
			'draft_blogs': draft_blogs,
			'draft_files': draft_count,
			'total_comments': total_comments,
			'total_reactions': total_reactions,
			'total_likes': total_likes,
			'total_dislikes': total_dislikes
		}
	finally:
		db.close()

