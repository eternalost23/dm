from sqlalchemy.orm import Session

from app.models import Category, DigitalItem, Favorite, Order, Product, Review, User
from app.models.order import OrderStatus
from app.models.user import UserRole
from app.schemas.admin import AdminStatsRead


def get_admin_stats(db: Session) -> AdminStatsRead:
    return AdminStatsRead(
        users_count=db.query(User).count(),
        sellers_count=db.query(User).filter(User.role == UserRole.SELLER.value).count(),
        buyers_count=db.query(User).filter(User.role == UserRole.BUYER.value).count(),
        categories_count=db.query(Category).count(),
        products_count=db.query(Product).count(),
        active_products_count=db.query(Product).filter(Product.is_active == True).count(),
        digital_items_count=db.query(DigitalItem).count(),
        available_digital_items_count=(
            db.query(DigitalItem)
            .filter(DigitalItem.is_sold == False)
            .count()
        ),
        orders_count=db.query(Order).count(),
        paid_orders_count=db.query(Order).filter(Order.status == OrderStatus.PAID.value).count(),
        reviews_count=db.query(Review).count(),
        favorites_count=db.query(Favorite).count(),
    )
