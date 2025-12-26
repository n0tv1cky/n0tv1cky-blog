import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from app.utils import get_ist_now

SECRET_KEY = os.getenv('JWT_SECRET', 'devsecret')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '60'))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_EXPIRE_DAYS', '7'))


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = get_ist_now() + expires_delta
    else:
        expire = get_ist_now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # JWT exp expects UTC timestamp
    to_encode.update({'exp': expire.timestamp()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = get_ist_now() + expires_delta
    else:
        expire = get_ist_now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    # JWT exp expects UTC timestamp
    to_encode.update({'exp': expire.timestamp(), 'typ': 'refresh'})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
