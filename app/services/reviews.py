from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Review
from app.schemas.admin import AdminReviewUpdate


def list_reviews(
    db: Session,
    *,
    product_id: int | None = None,
    buyer_id: int | None = None,
) -> list[Review]:
    query = db.query(Review)

    if product_id is not None:
        query = query.filter(Review.product_id == product_id)

    if buyer_id is not None:
        query = query.filter(Review.buyer_id == buyer_id)

    return query.order_by(Review.created_at.desc()).all()


def get_review_or_404(db: Session, review_id: int) -> Review:
    review = db.get(Review, review_id)

    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    return review


def update_review(
    db: Session,
    *,
    review_id: int,
    review_data: AdminReviewUpdate,
) -> Review:
    review = get_review_or_404(db, review_id)

    for field, value in review_data.model_dump(exclude_unset=True).items():
        setattr(review, field, value)

    db.commit()
    db.refresh(review)

    return review


def delete_review(db: Session, review_id: int) -> None:
    review = get_review_or_404(db, review_id)
    db.delete(review)
    db.commit()
