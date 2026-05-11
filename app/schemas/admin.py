from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class AdminProductCreate(BaseModel):
    seller_id: int
    category_id: int
    title: str = Field(min_length=3, max_length=255)
    description: str | None = None
    price: Decimal = Field(gt=0)
    image_url: str | None = None
    purchases_count: int = Field(default=0, ge=0)
    is_active: bool = True


class AdminProductUpdate(BaseModel):
    seller_id: int | None = None
    category_id: int | None = None
    title: str | None = Field(default=None, min_length=3, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    image_url: str | None = None
    purchases_count: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class AdminDigitalItemUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1)
    is_sold: bool | None = None


class AdminOrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    CANCELLED = "cancelled"


class AdminOrderUpdate(BaseModel):
    status: AdminOrderStatus


class AdminReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = None


class AdminTimeSeriesPoint(BaseModel):
    period: str
    value: int


class AdminStatsRead(BaseModel):
    users_count: int
    sellers_count: int
    buyers_count: int
    categories_count: int
    products_count: int
    active_products_count: int
    digital_items_count: int
    available_digital_items_count: int
    orders_count: int
    paid_orders_count: int
    reviews_count: int
    favorites_count: int
    daily_sales: list[AdminTimeSeriesPoint] = Field(default_factory=list)
    daily_new_users: list[AdminTimeSeriesPoint] = Field(default_factory=list)
    daily_orders: list[AdminTimeSeriesPoint] = Field(default_factory=list)
    weekly_sales: list[AdminTimeSeriesPoint] = Field(default_factory=list)
    weekly_new_users: list[AdminTimeSeriesPoint] = Field(default_factory=list)
    weekly_orders: list[AdminTimeSeriesPoint] = Field(default_factory=list)
