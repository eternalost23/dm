from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_buyer
from app.core.database import get_db
from app.models import DigitalItem, Order, Product, User
from app.models.order import OrderStatus
from app.schemas.order import OrderCreate, OrderDetailRead, OrderRead

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


@router.post("", response_model=OrderDetailRead, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == order_data.product_id)
        .filter(Product.is_active == True)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    digital_item = (
        db.query(DigitalItem)
        .filter(DigitalItem.product_id == product.id)
        .filter(DigitalItem.is_sold == False)
        .order_by(DigitalItem.id)
        .first()
    )

    if digital_item is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is out of stock",
        )

    order = Order(
        buyer_id=current_buyer.id,
        product_id=product.id,
        digital_item_id=digital_item.id,
        status=OrderStatus.PAID.value,
        total_price=product.price,
        product_title_snapshot=product.title,
        product_image_url_snapshot=product.image_url,
        seller_username_snapshot=product.seller.username if product.seller else None,
    )

    digital_item.is_sold = True
    product.purchases_count += 1

    db.add(order)
    db.commit()
    db.refresh(order)

    return OrderDetailRead(
        id=order.id,
        buyer_id=order.buyer_id,
        product_id=order.product_id,
        digital_item_id=order.digital_item_id,
        status=order.status,
        total_price=order.total_price,
        created_at=order.created_at,
        product_title_snapshot=order.product_title_snapshot,
        product_image_url_snapshot=order.product_image_url_snapshot,
        seller_username_snapshot=order.seller_username_snapshot,
        digital_item_content=digital_item.content,
    )


@router.get("/my", response_model=list[OrderRead])
def get_my_orders(
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db),
):
    orders = (
        db.query(Order)
        .filter(Order.buyer_id == current_buyer.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return orders


@router.get("/{order_id}", response_model=OrderDetailRead)
def get_order(
    order_id: int,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db),
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .filter(Order.buyer_id == current_buyer.id)
        .first()
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    digital_item_content = None

    if order.digital_item is not None:
        digital_item_content = order.digital_item.content

    return OrderDetailRead(
        id=order.id,
        buyer_id=order.buyer_id,
        product_id=order.product_id,
        digital_item_id=order.digital_item_id,
        status=order.status,
        total_price=order.total_price,
        created_at=order.created_at,
        product_title_snapshot=order.product_title_snapshot,
        product_image_url_snapshot=order.product_image_url_snapshot,
        seller_username_snapshot=order.seller_username_snapshot,
        digital_item_content=digital_item_content,
    )
