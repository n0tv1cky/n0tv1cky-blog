from fastapi import APIRouter, HTTPException, Header, Request
from app.database import SessionLocal
from app.models import Comment, Blog
from app.schemas import CommentCreate, CommentOut
from app.ratelimit import get_client_id
from app.utils import get_ist_now, ist_to_iso
from app.auth_helpers import require_admin
from typing import List
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{slug}/comments", response_model=List[dict])
async def get_comments(slug: str):
	"""Get all comments for a blog"""
	db = SessionLocal()
	try:
		# Verify blog exists
		blog = db.query(Blog).filter_by(slug=slug).first()
		if not blog:
			raise HTTPException(status_code=404, detail="Blog not found")
		
		comments = db.query(Comment).filter_by(blog_slug=slug).order_by(Comment.created_at.desc()).all()
		result = []
		for comment in comments:
			result.append({
				'id': str(comment.id),
				'blog_slug': comment.blog_slug,
				'author_name': comment.author_name,
				'author_email': comment.author_email,
				'content': comment.content,
				'created_at': comment.created_at.isoformat() if comment.created_at else None,
				'updated_at': comment.updated_at.isoformat() if comment.updated_at else None
			})
		return result
	finally:
		db.close()


@router.post("/{slug}/comments")
async def create_comment(slug: str, comment: CommentCreate, request: Request):
	"""Create a new comment (rate limited: 3/hour per IP)"""
	# Apply rate limiting manually (decorator interferes with FastAPI parameter injection)
	from app.ratelimit import RATE_LIMITS, rate_limits
	import time
	client_id = get_client_id(request)
	max_calls, period = RATE_LIMITS.get('comment', (3, 3600))
	now = time.time()
	calls = rate_limits[(client_id, 'comment')]
	rate_limits[(client_id, 'comment')] = [t for t in calls if now - t < period]
	if len(rate_limits[(client_id, 'comment')]) >= max_calls:
		raise HTTPException(status_code=429, detail='Rate limit exceeded')
	rate_limits[(client_id, 'comment')].append(now)
	
	db = SessionLocal()
	try:
		# Verify blog exists
		blog = db.query(Blog).filter_by(slug=slug).first()
		if not blog:
			raise HTTPException(status_code=404, detail="Blog not found")
		
		# Validate content
		if not comment.content or len(comment.content.strip()) < 3:
			raise HTTPException(status_code=400, detail="Comment must be at least 3 characters")
		if len(comment.content) > 5000:
			raise HTTPException(status_code=400, detail="Comment too long (max 5000 characters)")
		
		# Get user identifier (IP address)
		user_id = get_client_id(request)
		
		# Create comment
		now = get_ist_now()
		new_comment = Comment(
			id=uuid.uuid4(),
			blog_slug=slug,
			author_name=comment.author_name[:100],
			author_email=comment.author_email[:255] if comment.author_email else None,
			content=comment.content.strip(),
			created_at=now,
			updated_at=now
		)
		db.add(new_comment)
		db.commit()
		db.refresh(new_comment)
		
		return {
			'id': str(new_comment.id),
			'blog_slug': new_comment.blog_slug,
			'author_name': new_comment.author_name,
			'author_email': new_comment.author_email,
			'content': new_comment.content,
			'created_at': new_comment.created_at.isoformat() if new_comment.created_at else None,
			'updated_at': new_comment.updated_at.isoformat() if new_comment.updated_at else None
		}
	finally:
		db.close()


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, x_admin_password: str = Header(None), authorization: str = Header(None)):
	"""Delete a comment (admin only)"""
	require_admin(x_admin_password, authorization)
	
	db = SessionLocal()
	try:
		comment = db.query(Comment).filter_by(id=uuid.UUID(comment_id)).first()
		if not comment:
			raise HTTPException(status_code=404, detail="Comment not found")
		
		db.delete(comment)
		db.commit()
		return {'ok': True, 'message': 'Comment deleted'}
	finally:
		db.close()
