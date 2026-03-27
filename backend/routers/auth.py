import uuid, json, os
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from slowapi import Limiter
from slowapi.util import get_remote_address
from database import (
    get_user_by_email, get_user_by_refresh_token,
    create_user_email, update_user_profile,
    save_refresh_token, get_user_by_id
)
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token
)

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

limiter = Limiter(key_func=get_remote_address)


def user_response(user: dict) -> dict:
    return {
        "id":        user["id"],
        "name":      user["name"],
        "email":     user["email"],
        "persona":   user.get("persona", ""),
        "interests": json.loads(user.get("interests") or "[]"),
    }


def _set_refresh_cookie(response: Response, refresh: str):
    """Helper to set the httpOnly refresh-token cookie."""
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=False,        # change to True when deploying to HTTPS
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
        path="/auth/refresh",
    )


# ── Email / Password ──────────────────────────────────────────

class RegisterBody(BaseModel):
    name:      str
    email:     EmailStr
    password:  str
    persona:   str
    interests: list[str]

class LoginBody(BaseModel):
    email:    EmailStr
    password: str

class ProfileBody(BaseModel):
    persona:   str
    interests: list[str]


@router.post("/register")
@limiter.limit("3/minute")
async def register(request: Request, body: RegisterBody, response: Response):
    if await get_user_by_email(body.email):
        raise HTTPException(400, "Email already registered")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    user_id = str(uuid.uuid4())
    await create_user_email(
        user_id, body.name, body.email,
        hash_password(body.password), body.persona, body.interests
    )

    access  = create_access_token(user_id, body.email)
    refresh = create_refresh_token(user_id)
    await save_refresh_token(user_id, refresh)

    _set_refresh_cookie(response, refresh)

    user = await get_user_by_id(user_id)
    return {
        "access_token": access,
        "token_type": "bearer",
        "user": user_response(user)
    }


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginBody, response: Response):
    user = await get_user_by_email(body.email)
    if not user:
        raise HTTPException(401, "Invalid email or password")
    if not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")

    access  = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    await save_refresh_token(user["id"], refresh)

    _set_refresh_cookie(response, refresh)

    return {
        "access_token": access,
        "token_type": "bearer",
        "user": user_response(user)
    }


@router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    refresh = request.cookies.get("refresh_token")
    if not refresh:
        raise HTTPException(401, "No refresh token")

    try:
        payload = decode_token(refresh)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
    except Exception:
        raise HTTPException(401, "Invalid or expired refresh token")

    user = await get_user_by_refresh_token(refresh)
    if not user:
        raise HTTPException(401, "Token not recognised")

    new_access  = create_access_token(user["id"], user["email"])
    new_refresh = create_refresh_token(user["id"])
    await save_refresh_token(user["id"], new_refresh)

    _set_refresh_cookie(response, new_refresh)

    return {
        "access_token": new_access,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    refresh = request.cookies.get("refresh_token")
    if refresh:
        user = await get_user_by_refresh_token(refresh)
        if user:
            await save_refresh_token(user["id"], "")
    response.delete_cookie("refresh_token", path="/auth/refresh")
    return {"message": "Logged out"}


@router.post("/update-profile")
async def update_profile(body: ProfileBody, request: Request):
    from auth import get_current_user
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    user_id = payload["sub"]
    await update_user_profile(user_id, body.persona, body.interests)
    user = await get_user_by_id(user_id)
    return {"user": user_response(user)}