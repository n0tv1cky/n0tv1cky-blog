"""
Shared authentication helpers
"""
from fastapi import Header, HTTPException, status
import os
from app.auth import verify_token

ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')
ADMIN_TOKEN = os.getenv('ADMIN_TOKEN')


def require_admin(password: str = None, authorization: str = None):
	"""Require admin authentication via password, static token, or JWT"""
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

