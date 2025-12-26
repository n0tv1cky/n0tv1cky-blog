from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import blogs, comments, reactions, uploads, admin
from fastapi.staticfiles import StaticFiles

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

# Serve images directory
app.mount("/images", StaticFiles(directory="./blogs/images"), name="images")
