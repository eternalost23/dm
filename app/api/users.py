from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_admin, get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import users

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get("/me", response_model=UserRead)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.patch("/me", response_model=UserRead)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_data.role = None
    user_data.is_active = None
    return users.update_user(db, current_user.id, user_data)


@router.get("", response_model=list[UserRead])
def get_users(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return users.list_users(db)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return users.create_user(db, user_data)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return users.get_user_or_404(db, user_id)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return users.update_user(db, user_id, user_data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    users.delete_user(db, user_id)
    return None
