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

