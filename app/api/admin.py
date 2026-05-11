from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_admin
from app.core.database import get_db
from app.models import User
from app.models.order import OrderStatus
from app.models.user import UserRole
from app.schemas.admin import (
    AdminDigitalItemUpdate,
    AdminOrderUpdate,
    AdminProductCreate,
    AdminProductUpdate,
    AdminReviewUpdate,
    AdminStatsRead,
)
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.schemas.digital_item import DigitalItemCreate, DigitalItemRead
from app.schemas.favorite import FavoriteRead
from app.schemas.order import OrderDetailRead, OrderRead
from app.schemas.product import ProductRead
from app.schemas.review import ReviewRead
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services import admin_stats, categories, digital_items, favorites, orders, products, reviews, users

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.get("/stats", response_model=AdminStatsRead)
def get_admin_stats(
    date_from: date | None = None,
    date_to: date | None = None,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return admin_stats.get_admin_stats(db, date_from=date_from, date_to=date_to)


@router.get("/users", response_model=list[UserRead])
def list_users(
    role: UserRole | None = None,
    is_active: bool | None = None,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return users.list_users(db, role=role, is_active=is_active)


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return users.create_user(db, user_data)


@router.get("/users/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return users.get_user_or_404(db, user_id)


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return users.update_user(db, user_id, user_data)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )

    users.delete_user(db, user_id)
    return None


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return categories.list_categories(db)


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return categories.create_category(db, category_data)


@router.patch("/categories/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return categories.update_category(db, category_id, category_data)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    categories.delete_category(db, category_id)
    return None


@router.get("/products", response_model=list[ProductRead])
def list_products(
    seller_id: int | None = None,
    category_id: int | None = None,
    is_active: bool | None = None,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return products.list_products(
        db,
        seller_id=seller_id,
        category_id=category_id,
        is_active=is_active,
    )


@router.post("/products", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: AdminProductCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return products.create_admin_product(db, product_data)


@router.get("/products/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return products.get_product_or_404(db, product_id)


@router.patch("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    product_data: AdminProductUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return products.update_admin_product(
        db,
        product_id=product_id,
        product_data=product_data,
    )


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    hard: bool = Query(default=False),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = products.get_product_or_404(db, product_id)

    if hard:
        products.hard_delete_product(db, product)
    else:
        products.delete_product(db, product)

    return None


@router.get("/products/{product_id}/items", response_model=list[DigitalItemRead])
def list_product_items(
    product_id: int,
    is_sold: bool | None = None,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return digital_items.list_product_items(
        db,
        product_id=product_id,
        is_sold=is_sold,
    )


@router.post(
    "/products/{product_id}/items",
    response_model=DigitalItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_product_item(
    product_id: int,
    item_data: DigitalItemCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return digital_items.create_product_item(
        db,
        product_id=product_id,
        item_data=item_data,
    )


@router.patch("/digital-items/{item_id}", response_model=DigitalItemRead)
def update_digital_item(
    item_id: int,
    item_data: AdminDigitalItemUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return digital_items.update_digital_item(
        db,
        item_id=item_id,
        item_data=item_data,
    )


@router.delete("/digital-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_digital_item(
    item_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    digital_items.delete_unsold_digital_item(db, item_id)
    return None


@router.get("/orders", response_model=list[OrderRead])
def list_orders(
    buyer_id: int | None = None,
    product_id: int | None = None,
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return orders.list_orders(
        db,
        buyer_id=buyer_id,
        product_id=product_id,
        status_filter=status_filter,
    )


@router.get("/orders/{order_id}", response_model=OrderDetailRead)
def get_order(
    order_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = orders.get_order_or_404(db, order_id)
    return orders.order_to_detail(order)


@router.patch("/orders/{order_id}", response_model=OrderDetailRead)
def update_order(
    order_id: int,
    order_data: AdminOrderUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = orders.update_order(db, order_id, order_data)
    return orders.order_to_detail(order)


@router.get("/reviews", response_model=list[ReviewRead])
def list_reviews(
    product_id: int | None = None,
    buyer_id: int | None = None,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return reviews.list_reviews(
        db,
        product_id=product_id,
        buyer_id=buyer_id,
    )


@router.patch("/reviews/{review_id}", response_model=ReviewRead)
def update_review(
    review_id: int,
    review_data: AdminReviewUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return reviews.update_review(
        db,
        review_id=review_id,
        review_data=review_data,
    )


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    reviews.delete_review(db, review_id)
    return None


@router.get("/favorites", response_model=list[FavoriteRead])
def list_favorites(
    user_id: int | None = None,
    product_id: int | None = None,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return favorites.list_favorites(
        db,
        user_id=user_id,
        product_id=product_id,
    )


@router.delete("/favorites/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite(
    favorite_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    favorites.delete_favorite(db, favorite_id)
    return None
