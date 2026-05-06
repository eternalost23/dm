from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_seller
from app.core.database import get_db
from app.models import User
from app.schemas.digital_item import DigitalItemCreate, DigitalItemRead
from app.schemas.order import SellerOrderRead
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services import digital_items, orders, products

router = APIRouter(
    prefix="/seller",
    tags=["Seller"],
)


@router.get("/products", response_model=list[ProductRead])
def get_my_products(
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    return products.list_seller_products(db, current_seller.id)


@router.post(
    "/products",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product_data: ProductCreate,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    return products.create_seller_product(
        db,
        seller_id=current_seller.id,
        product_data=product_data,
    )

@router.patch("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    return products.update_seller_product(
        db,
        product_id=product_id,
        seller_id=current_seller.id,
        product_data=product_data,
    )


@router.delete("/products/{product_id}", response_model=ProductRead)
def delete_product(
    product_id: int,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    product = products.get_seller_product_or_404(
        db,
        product_id=product_id,
        seller_id=current_seller.id,
    )
    return products.soft_delete_product(db, product)

@router.get(
    "/products/{product_id}/items",
    response_model=list[DigitalItemRead],
)
def get_product_items(
    product_id: int,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    return digital_items.list_seller_product_items(
        db,
        product_id=product_id,
        seller_id=current_seller.id,
    )

@router.post(
    "/products/{product_id}/items",
    response_model=DigitalItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_product_item(
    product_id: int,
    item_data: DigitalItemCreate,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    return digital_items.create_seller_product_item(
        db,
        product_id=product_id,
        seller_id=current_seller.id,
        item_data=item_data,
    )

@router.get("/orders", response_model=list[SellerOrderRead])
def get_seller_orders(
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    return orders.list_seller_orders(db, current_seller.id)
