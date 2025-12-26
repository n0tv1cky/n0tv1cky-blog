from fastapi import APIRouter, File, UploadFile, Header, HTTPException
import os
import datetime
from pathlib import Path
from app.auth import verify_token

router = APIRouter()

UPLOAD_DIR = './blogs/images'
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')
ADMIN_TOKEN = os.getenv('ADMIN_TOKEN')

# max size in bytes (5MB)
MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', 5 * 1024 * 1024))


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
	raise HTTPException(status_code=403, detail='Invalid admin credentials')


@router.post('/image')
async def upload_image(file: UploadFile = File(...), x_admin_password: str = Header(None), authorization: str = Header(None)):
	require_admin(x_admin_password, authorization)
	if not file.content_type.startswith('image/'):
		raise HTTPException(status_code=400, detail='Only images allowed')
	content = await file.read()
	if len(content) > MAX_UPLOAD_SIZE:
		raise HTTPException(status_code=413, detail=f'File too large. Max size is {MAX_UPLOAD_SIZE} bytes')
	ext = os.path.splitext(file.filename)[1] or '.png'
	timestamp = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
	safe_name = file.filename.replace('/', '_').replace('..', '_')
	filename = f"{timestamp}_{safe_name}"
	dest = os.path.join(UPLOAD_DIR, filename)
	with open(dest, 'wb') as f:
		f.write(content)
	url = f"/images/{filename}"
	return {'ok': True, 'url': url}
