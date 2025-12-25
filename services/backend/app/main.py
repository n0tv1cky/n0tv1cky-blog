from fastapi import FastAPI
from app.routes import blogs, comments, reactions, uploads, admin

app = FastAPI()

# Routers
app.include_router(blogs.router, prefix="/api/blogs", tags=["blogs"])
app.include_router(comments.router, prefix="/api/blogs", tags=["comments"])
app.include_router(reactions.router, prefix="/api/blogs", tags=["reactions"])
app.include_router(uploads.router, prefix="/api/uploads", tags=["uploads"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
