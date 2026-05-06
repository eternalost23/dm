from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Order, Product, User
from app.models.order import OrderStatus
from app.schemas.admin import AdminOrderUpdate
from app.schemas.order import OrderDetailRead, SellerOrderRead


def order_to_detail(order: Order) -> OrderDetailRead:
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
        digital_item_content=digital_item_content,
    )


def list_orders(
    db: Session,
    *,
    buyer_id: int | None = None,
    product_id: int | None = None,
    status_filter: OrderStatus | None = None,
) -> list[Order]:
    query = db.query(Order)

    if buyer_id is not None:
        query = query.filter(Order.buyer_id == buyer_id)

    if product_id is not None:
        query = query.filter(Order.product_id == product_id)

    if status_filter is not None:
        query = query.filter(Order.status == status_filter.value)

    return query.order_by(Order.created_at.desc()).all()


def list_seller_orders(db: Session, seller_id: int) -> list[SellerOrderRead]:
    orders = (
        db.query(Order)
        .join(Product, Order.product_id == Product.id)
        .join(User, Order.buyer_id == User.id)
        .filter(Product.seller_id == seller_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return [
        SellerOrderRead(
            id=order.id,
            buyer_id=order.buyer_id,
            product_id=order.product_id,
            digital_item_id=order.digital_item_id,
            status=order.status,
            total_price=order.total_price,
            created_at=order.created_at,
            buyer_email=order.buyer.email,
            product_title=order.product.title,
        )
        for order in orders
    ]


def get_order_or_404(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order


def update_order(db: Session, order_id: int, order_data: AdminOrderUpdate) -> Order:
    order = get_order_or_404(db, order_id)
    previous_status = order.status
    order.status = order_data.status.value

    if order.digital_item is not None:
        order.digital_item.is_sold = order.status != OrderStatus.CANCELLED.value

    was_paid = previous_status == OrderStatus.PAID.value
    is_paid = order.status == OrderStatus.PAID.value
    if was_paid != is_paid and order.product is not None:
        if is_paid:
            order.product.purchases_count += 1
        else:
            order.product.purchases_count = max(0, order.product.purchases_count - 1)

    db.commit()
    db.refresh(order)

    return order
