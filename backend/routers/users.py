"""
Users router — POST /users, GET /users/{user_id}
"""

from fastapi import APIRouter, HTTPException

from models.schemas import CreateUserRequest, UserResponse
from database import create_user, get_user

router = APIRouter(tags=["users"])


@router.post("/users", response_model=UserResponse)
async def create_new_user(req: CreateUserRequest):
    """Create a new user with persona and interests."""
    try:
        user = await create_user(
            name=req.name,
            persona=req.persona,
            interests=req.interests,
        )
        return UserResponse(**user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_profile(user_id: str):
    """Get user profile by ID."""
    user = await get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)