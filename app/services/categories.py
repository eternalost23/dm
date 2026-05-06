from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.id).all()


def get_category_or_404(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)

    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    return category


def create_category(db: Session, category_data: CategoryCreate) -> Category:
    category = Category(**category_data.model_dump())
    db.add(category)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category already exists or parent is invalid",
        ) from exc

    db.refresh(category)
    return category


def update_category(
    db: Session,
    category_id: int,
    category_data: CategoryUpdate,
) -> Category:
    category = get_category_or_404(db, category_id)
    data = category_data.model_dump(exclude_unset=True)

    if data.get("parent_id") == category_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category cannot be its own parent",
        )

    for field, value in data.items():
        setattr(category, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category update conflicts with existing data",
        ) from exc

    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> None:
    category = get_category_or_404(db, category_id)
    db.delete(category)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category has children or products",
        ) from exc
