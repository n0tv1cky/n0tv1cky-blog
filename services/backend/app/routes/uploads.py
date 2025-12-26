from fastapi import APIRouter, File, UploadFile, Header, HTTPException, Form
import os
from pathlib import Path
from app.ratelimit import rate_limiter
from app.utils import get_ist_now, DEFAULT_MAX_UPLOAD_SIZE
from app.auth_helpers import require_admin

router = APIRouter()

UPLOAD_DIR = './blogs/images'
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

# max size in bytes (5MB)
MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', DEFAULT_MAX_UPLOAD_SIZE))


@router.post('/image')
@rate_limiter('upload')
async def upload_image(file: UploadFile = File(...), blog_slug: str = Form(None), x_admin_password: str = Header(None), authorization: str = Header(None)):
	require_admin(x_admin_password, authorization)
	if not file.content_type.startswith('image/'):
		raise HTTPException(status_code=400, detail='Only images allowed')
	content = await file.read()
	if len(content) > MAX_UPLOAD_SIZE:
		raise HTTPException(status_code=413, detail=f'File too large. Max size is {MAX_UPLOAD_SIZE} bytes')
	
	ext = os.path.splitext(file.filename)[1] or '.png'
	if not ext.startswith('.'):
		ext = '.' + ext
	timestamp = get_ist_now().strftime('%Y%m%d_%H%M%S')
	
	# Generate filename according to README spec: YYYYMMDD_HHMMSS_blog-slug_N.ext
	if blog_slug:
		# Find next sequence number for this blog using atomic file operations
		import glob
		import time
		# Use a more specific pattern to avoid race conditions
		ext_clean = ext.lstrip('.')
		pattern = os.path.join(UPLOAD_DIR, f"{timestamp}_{blog_slug}_*.{ext_clean}")
		existing = glob.glob(pattern)
		sequence = len(existing) + 1
		# Add microsecond to timestamp if sequence > 1 to avoid collisions
		if sequence > 1:
			timestamp = get_ist_now().strftime('%Y%m%d_%H%M%S_%f')[:-3]  # Include milliseconds
		filename = f"{timestamp}_{blog_slug}_{sequence}{ext}"
	else:
		# Fallback if no blog_slug provided
		safe_name = file.filename.replace('/', '_').replace('..', '_')[:50]
		filename = f"{timestamp}_{safe_name}"
	
	dest = os.path.join(UPLOAD_DIR, filename)
	with open(dest, 'wb') as f:
		f.write(content)
	url = f"/images/{filename}"
	return {'ok': True, 'url': url}
