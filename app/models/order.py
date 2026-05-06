from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class OrderStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    CANCELLED = "cancelled"


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)

    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    digital_item_id: Mapped[int | None] = mapped_column(
        ForeignKey("digital_items.id"),
        nullable=True,
        unique=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default=OrderStatus.PENDING.value,
        nullable=False,
    )

    total_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    buyer = relationship(
        "User",
        back_populates="orders",
    )

    product = relationship(
        "Product",
        back_populates="orders",
    )

    digital_item = relationship(
        "DigitalItem",
        back_populates="order",
    )