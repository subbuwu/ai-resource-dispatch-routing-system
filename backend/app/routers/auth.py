"""
Authentication endpoints for user registration and login
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse
from app.services.auth_service import (
    authenticate_user,
    create_user,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.models.user import UserRole, User
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user
    
    Creates a new user account with the provided information.
    Returns the created user information.
    """
    # Only allow volunteer self-registration; admins are created via seed
    if user_data.role != UserRole.VOLUNTEER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only volunteer registration is allowed here.",
        )
    try:
        user = create_user(
            db=db,
            name=user_data.name,
            email=user_data.email,
            password=user_data.password,
            role=UserRole.VOLUNTEER,
            phone=user_data.phone,
        )
        return UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            phone=user.phone,
            created_at=user.created_at.isoformat()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=Token)
def login(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login and get access token
    
    Authenticates the user with email and password.
    Returns a JWT access token for subsequent API requests.
    """
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value
        },
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information
    
    Returns the information of the currently authenticated user.
    This endpoint requires authentication.
    """
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        phone=current_user.phone,
        created_at=current_user.created_at.isoformat()
    )
