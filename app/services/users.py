from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import User
from app.models.user import UserRole
from app.schemas.user import UserCreate, UserUpdate


def list_users(
    db: Session,
    *,
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> list[User]:
    query = db.query(User)

    if role is not None:
        query = query.filter(User.role == role.value)

    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    return query.order_by(User.id).all()


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


def create_user(db: Session, user_data: UserCreate) -> User:
    user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role.value,
        is_active=user_data.is_active,
    )

    db.add(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already exists",
        ) from exc

    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User:
    user = get_user_or_404(db, user_id)
    data = user_data.model_dump(exclude_unset=True)
    password = data.pop("password", None)
    role = data.pop("role", None)

    if password is not None:
        user.hashed_password = get_password_hash(password)

    if role is not None:
        user.role = role.value

    for field, value in data.items():
        if value is None:
            continue

        setattr(user, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User update conflicts with existing data",
        ) from exc

    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> None:
    user = get_user_or_404(db, user_id)
    db.delete(user)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User has related marketplace data",
        ) from exc
