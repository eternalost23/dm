from datetime import date, datetime, time

from fastapi import APIRouter, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_seller
from app.core.database import get_db
from app.models import DigitalItem, Order, Product, Review, User
from app.models.order import OrderStatus
from app.schemas.category import CategoryCreate, CategoryRead
from app.schemas.digital_item import DigitalItemCreate, DigitalItemRead
from app.schemas.order import SellerOrderRead
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services import categories, digital_items, orders, products

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


@router.post(
    "/categories",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category_data: CategoryCreate,
    _: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    return categories.create_category(db, category_data)


@router.get("/stats")
def get_seller_stats(
    date_from: date | None = None,
    date_to: date | None = None,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db),
):
    orders_query = (
        db.query(Order)
        .join(Product, Order.product_id == Product.id)
        .filter(Product.seller_id == current_seller.id)
    )

    if date_from is not None:
        orders_query = orders_query.filter(Order.created_at >= datetime.combine(date_from, time.min))

    if date_to is not None:
        orders_query = orders_query.filter(Order.created_at <= datetime.combine(date_to, time.max))

    paid_orders_query = orders_query.filter(Order.status == OrderStatus.PAID.value)
    paid_orders = paid_orders_query.all()
    product_ids = [
        product_id
        for (product_id,) in db.query(Product.id)
        .filter(Product.seller_id == current_seller.id)
        .filter(Product.is_deleted == False)
        .all()
    ]

    ratings = [
        rating
        for (rating,) in db.query(Review.rating)
        .filter(Review.product_id.in_(product_ids) if product_ids else False)
        .all()
    ]

    return {
        "revenue": float(sum(order.total_price for order in paid_orders)),
        "sales_count": len(paid_orders),
        "active_products_count": (
            db.query(Product)
            .filter(Product.seller_id == current_seller.id)
            .filter(Product.is_deleted == False)
            .filter(Product.is_active == True)
            .count()
        ),
        "available_keys_count": (
            db.query(DigitalItem)
            .join(Product, DigitalItem.product_id == Product.id)
            .filter(Product.seller_id == current_seller.id)
            .filter(Product.is_deleted == False)
            .filter(DigitalItem.is_sold == False)
            .count()
        ),
        "average_rating": round(sum(ratings) / len(ratings), 1) if ratings else None,
        "reviews_count": len(ratings),
        "orders_count": orders_query.count(),
        "products_count": len(product_ids),
        "daily_sales": [
            {"period": str(period), "value": float(value or 0)}
            for period, value in (
                paid_orders_query
                .with_entities(func.date(Order.created_at), func.coalesce(func.sum(Order.total_price), 0))
                .group_by(func.date(Order.created_at))
                .order_by(func.date(Order.created_at))
                .all()
            )
        ],
    }


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


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
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
    products.delete_product(db, product)
    return None


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
