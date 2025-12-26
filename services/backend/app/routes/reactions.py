from fastapi import APIRouter, HTTPException, Request, Query
from app.database import SessionLocal
from app.models import Reaction, Blog, ReactionType
from app.ratelimit import rate_limiter, get_client_id
from app.utils import get_ist_now
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/{slug}/reactions")
async def get_reactions(slug: str):
	"""Get reaction counts for a blog"""
	db = SessionLocal()
	try:
		# Verify blog exists
		blog = db.query(Blog).filter_by(slug=slug).first()
		if not blog:
			raise HTTPException(status_code=404, detail="Blog not found")
		
		likes = db.query(Reaction).filter_by(blog_slug=slug, reaction_type=ReactionType.like).count()
		dislikes = db.query(Reaction).filter_by(blog_slug=slug, reaction_type=ReactionType.dislike).count()
		
		return {
			'blog_slug': slug,
			'likes': likes,
			'dislikes': dislikes,
			'total': likes + dislikes
		}
	finally:
		db.close()


@router.post("/{slug}/react")
@rate_limiter('react')
async def add_reaction(slug: str, reaction_type: str = Query(..., description="Reaction type: 'like' or 'dislike'"), request: Request):
	"""Add or update a reaction (rate limited: 10/hour per IP)"""
	db = SessionLocal()
	try:
		# Verify blog exists
		blog = db.query(Blog).filter_by(slug=slug).first()
		if not blog:
			raise HTTPException(status_code=404, detail="Blog not found")
		
		# Validate reaction type
		if reaction_type not in ['like', 'dislike']:
			raise HTTPException(status_code=400, detail="Invalid reaction type. Must be 'like' or 'dislike'")
		
		reaction_enum = ReactionType.like if reaction_type == 'like' else ReactionType.dislike
		
		# Get user identifier (IP address)
		user_id = get_client_id(request)
		
		# Check if user already reacted
		existing = db.query(Reaction).filter_by(blog_slug=slug, user_identifier=user_id).first()
		
		if existing:
			# Update existing reaction
			if existing.reaction_type == reaction_enum:
				# Same reaction - remove it (toggle off)
				db.delete(existing)
				db.commit()
				return {
					'blog_slug': slug,
					'reaction_type': None,
					'message': 'Reaction removed'
				}
			else:
				# Different reaction - update it
				existing.reaction_type = reaction_enum
				existing.created_at = get_ist_now()
				db.commit()
				return {
					'blog_slug': slug,
					'reaction_type': reaction_type,
					'message': 'Reaction updated'
				}
		else:
			# Create new reaction
			new_reaction = Reaction(
				id=uuid.uuid4(),
				blog_slug=slug,
				user_identifier=user_id,
				reaction_type=reaction_enum,
				created_at=get_ist_now()
			)
			db.add(new_reaction)
			db.commit()
			
			return {
				'blog_slug': slug,
				'reaction_type': reaction_type,
				'message': 'Reaction added'
			}
	finally:
		db.close()


@router.delete("/{slug}/react")
async def remove_reaction(slug: str, request: Request):
	"""Remove user's own reaction"""
	db = SessionLocal()
	try:
		# Verify blog exists
		blog = db.query(Blog).filter_by(slug=slug).first()
		if not blog:
			raise HTTPException(status_code=404, detail="Blog not found")
		
		# Get user identifier
		user_id = get_client_id(request)
		
		# Find and delete reaction
		reaction = db.query(Reaction).filter_by(blog_slug=slug, user_identifier=user_id).first()
		if reaction:
			db.delete(reaction)
			db.commit()
			return {'ok': True, 'message': 'Reaction removed'}
		else:
			raise HTTPException(status_code=404, detail="No reaction found")
	finally:
		db.close()
