from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_buyer
from app.core.database import get_db
from app.models import Order, Product, Review, User
from app.models.order import OrderStatus
from app.schemas.review import ReviewCreate, ReviewRead

router = APIRouter(
    prefix="/products",
    tags=["Reviews"],
)


@router.get("/{product_id}/reviews", response_model=list[ReviewRead])
def get_product_reviews(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    reviews = (
        db.query(Review)
        .filter(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    return reviews


@router.post(
    "/{product_id}/reviews",
    response_model=ReviewRead,
    status_code=status.HTTP_201_CREATED,
)
def create_product_review(
    product_id: int,
    review_data: ReviewCreate,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    paid_order = (
        db.query(Order)
        .filter(Order.product_id == product_id)
        .filter(Order.buyer_id == current_buyer.id)
        .filter(Order.status == OrderStatus.PAID.value)
        .first()
    )

    if paid_order is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can review only purchased products",
        )

    existing_review = (
        db.query(Review)
        .filter(Review.product_id == product_id)
        .filter(Review.buyer_id == current_buyer.id)
        .first()
    )

    if existing_review is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already exists",
        )

    review = Review(
        product_id=product_id,
        buyer_id=current_buyer.id,
        rating=review_data.rating,
        comment=review_data.comment,
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return review


@router.patch("/{product_id}/reviews/{review_id}", response_model=ReviewRead)
def update_product_review(
    product_id: int,
    review_id: int,
    review_data: ReviewCreate,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db),
):
    review = (
        db.query(Review)
        .filter(Review.id == review_id)
        .filter(Review.product_id == product_id)
        .filter(Review.buyer_id == current_buyer.id)
        .first()
    )

    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    review.rating = review_data.rating
    review.comment = review_data.comment
    db.commit()
    db.refresh(review)

    return review


@router.delete("/{product_id}/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_review(
    product_id: int,
    review_id: int,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db),
):
    review = (
        db.query(Review)
        .filter(Review.id == review_id)
        .filter(Review.product_id == product_id)
        .filter(Review.buyer_id == current_buyer.id)
        .first()
    )

    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    db.delete(review)
    db.commit()

    return None
