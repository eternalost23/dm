from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import DigitalItem
from app.schemas.admin import AdminDigitalItemUpdate
from app.schemas.digital_item import DigitalItemCreate
from app.services.products import get_product_or_404, get_seller_product_or_404


def list_product_items(
    db: Session,
    *,
    product_id: int,
    is_sold: bool | None = None,
) -> list[DigitalItem]:
    get_product_or_404(db, product_id)
    query = db.query(DigitalItem).filter(DigitalItem.product_id == product_id)

    if is_sold is not None:
        query = query.filter(DigitalItem.is_sold == is_sold)

    return query.order_by(DigitalItem.id).all()


def list_seller_product_items(
    db: Session,
    *,
    product_id: int,
    seller_id: int,
) -> list[DigitalItem]:
    product = get_seller_product_or_404(
        db,
        product_id=product_id,
        seller_id=seller_id,
    )

    return (
        db.query(DigitalItem)
        .filter(DigitalItem.product_id == product.id)
        .order_by(DigitalItem.id)
        .all()
    )


def create_product_item(
    db: Session,
    *,
    product_id: int,
    item_data: DigitalItemCreate,
) -> DigitalItem:
    get_product_or_404(db, product_id)
    item = DigitalItem(
        product_id=product_id,
        content=item_data.content,
        is_sold=False,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


def create_seller_product_item(
    db: Session,
    *,
    product_id: int,
    seller_id: int,
    item_data: DigitalItemCreate,
) -> DigitalItem:
    product = get_seller_product_or_404(
        db,
        product_id=product_id,
        seller_id=seller_id,
    )

    return create_product_item(
        db,
        product_id=product.id,
        item_data=item_data,
    )


def get_digital_item_or_404(db: Session, item_id: int) -> DigitalItem:
    item = db.get(DigitalItem, item_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Digital item not found",
        )

    return item


def update_digital_item(
    db: Session,
    *,
    item_id: int,
    item_data: AdminDigitalItemUpdate,
) -> DigitalItem:
    item = get_digital_item_or_404(db, item_id)

    for field, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


def delete_unsold_digital_item(db: Session, item_id: int) -> None:
    item = get_digital_item_or_404(db, item_id)

    if item.is_sold:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sold digital item cannot be deleted",
        )

    db.delete(item)
    db.commit()
