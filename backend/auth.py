import os
import jwt
import sys
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("JWT_SECRET", "")

if len(SECRET_KEY) < 32:
    print(
        "FATAL: JWT_SECRET is too short or missing. "
        'Run: python3 -c "import secrets; print(secrets.token_hex(32))"'
    )
    sys.exit(1)

ALGORITHM    = "HS256"
ACCESS_EXPIRE_MINUTES = 60 * 24      # 1 day
REFRESH_EXPIRE_DAYS   = 30

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer      = HTTPBearer(auto_error=False)


# ── Password helpers ──────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Token helpers ─────────────────────────────────────────────
def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode({
        "sub":   user_id,
        "email": email,
        "exp":   datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MINUTES),
        "type":  "access",
    }, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    return jwt.encode({
        "sub":  user_id,
        "exp":  datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE_DAYS),
        "type": "refresh",
    }, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ── Auth dependency — use on every protected route ────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer)
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    return {"user_id": payload["sub"], "email": payload["email"]}