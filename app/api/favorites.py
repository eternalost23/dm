from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models import Favorite, Product, User
from app.schemas.favorite import FavoriteDetailRead, FavoriteRead

router = APIRouter(
    prefix="/favorites",
    tags=["Favorites"],
)


@router.post(
    "/{product_id}",
    response_model=FavoriteRead,
    status_code=status.HTTP_201_CREATED,
)
def add_to_favorites(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .filter(Product.is_active == True)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    existing_favorite = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id)
        .filter(Favorite.product_id == product_id)
        .first()
    )

    if existing_favorite is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product already in favorites",
        )

    favorite = Favorite(
        user_id=current_user.id,
        product_id=product_id,
    )

    db.add(favorite)
    db.commit()
    db.refresh(favorite)

    return favorite


@router.get("", response_model=list[FavoriteDetailRead])
def get_my_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorites = (
        db.query(Favorite)
        .options(joinedload(Favorite.product))
        .filter(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )

    return favorites


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_favorites(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorite = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id)
        .filter(Favorite.product_id == product_id)
        .first()
    )

    if favorite is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found",
        )

    db.delete(favorite)
    db.commit()

    return None