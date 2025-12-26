"""
Utility functions for the blog application
"""
import os
from datetime import datetime
import pytz
from typing import Optional

# India timezone
IST = pytz.timezone('Asia/Kolkata')

# Constants
DEFAULT_ADMIN_PASSWORD = 'admin123'
DEFAULT_JWT_SECRET = 'devsecret'
DEFAULT_MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB
READING_WORDS_PER_MINUTE = 200
DRAFT_AUTOSAVE_INTERVAL = 30  # seconds

def get_ist_now() -> datetime:
    """Get current datetime in India timezone (IST)"""
    return datetime.now(IST)

def to_ist(dt: Optional[datetime]) -> Optional[datetime]:
    """Convert datetime to IST timezone"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Assume UTC if no timezone info
        dt = pytz.utc.localize(dt)
    return dt.astimezone(IST)

def ist_to_iso(dt: Optional[datetime]) -> Optional[str]:
    """Convert IST datetime to ISO format string"""
    if dt is None:
        return None
    ist_dt = to_ist(dt) if dt.tzinfo is None else dt
    return ist_dt.isoformat()

def validate_env_vars():
    """Validate required environment variables"""
    # Only require DATABASE_URL, ADMIN_PASSWORD has a default
    required_vars = ['DATABASE_URL']
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
    
    # Warn about insecure defaults
    admin_pass = os.getenv('ADMIN_PASSWORD', DEFAULT_ADMIN_PASSWORD)
    if admin_pass == DEFAULT_ADMIN_PASSWORD:
        import warnings
        warnings.warn("Using default admin password. Change ADMIN_PASSWORD in production!", UserWarning)
    
    jwt_secret = os.getenv('JWT_SECRET', DEFAULT_JWT_SECRET)
    if jwt_secret == DEFAULT_JWT_SECRET:
        import warnings
        warnings.warn("Using default JWT secret. Change JWT_SECRET in production!", UserWarning)

