from fastapi import Request, HTTPException
from starlette.status import HTTP_429_TOO_MANY_REQUESTS
import time
from collections import defaultdict

# Simple in-memory rate limiter (for demo/dev only)
rate_limits = defaultdict(list)

RATE_LIMITS = {
    'react': (10, 3600),    # 10 per hour
    'comment': (3, 3600),   # 3 per hour
    'upload': (10, 3600),   # 10 per hour
}

def get_client_id(request: Request):
    return request.client.host

def rate_limiter(action: str):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            request = kwargs.get('request')
            if not request:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            if not request:
                raise HTTPException(400, "Request object not found")
            client_id = get_client_id(request)
            max_calls, period = RATE_LIMITS.get(action, (5, 60))
            now = time.time()
            calls = rate_limits[(client_id, action)]
            # Remove expired
            rate_limits[(client_id, action)] = [t for t in calls if now - t < period]
            if len(rate_limits[(client_id, action)]) >= max_calls:
                raise HTTPException(HTTP_429_TOO_MANY_REQUESTS, "Rate limit exceeded")
            rate_limits[(client_id, action)].append(now)
            return await func(*args, **kwargs)
        return wrapper
    return decorator
