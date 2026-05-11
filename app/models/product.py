from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)

    seller_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    purchases_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    seller = relationship(
        "User",
        back_populates="products",
    )

    category = relationship(
        "Category",
        back_populates="products",
    )

    @property
    def category_path(self) -> list[dict]:
        path = []
        category = self.category

        while category is not None:
            path.append(
                {
                    "id": category.id,
                    "name": category.name,
                    "slug": category.slug,
                }
            )
            category = category.parent

        return list(reversed(path))

    @property
    def seller_username(self) -> str | None:
        return self.seller.username if self.seller is not None else None

    @property
    def seller_rating(self) -> float | None:
        ratings = [
            review.rating
            for product in self.seller.products
            for review in product.reviews
        ] if self.seller is not None else []

        if not ratings:
            return None

        return round(sum(ratings) / len(ratings), 1)

    @property
    def rating(self) -> float | None:
        if not self.reviews:
            return None

        return round(sum(review.rating for review in self.reviews) / len(self.reviews), 1)
    
    digital_items = relationship(
        "DigitalItem",
        back_populates="product",
    )

    orders = relationship(
        "Order",
        back_populates="product",
    )

    reviews = relationship(
        "Review",
        back_populates="product",
    )

    favorites = relationship(
        "Favorite",
        back_populates="product",
    )

    chat_threads = relationship(
        "ChatThread",
        back_populates="product",
    )
