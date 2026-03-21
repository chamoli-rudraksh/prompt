import uuid, json, os
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from database import (
    get_user_by_email, get_user_by_google_id, get_user_by_refresh_token,
    create_user_email, create_user_google, update_user_profile,
    save_refresh_token, get_user_by_id
)
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_google_auth_url, exchange_google_code
)

router = APIRouter()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def user_response(user: dict) -> dict:
    return {
        "id":        user["id"],
        "name":      user["name"],
        "email":     user["email"],
        "persona":   user.get("persona", ""),
        "interests": json.loads(user.get("interests") or "[]"),
        "picture":   user.get("picture", ""),
        "auth_provider": user.get("auth_provider", "email"),
    }


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

class RefreshBody(BaseModel):
    refresh_token: str

class ProfileBody(BaseModel):
    persona:   str
    interests: list[str]


@router.post("/register")
async def register(body: RegisterBody):
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

    user = await get_user_by_id(user_id)
    return {
        "access_token": access, "refresh_token": refresh,
        "token_type": "bearer", "user": user_response(user)
    }


@router.post("/login")
async def login(body: LoginBody):
    user = await get_user_by_email(body.email)
    if not user:
        raise HTTPException(401, "Invalid email or password")
    if user.get("auth_provider") == "google":
        raise HTTPException(401, "This account uses Google sign-in")
    if not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")

    access  = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    await save_refresh_token(user["id"], refresh)

    return {
        "access_token": access, "refresh_token": refresh,
        "token_type": "bearer", "user": user_response(user)
    }


@router.post("/refresh")
async def refresh_token(body: RefreshBody):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
    except Exception:
        raise HTTPException(401, "Invalid or expired refresh token")

    user = await get_user_by_refresh_token(body.refresh_token)
    if not user:
        raise HTTPException(401, "Token not recognised")

    new_access  = create_access_token(user["id"], user["email"])
    new_refresh = create_refresh_token(user["id"])
    await save_refresh_token(user["id"], new_refresh)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(body: RefreshBody):
    user = await get_user_by_refresh_token(body.refresh_token)
    if user:
        await save_refresh_token(user["id"], "")
    return {"message": "Logged out"}


@router.post("/update-profile")
async def update_profile(body: ProfileBody, request: Request):
    from auth import get_current_user
    from fastapi.security import HTTPAuthorizationCredentials
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth_header.split(" ")[1]
    payload = decode_token(token)
    user_id = payload["sub"]
    await update_user_profile(user_id, body.persona, body.interests)
    user = await get_user_by_id(user_id)
    return {"user": user_response(user)}


# ── Google OAuth ──────────────────────────────────────────────

@router.get("/google")
async def google_login():
    """Redirect user to Google's login page."""
    url = get_google_auth_url()
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None):
    """Google redirects here after user approves."""
    if error or not code:
        return RedirectResponse(f"{FRONTEND_URL}/auth?error=google_denied")

    try:
        google_user = await exchange_google_code(code)
    except Exception:
        return RedirectResponse(f"{FRONTEND_URL}/auth?error=google_failed")

    google_id = google_user.get("id")
    email     = google_user.get("email")
    name      = google_user.get("name", "")
    picture   = google_user.get("picture", "")

    # Check if user already exists
    user = await get_user_by_google_id(google_id)

    if not user:
        # Check if email exists with a different provider
        existing = await get_user_by_email(email)
        if existing:
            # Link Google to existing account
            await save_refresh_token(existing["id"], "")
            # Redirect with message to link accounts
            return RedirectResponse(
                f"{FRONTEND_URL}/auth?error=email_exists&email={email}"
            )
        # Create new Google user
        user_id = str(uuid.uuid4())
        await create_user_google(user_id, name, email, google_id, picture)
        user = await get_user_by_id(user_id)
        # New Google user needs to complete profile (persona + interests)
        needs_profile = True
    else:
        needs_profile = not user.get("persona")

    access  = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    await save_refresh_token(user["id"], refresh)

    # Redirect to frontend with tokens in URL (frontend stores them)
    redirect_url = (
        f"{FRONTEND_URL}/auth/callback"
        f"?access_token={access}"
        f"&refresh_token={refresh}"
        f"&needs_profile={'true' if needs_profile else 'false'}"
    )
    return RedirectResponse(redirect_url)