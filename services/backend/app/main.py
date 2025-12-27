from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import blogs, comments, reactions, uploads, admin, feeds
from fastapi.staticfiles import StaticFiles
from app.blog_sync import sync_blogs_from_filesystem
from app.database import engine, Base
from app.utils import validate_env_vars
import os
import logging
from fastapi import Request

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
	title="Blog API",
	description="Blog system API",
	version="1.0.0",
	redirect_slashes=True
)

# CORS configuration - restrict in production
allowed_origins = os.getenv('CORS_ORIGINS', '*').split(',')
if allowed_origins == ['*'] and os.getenv('NODE_ENV') == 'production':
	logger.warning("CORS is set to allow all origins in production! This is insecure.")

app.add_middleware(
	CORSMiddleware,
	allow_origins=allowed_origins,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


if os.getenv('NODE_ENV') != 'production':
	@app.middleware("http")
	async def private_network_middleware(request: Request, call_next):
		"""Handle Private Network Access (PNA) preflight header in non-production only.

		See docs: services/backend/README.nginx.md for production guidance.
		"""
		response = await call_next(request)
		if request.headers.get("access-control-request-private-network") == "true":
			response.headers["Access-Control-Allow-Private-Network"] = "true"
		return response

@app.middleware("http")
async def proxy_scheme_middleware(request: Request, call_next):
	"""Fix request URL scheme for proxies that set X-Forwarded-Proto."""
	forwarded_proto = request.headers.get("x-forwarded-proto")
	if forwarded_proto:
		request.scope['scheme'] = forwarded_proto
	return await call_next(request)

# Routers
app.include_router(blogs.router, prefix="/api", tags=["blogs"])
app.include_router(comments.router, prefix="/api", tags=["comments"])
app.include_router(reactions.router, prefix="/api", tags=["reactions"])
app.include_router(uploads.router, prefix="/api", tags=["uploads"])
app.include_router(admin.router, prefix="/api", tags=["admin"])
app.include_router(feeds.router, prefix="/api", tags=["feeds"])

# Serve images directory
app.mount("/images", StaticFiles(directory="./blogs/images"), name="images")


@app.on_event("startup")
async def startup_event():
	"""Initialize database and sync blogs on startup"""
	try:
		# Validate environment variables
		validate_env_vars()
		logger.info("Environment variables validated")
	except ValueError as e:
		logger.error(f"Environment validation failed: {e}")
		# Don't fail startup in dev, but warn
		if os.getenv('NODE_ENV') == 'production':
			raise
	
	# Create tables if they don't exist
	Base.metadata.create_all(bind=engine)
	logger.info("Database tables initialized")
	
	# Sync blogs from filesystem to database
	result = sync_blogs_from_filesystem()
	logger.info(f"Blog sync completed: {result.get('synced', 0)} synced, {result.get('errors', 0)} errors")
