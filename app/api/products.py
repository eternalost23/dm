from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.product import ProductDetailRead, ProductRead
from app.services import products

router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.get("", response_model=list[ProductRead])
def get_products(
    category_id: int | None = None,
    search: str | None = None,
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    db: Session = Depends(get_db),
):
    return products.list_public_products(
        db,
        category_id=category_id,
        search=search,
        min_price=min_price,
        max_price=max_price,
    )


@router.get("/{product_id}", response_model=ProductDetailRead)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    return products.get_public_product_or_404(db, product_id)
