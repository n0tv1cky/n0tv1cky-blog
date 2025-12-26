from fastapi import APIRouter, Header, HTTPException, status
from app.auth import create_access_token, verify_token, create_refresh_token
from pydantic import BaseModel
import os
import datetime
import yaml
from app.blog_sync import sync_blogs_from_filesystem

router = APIRouter()

ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')
ADMIN_TOKEN = os.getenv('ADMIN_TOKEN')


class BlogCreate(BaseModel):
	title: str
	slug: str
	description: str = ''
	content: str
	published: bool = False
	tags: list = None
	category: str = None


def write_markdown_file(filename: str, front: dict, content: str):
	front_yaml = yaml.safe_dump(front, sort_keys=False)
	with open(filename, 'w', encoding='utf-8') as f:
		f.write('---\n')
		f.write(front_yaml)
		f.write('---\n\n')
		f.write(content)


def require_admin(password: str = None, authorization: str = None):
	# Accept either X-ADMIN-PASSWORD or Authorization: Bearer <token>
	if password and password == ADMIN_PASSWORD:
		return
	if authorization and authorization.startswith('Bearer '):
		token = authorization.split(' ', 1)[1].strip()
		if ADMIN_TOKEN and token == ADMIN_TOKEN:
			return
		# verify JWT
		payload = verify_token(token)
		if payload:
			return
	raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Invalid admin credentials')




@router.post('/auth')
async def admin_auth(password: str):
	# Simple login endpoint: returns JWT if password matches
	if password != ADMIN_PASSWORD:
		raise HTTPException(status_code=401, detail='Invalid credentials')
	access = create_access_token({'sub': 'admin'})
	refresh = create_refresh_token({'sub': 'admin'})
	return {'access_token': access, 'refresh_token': refresh, 'token_type': 'bearer'}



class RefreshRequest(BaseModel):
	refresh_token: str


@router.post('/auth/refresh')
async def refresh_token(req: RefreshRequest):
	# Accept a refresh token and return a new access token
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
	require_admin(x_admin_password, authorization)
	timestamp = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
	filename = f"./blogs/{timestamp}_{payload.slug}.md"
	front = {
		'title': payload.title,
		'slug': payload.slug,
		'published': payload.published,
		'published_at': datetime.datetime.utcnow().isoformat() if payload.published else None,
		'created_at': datetime.datetime.utcnow().isoformat(),
		'updated_at': datetime.datetime.utcnow().isoformat(),
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
	require_admin(x_admin_password, authorization)
	# find file
	import glob
	matches = glob.glob(f"./blogs/*_{slug}.md")
	if not matches:
		raise HTTPException(status_code=404, detail='Blog file not found')
	filename = matches[0]
	front = {
		'title': payload.title,
		'slug': payload.slug,
		'published': payload.published,
		'published_at': datetime.datetime.utcnow().isoformat() if payload.published else None,
		'created_at': None,
		'updated_at': datetime.datetime.utcnow().isoformat(),
		'description': payload.description,
		'tags': payload.tags or [],
		'category': payload.category,
		'author': os.getenv('COMMIT_AUTHOR', 'admin'),
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
	require_admin(x_admin_password, authorization)
	import glob
	import os
	from app.database import SessionLocal
	from app.models import Blog
	
	# Find file
	matches = glob.glob(f"./blogs/*_{slug}.md")
	if not matches:
		raise HTTPException(status_code=404, detail='Blog file not found')
	filename = matches[0]
	
	# Delete file
	if os.path.exists(filename):
		os.remove(filename)
	
	# Delete from database
	db = SessionLocal()
	try:
		blog = db.query(Blog).filter_by(slug=slug).first()
		if blog:
			db.delete(blog)
			db.commit()
	finally:
		db.close()
	
	return {'ok': True, 'message': f'Blog {slug} deleted'}


@router.patch('/blogs/{slug}/publish')
async def toggle_publish(slug: str, x_admin_password: str = Header(None), authorization: str = Header(None)):
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
	frontmatter['published'] = new_published
	if new_published and not frontmatter.get('published_at'):
		frontmatter['published_at'] = datetime.datetime.utcnow().isoformat()
	frontmatter['updated_at'] = datetime.datetime.utcnow().isoformat()
	
	# Write back
	write_markdown_file(filename, frontmatter, content)
	
	# Update database
	db = SessionLocal()
	try:
		blog = db.query(Blog).filter_by(slug=slug).first()
		if blog:
			blog.published = new_published
			if new_published:
				blog.published_at = datetime.datetime.utcnow()
			blog.updated_at = datetime.datetime.utcnow()
			db.commit()
	finally:
		db.close()
	
	return {'ok': True, 'published': new_published}


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
		total_likes = db.query(Reaction).filter_by(reaction_type='like').count()
		total_dislikes = db.query(Reaction).filter_by(reaction_type='dislike').count()
		
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

