from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Category, DigitalItem, Favorite, Order, Product, Review, User
from app.models.order import OrderStatus
from app.models.user import UserRole
from app.schemas.admin import AdminStatsRead


def as_date(value: date | datetime) -> date:
    return value.date() if isinstance(value, datetime) else value


def build_daily_series(
    rows: list[tuple[date | datetime, int]],
    *,
    date_from: date,
    date_to: date,
) -> list[dict]:
    values = {as_date(period): value for period, value in rows}
    days = (date_to - date_from).days + 1

    return [
        {
            "period": (date_from + timedelta(days=offset)).isoformat(),
            "value": int(values.get(date_from + timedelta(days=offset), 0)),
        }
        for offset in range(days)
    ]


def build_weekly_series(rows: list[tuple[date | datetime, int]], *, weeks: int = 8) -> list[dict]:
    today = date.today()
    this_week = today - timedelta(days=today.weekday())
    values = {as_date(period): value for period, value in rows}

    return [
        {
            "period": (this_week - timedelta(weeks=offset)).isoformat(),
            "value": int(values.get(this_week - timedelta(weeks=offset), 0)),
        }
        for offset in reversed(range(weeks))
    ]


def get_admin_stats(
    db: Session,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> AdminStatsRead:
    date_to = date_to or date.today()
    date_from = date_from or date_to - timedelta(days=6)

    daily_sales_rows = (
        db.query(func.date(Order.created_at), func.coalesce(func.sum(Order.total_price), 0))
        .filter(Order.status == OrderStatus.PAID.value)
        .filter(Order.created_at >= date_from)
        .filter(Order.created_at <= date_to + timedelta(days=1))
        .group_by(func.date(Order.created_at))
        .all()
    )
    daily_orders_rows = (
        db.query(func.date(Order.created_at), func.count(Order.id))
        .filter(Order.created_at >= date_from)
        .filter(Order.created_at <= date_to + timedelta(days=1))
        .group_by(func.date(Order.created_at))
        .all()
    )
    daily_users_rows = (
        db.query(func.date(User.created_at), func.count(User.id))
        .filter(User.created_at >= date_from)
        .filter(User.created_at <= date_to + timedelta(days=1))
        .group_by(func.date(User.created_at))
        .all()
    )
    weekly_start = date.today() - timedelta(weeks=7)
    order_week = func.date_trunc("week", Order.created_at)
    user_week = func.date_trunc("week", User.created_at)
    weekly_sales_rows = (
        db.query(order_week, func.coalesce(func.sum(Order.total_price), 0))
        .filter(Order.status == OrderStatus.PAID.value)
        .filter(Order.created_at >= weekly_start)
        .group_by(order_week)
        .all()
    )
    weekly_orders_rows = (
        db.query(order_week, func.count(Order.id))
        .filter(Order.created_at >= weekly_start)
        .group_by(order_week)
        .all()
    )
    weekly_users_rows = (
        db.query(user_week, func.count(User.id))
        .filter(User.created_at >= weekly_start)
        .group_by(user_week)
        .all()
    )

    return AdminStatsRead(
        users_count=db.query(User).count(),
        sellers_count=db.query(User).filter(User.role == UserRole.SELLER.value).count(),
        buyers_count=db.query(User).filter(User.role == UserRole.BUYER.value).count(),
        categories_count=db.query(Category).count(),
        products_count=db.query(Product).filter(Product.is_deleted == False).count(),
        active_products_count=(
            db.query(Product)
            .filter(Product.is_active == True)
            .filter(Product.is_deleted == False)
            .count()
        ),
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
        daily_sales=build_daily_series(daily_sales_rows, date_from=date_from, date_to=date_to),
        daily_orders=build_daily_series(daily_orders_rows, date_from=date_from, date_to=date_to),
        daily_new_users=build_daily_series(daily_users_rows, date_from=date_from, date_to=date_to),
        weekly_sales=build_weekly_series(weekly_sales_rows),
        weekly_orders=build_weekly_series(weekly_orders_rows),
        weekly_new_users=build_weekly_series(weekly_users_rows),
    )
