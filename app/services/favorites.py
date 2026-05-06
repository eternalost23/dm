from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Favorite


def list_favorites(
    db: Session,
    *,
    user_id: int | None = None,
    product_id: int | None = None,
) -> list[Favorite]:
    query = db.query(Favorite)

    if user_id is not None:
        query = query.filter(Favorite.user_id == user_id)

    if product_id is not None:
        query = query.filter(Favorite.product_id == product_id)

    return query.order_by(Favorite.created_at.desc()).all()


def get_favorite_or_404(db: Session, favorite_id: int) -> Favorite:
    favorite = db.get(Favorite, favorite_id)

    if favorite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    return favorite


def delete_favorite(db: Session, favorite_id: int) -> None:
    favorite = get_favorite_or_404(db, favorite_id)
    db.delete(favorite)
    db.commit()
