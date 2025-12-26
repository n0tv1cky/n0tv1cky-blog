from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import blogs, comments, reactions, uploads, admin, feeds
from fastapi.staticfiles import StaticFiles
from app.blog_sync import sync_blogs_from_filesystem
from app.database import engine, Base

app = FastAPI()

# Allow CORS for development
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Routers
app.include_router(blogs.router, prefix="/api/blogs", tags=["blogs"])
app.include_router(comments.router, prefix="/api/blogs", tags=["comments"])
app.include_router(reactions.router, prefix="/api/blogs", tags=["reactions"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(feeds.router, tags=["feeds"])

# Serve images directory
app.mount("/images", StaticFiles(directory="./blogs/images"), name="images")


@app.on_event("startup")
async def startup_event():
	"""Initialize database and sync blogs on startup"""
	# Create tables if they don't exist
	Base.metadata.create_all(bind=engine)
	# Sync blogs from filesystem to database
	sync_blogs_from_filesystem()
